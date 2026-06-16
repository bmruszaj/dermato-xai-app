# Dermato XAI — setup

## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app starts at `http://localhost:3000`.

## Environment

Required for the full demo:

```bash
CLARIN_API_KEY=...
# optional; defaults to llama3.3
CLARIN_MODEL=llama3.3
MODAL_RFDETR_URL=https://szafraniecszymon--dermoscopy-rfdetr-sahi-inference-infer-05a6e2.modal.run
```

Optional structure set:

```bash
# unset: all structures
ANNOTATION_STRUCTURE_SET=1 # Yellow globules + Blue-gray globules
ANNOTATION_STRUCTURE_SET=2 # Yellow globules only
```

The public demo does not require Auth.js, user accounts, Postgres, Redis, or Blob storage.

## Public Flow

1. Open `/`.
2. Read the project card and disclaimer.
3. Click `Wypróbuj demo`.
4. Choose a synthetic sample image or upload a PNG/JPG/WEBP image up to 10 MB.
5. Draw bounding boxes and assign labels.
6. Submit annotations.
7. Review the overlay, source filters, comparison stats, and optional CLARIN feedback.

## Architecture

- `app/page.tsx` — public landing page.
- `app/(annotate)/annotate/page.tsx` — demo state machine.
- `components/annotate/UploadZone.tsx` — sample image picker and upload.
- `lib/annotate/demoImages.ts` — sample image manifest.
- `app/(annotate)/api/predict/route.ts` — Modal RF-DETR + SAHI proxy.
- `app/(annotate)/api/feedback/route.ts` — CLARIN feedback proxy.
- `lib/annotate/compare.ts` — same-label IoU matching.

## Model Endpoint

- Endpoint: `MODAL_RFDETR_URL`.
- Input: Label Studio-style `POST /predict` payload with data URI image.
- Per-call params: `overlap_fraction`, `wbf_iou_threshold`, and `per_class`.
- Output: Label Studio rectangle annotations normalized into `{ x, y, width, height, confidence, label }`.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm test
```

`pnpm check` uses Ultracite/Biome and depends on a valid `biome.jsonc`.

---

## Next Steps

1. **Run locally:** `pnpm dev` → `http://localhost:3000/annotate`
2. **Upload an image** (dermoscopic / skin lesion)
3. **Draw bounding boxes** on lesions
4. **Wait for ML** (badge shows status)
5. **Submit annotations** → get feedback

Enjoy!
