"""
RF-DETR Large — Label Studio ML Backend deployed on Modal.

Deploy:
    modal deploy modal_inference_large.py [--env <workspace>]

Label Studio setup:
    URL: https://<org>--rfdetr-large-labelstudio-backend.modal.run

RFDetrLarge
https://dermatoai--rfdetr-large-labelstudio-backend.modal.run
"""

import asyncio
import base64
import os
import time
from typing import Any

import modal

# ===== CONFIGURATION =====
APP_NAME = "rfdetr-large"
CLASS_NAME = "Yellow globlues (ulcer)"
THRESHOLD = 0.3
HTTP_TIMEOUT_SECONDS = 30.0
CHECKPOINT = "/rfdetr_large_2462103/checkpoint_best_total.pth"
MODEL_SIZE = "large"
MODEL_VERSION = "rfdetr-large-2462103"

# Timeouts (longer for large model)
INFERENCE_TIMEOUT = int(os.environ.get("RFDETR_LARGE_INFERENCE_TIMEOUT_SECONDS", "900"))
API_TIMEOUT = int(os.environ.get("RFDETR_LARGE_API_TIMEOUT_SECONDS", "240"))
GPU_TYPE = os.environ.get("RFDETR_LARGE_GPU", "A100").strip() or "A100"

# Modal resources
vol = modal.Volume.from_name("rfdetr-models")
ls_secret = modal.Secret.from_name("labelstudio-secrets")

# Single image with all dependencies (simpler, known to work)
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("libgl1", "libglib2.0-0", "libsm6", "libxext6", "libxrender-dev")
    .pip_install(
        "rfdetr",
        "torch",
        "torchvision",
        "pillow",
        "fastapi",
        "httpx",
        "uvicorn",
    )
)

print(
    f"[CONFIG] app={APP_NAME} model={MODEL_SIZE} gpu={GPU_TYPE} "
    f"inference_timeout={INFERENCE_TIMEOUT}s api_timeout={API_TIMEOUT}s",
    flush=True,
)

app = modal.App(APP_NAME)


@app.cls(
    gpu=GPU_TYPE,
    image=image,
    volumes={"/models": vol},
    secrets=[ls_secret],
    timeout=INFERENCE_TIMEOUT,
    min_containers=0,
)
class RFDETRBackend:
    @modal.enter()
    def load_model(self):
        import os
        import time
        full_path = f"/models{CHECKPOINT}"
        print(f"[MODEL] ===== CONTAINER START =====", flush=True)
        print(f"[MODEL] app={APP_NAME} model_size={MODEL_SIZE} checkpoint={full_path}", flush=True)
        print(
            f"[MODEL] checkpoint exists={os.path.exists(full_path)} size={os.path.getsize(full_path) if os.path.exists(full_path) else 'N/A'}",
            flush=True,
        )
        t0 = time.time()
        try:
            if MODEL_SIZE == "large":
                from rfdetr import RFDETRLarge
                print(f"[MODEL] Instantiating RFDETRLarge ...", flush=True)
                self.model = RFDETRLarge(pretrain_weights=full_path)
            else:
                from rfdetr import RFDETRNano
                print(f"[MODEL] Instantiating RFDETRNano ...", flush=True)
                self.model = RFDETRNano(pretrain_weights=full_path)
            print(f"[MODEL] Ready — loaded in {time.time() - t0:.1f}s", flush=True)
        except Exception as exc:
            print(f"[MODEL] FATAL ERROR during load: {exc}", flush=True)
            raise

    @modal.method()
    def predict(self, image_bytes: bytes) -> list[dict[str, float]]:
        import io
        import time
        from PIL import Image

        print(f"[INFER] >>> predict() called, image_bytes={len(image_bytes)} B", flush=True)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        w, h = img.size
        print(f"[INFER] Image decoded: {w}x{h}, threshold={THRESHOLD}", flush=True)
        t0 = time.time()
        try:
            detections = self.model.predict(img, threshold=THRESHOLD)
            print(f"[INFER] model.predict() returned in {time.time()-t0:.2f}s", flush=True)
        except Exception as exc:
            print(f"[INFER] ERROR in model.predict(): {exc}", flush=True)
            raise

        n_raw = len(detections.xyxy)
        print(f"[INFER] Raw detections (before threshold filter): {n_raw}", flush=True)
        results = []
        for i in range(n_raw):
            x1, y1, x2, y2 = detections.xyxy[i].tolist()
            conf = float(detections.confidence[i])
            results.append({
                "x": x1 / w * 100,
                "y": y1 / h * 100,
                "width": (x2 - x1) / w * 100,
                "height": (y2 - y1) / h * 100,
                "confidence": conf,
            })
            print(f"[INFER] det {i}: conf={conf:.3f} xyxy=[{x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f}]", flush=True)

        print(f"[INFER] <<< predict() done: {len(results)} result(s), total={time.time()-t0:.2f}s", flush=True)
        return results


# Global backend singleton — reuse across requests
_backend_instance = None


def get_backend():
    global _backend_instance
    if _backend_instance is None:
        print(f"[SINGLETON] Creating RFDETRBackend() instance...", flush=True)
        _backend_instance = RFDETRBackend()
        print(f"[SINGLETON] Backend instance created: {_backend_instance}", flush=True)
    return _backend_instance


def build_fastapi_app():
    import httpx
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse

    print(f"[FASTAPI] Building FastAPI app", flush=True)
    web_app = FastAPI()

    @web_app.get("/health")
    def health():
        print(f"[HEALTH] GET /health called", flush=True)
        return {"status": "UP"}

    @web_app.post("/setup")
    async def setup(request: Request):
        body = await request.json()
        print(f"[SETUP] POST /setup body={body}", flush=True)
        resp = {"model_version": MODEL_VERSION, "status": "ok"}
        print(f"[SETUP] Responding with {resp}", flush=True)
        return JSONResponse(resp)

    @web_app.post("/predict")
    async def predict(request: Request):
        import traceback

        body = await request.json()
        tasks = body.get("tasks", [])

        ls_url = os.environ.get("LABEL_STUDIO_URL", "").rstrip("/")
        ls_token = os.environ.get("LABEL_STUDIO_API_KEY", "")

        print(f"[REQUEST] POST /predict: {len(tasks)} task(s)", flush=True)
        print(f"[REQUEST] LABEL_STUDIO_URL={'set: '+ls_url if ls_url else 'NOT SET'}", flush=True)
        print(f"[REQUEST] LABEL_STUDIO_API_KEY={'set (len={})'.format(len(ls_token)) if ls_token else 'NOT SET'}", flush=True)

        backend = get_backend()
        print(f"[REQUEST] Backend acquired: {backend}", flush=True)

        async def process_task(task: dict[str, Any], client: httpx.AsyncClient) -> dict[str, Any]:
            task_id = task.get("id", "?")
            image_url = task.get("data", {}).get("image", "")
            print(f"[TASK {task_id}] image_url={image_url!r}", flush=True)

            try:
                t0 = time.time()
                if image_url.startswith("http"):
                    print(f"[TASK {task_id}] Fetching via HTTP: {image_url[:80]}", flush=True)
                    resp = await client.get(image_url)
                    print(f"[TASK {task_id}] HTTP status: {resp.status_code}", flush=True)
                    resp.raise_for_status()
                    image_bytes = resp.content
                elif image_url.startswith("data:"):
                    print(f"[TASK {task_id}] Decoding base64 data URI", flush=True)
                    image_bytes = base64.b64decode(image_url.split(",", 1)[1])
                elif image_url.startswith("/data/"):
                    if not ls_url:
                        print(f"[TASK {task_id}] ERROR: /data/ path but LABEL_STUDIO_URL not set", flush=True)
                        return {"result": [], "score": 0.0}
                    full_url = f"{ls_url}{image_url}"
                    print(f"[TASK {task_id}] Fetching from LS: {full_url[:80]}, token={'yes' if ls_token else 'no'}", flush=True)
                    headers = {"Authorization": f"Token {ls_token}"} if ls_token else {}
                    resp = await client.get(full_url, headers=headers)
                    print(f"[TASK {task_id}] LS response: HTTP {resp.status_code}", flush=True)
                    resp.raise_for_status()
                    image_bytes = resp.content
                else:
                    print(f"[TASK {task_id}] Unrecognised image_url scheme={image_url[:30]!r}, skipping", flush=True)
                    return {"result": [], "score": 0.0}
                print(f"[TASK {task_id}] Fetched {len(image_bytes)} B in {time.time()-t0:.2f}s", flush=True)
            except Exception as e:
                print(f"[TASK {task_id}] ERROR fetching image: {e}", flush=True)
                print(traceback.format_exc(), flush=True)
                return {"result": [], "score": 0.0}

            print(f"[TASK {task_id}] Calling backend.predict.remote() ...", flush=True)
            t_infer = time.time()
            try:
                # Key pattern: call .remote() on the METHOD, not the class
                boxes = backend.predict.remote(image_bytes)
                print(f"[TASK {task_id}] backend.predict.remote() returned {len(boxes)} box(es) in {time.time()-t_infer:.2f}s", flush=True)
            except Exception as e:
                print(f"[TASK {task_id}] ERROR calling backend: {e}", flush=True)
                print(traceback.format_exc(), flush=True)
                return {"result": [], "score": 0.0}

            result = [
                {
                    "from_name": "label",
                    "to_name": "image",
                    "type": "rectanglelabels",
                    "score": box["confidence"],
                    "value": {
                        "x": box["x"],
                        "y": box["y"],
                        "width": box["width"],
                        "height": box["height"],
                        "rotation": 0,
                        "rectanglelabels": [CLASS_NAME],
                    },
                }
                for box in boxes
            ]
            score = max((b["confidence"] for b in boxes), default=0.0)
            print(f"[TASK {task_id}] Final: {len(result)} annotation(s), max_score={score:.3f}", flush=True)
            return {"result": result, "score": score}

        print(f"[REQUEST] Dispatching {len(tasks)} task(s) concurrently", flush=True)
        t_total = time.time()
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            predictions = await asyncio.gather(*(process_task(task, client) for task in tasks))
        print(f"[REQUEST] All tasks done in {time.time()-t_total:.2f}s, returning {len(predictions)} prediction(s)", flush=True)

        return JSONResponse({"results": list(predictions)})

    return web_app


@app.function(image=image, timeout=API_TIMEOUT, secrets=[ls_secret])
@modal.asgi_app()
def labelstudio_backend():
    print(f"[ASGI] labelstudio_backend() called", flush=True)
    return build_fastapi_app()


@app.local_entrypoint()
def main(image_path: str):
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print(f"Running inference on {image_path}...")
    backend = RFDETRBackend()
    results = backend.predict.remote(image_bytes)

    if not results:
        print("No detections found.")
    else:
        print(f"Found {len(results)} detection(s):")
        for r in results:
            print(f" {CLASS_NAME}: {r['confidence']:.2%} confidence "
                  f"x={r['x']:.1f}% y={r['y']:.1f}% "
                  f"w={r['width']:.1f}% h={r['height']:.1f}%")