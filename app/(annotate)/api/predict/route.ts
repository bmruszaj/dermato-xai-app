import { type NextRequest, NextResponse } from "next/server";
import {
  ALL_ANNOTATION_LABELS,
  type AnnotationLabel,
  getEnabledAnnotationLabels,
} from "@/lib/annotate/types";

// Allow up to 5 minutes — model cold-start can be slow
export const maxDuration = 300;

const MODAL_URL =
  process.env.MODAL_RFDETR_URL ??
  "https://szafraniecszymon--dermoscopy-rfdetr-sahi-inference-infer-05a6e2.modal.run";
const MAX_IMAGE_PAYLOAD_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_DATA_URI =
  /^data:(image\/(?<extension>png|jpeg|jpg|webp));base64,(?<payload>.+)$/;

type ModalClassKey =
  | "blue_gray_globules"
  | "may_globules"
  | "milia_like_cyst"
  | "rosettes"
  | "yellow_globlues_ulcer";

interface ModalClassConfig {
  enabled: boolean;
  patch_size: number;
  overlap_fraction: number;
  confidence_threshold: number;
  wbf_iou_threshold: number;
}

const MODAL_CLASS_BY_LABEL: Record<AnnotationLabel, ModalClassKey> = {
  "Blue-gray globules": "blue_gray_globules",
  "MAY globules": "may_globules",
  "Milia-like-cyst": "milia_like_cyst",
  Rosettes: "rosettes",
  "Yellow globlues (ulcer)": "yellow_globlues_ulcer",
};

const BASE_MODAL_CLASS_CONFIG: Record<ModalClassKey, ModalClassConfig> = {
  blue_gray_globules: {
    enabled: true,
    patch_size: 128,
    overlap_fraction: 0.25,
    confidence_threshold: 0.7,
    wbf_iou_threshold: 0.15,
  },
  may_globules: {
    enabled: true,
    patch_size: 180,
    overlap_fraction: 0.25,
    confidence_threshold: 0.6,
    wbf_iou_threshold: 0.15,
  },
  milia_like_cyst: {
    enabled: true,
    patch_size: 360,
    overlap_fraction: 0.3,
    confidence_threshold: 0.6,
    wbf_iou_threshold: 0.15,
  },
  rosettes: {
    enabled: true,
    patch_size: 210,
    overlap_fraction: 0.25,
    confidence_threshold: 0.6,
    wbf_iou_threshold: 0.15,
  },
  yellow_globlues_ulcer: {
    enabled: true,
    patch_size: 512,
    overlap_fraction: 0.25,
    confidence_threshold: 0.8,
    wbf_iou_threshold: 0.1,
  },
};

const MODAL_LABEL_ALIASES: Record<string, AnnotationLabel> = {
  "Blue grey globules": "Blue-gray globules",
  "Milia-like cyst": "Milia-like-cyst",
  "Yellow globules (ulcer)": "Yellow globlues (ulcer)",
};

function normalizeModalLabel(label: string): AnnotationLabel | null {
  const normalized = MODAL_LABEL_ALIASES[label] ?? label;
  return ALL_ANNOTATION_LABELS.includes(normalized as AnnotationLabel)
    ? (normalized as AnnotationLabel)
    : null;
}

function getRequestedPredictionLabels(value: unknown): AnnotationLabel[] {
  if (!Array.isArray(value)) {
    return getEnabledAnnotationLabels();
  }

  const availableLabels = new Set(getEnabledAnnotationLabels());
  const requestedLabels = value.filter(
    (label): label is AnnotationLabel =>
      typeof label === "string" &&
      ALL_ANNOTATION_LABELS.includes(label as AnnotationLabel) &&
      availableLabels.has(label as AnnotationLabel)
  );

  return requestedLabels.length > 0
    ? requestedLabels
    : getEnabledAnnotationLabels();
}

function getModalParams(enabledLabels: AnnotationLabel[]) {
  const enabledLabelSet = new Set(enabledLabels);
  const perClass = Object.fromEntries(
    ALL_ANNOTATION_LABELS.map((label) => {
      const classKey = MODAL_CLASS_BY_LABEL[label];
      return [
        classKey,
        {
          ...BASE_MODAL_CLASS_CONFIG[classKey],
          enabled: enabledLabelSet.has(label),
        },
      ];
    })
  ) as Record<ModalClassKey, ModalClassConfig>;

  return {
    overlap_fraction: 0.25,
    wbf_iou_threshold: 0.15,
    per_class: perClass,
  };
}

function getDataUriPayloadSize(dataUri: string): number {
  const base64 = dataUri.split(",", 2)[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

function parseImageDataUri(dataUri: string) {
  const match = SUPPORTED_IMAGE_DATA_URI.exec(dataUri);
  const mimeType = match?.[1];
  const extension = match?.groups?.extension;
  const payload = match?.groups?.payload;

  if (!(mimeType && extension && payload)) {
    return null;
  }

  return {
    bytes: Buffer.from(payload, "base64"),
    extension: extension === "jpeg" ? "jpg" : extension,
    mimeType,
  };
}

function getModalBaseUrl() {
  return MODAL_URL.trim()
    .replace(/\/+$/, "")
    .replace(/\/predict-file$/, "")
    .replace(/\/predict$/, "");
}

function getModalEndpoint(path: "predict" | "predict-file") {
  return `${getModalBaseUrl()}/${path}`;
}

function createPredictFileFormData(
  parsedImage: NonNullable<ReturnType<typeof parseImageDataUri>>,
  enabledLabels: AnnotationLabel[]
) {
  const formData = new FormData();
  formData.append(
    "image",
    new Blob([parsedImage.bytes], { type: parsedImage.mimeType }),
    `dermato-xai-upload.${parsedImage.extension}`
  );
  formData.append("params", JSON.stringify(getModalParams(enabledLabels)));
  formData.append("task_id", "1");
  return formData;
}

function createPredictJsonPayload(
  imageBase64: string,
  enabledLabels: AnnotationLabel[]
) {
  return {
    tasks: [{ id: 1, data: { image: imageBase64 } }],
    params: getModalParams(enabledLabels),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      imageBase64?: string;
      predictionLabels?: unknown;
    };
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Missing imageBase64" },
        { status: 400 }
      );
    }
    const parsedImage = parseImageDataUri(imageBase64);
    if (!parsedImage) {
      return NextResponse.json(
        { error: "Unsupported image type. Use PNG, JPG or WEBP." },
        { status: 400 }
      );
    }
    if (getDataUriPayloadSize(imageBase64) > MAX_IMAGE_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 10 MB." },
        { status: 413 }
      );
    }
    const enabledLabels = getRequestedPredictionLabels(body.predictionLabels);

    let response = await fetch(getModalEndpoint("predict-file"), {
      method: "POST",
      body: createPredictFileFormData(parsedImage, enabledLabels),
      // Node fetch — use signal for timeout
      signal: AbortSignal.timeout(290_000), // 290s — just under maxDuration
    });

    if (response.status === 404) {
      response = await fetch(getModalEndpoint("predict"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          createPredictJsonPayload(imageBase64, enabledLabels)
        ),
        signal: AbortSignal.timeout(290_000),
      });
    }

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          predictions: [],
          error: `Modal responded ${response.status}: ${text.slice(0, 200)}`,
        },
        { status: 200 } // return 200 so client can handle gracefully
      );
    }

    // Modal returns Label Studio-style rectangle annotations.
    const data = (await response.json()) as {
      results: Array<{
        result: Array<{
          score?: number;
          value: {
            x: number;
            y: number;
            width: number;
            height: number;
            rectanglelabels: string[];
          };
        }>;
        score: number;
      }>;
    };

    // Flatten to our ModelPrediction format
    const enabledLabelSet = new Set(enabledLabels);
    const predictions = (data.results?.[0]?.result ?? []).flatMap((r) => {
      const label = normalizeModalLabel(r.value.rectanglelabels[0] ?? "");
      if (!label || !enabledLabelSet.has(label)) {
        return [];
      }
      return [
        {
          x: r.value.x,
          y: r.value.y,
          width: r.value.width,
          height: r.value.height,
          confidence: r.score ?? 0,
          label,
        },
      ];
    });

    return NextResponse.json({ predictions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { predictions: [], error: message },
      { status: 200 }
    );
  }
}
