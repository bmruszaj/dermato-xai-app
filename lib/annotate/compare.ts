import type {
  AnnotationBox,
  ComparisonResult,
  MatchedPair,
  ModelPrediction,
} from "./types";
import { IOU_THRESHOLD, MODEL_CLASS } from "./types";

/** Normalized box in 0-1 coordinate space. */
interface NormBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function toNormFromPixels(
  box: AnnotationBox,
  imgW: number,
  imgH: number
): NormBox {
  return {
    x1: box.left / imgW,
    y1: box.top / imgH,
    x2: (box.left + box.width) / imgW,
    y2: (box.top + box.height) / imgH,
  };
}

function toNormFromPercent(pred: ModelPrediction): NormBox {
  const x1 = pred.x / 100;
  const y1 = pred.y / 100;
  return {
    x1,
    y1,
    x2: x1 + pred.width / 100,
    y2: y1 + pred.height / 100,
  };
}

function computeIou(a: NormBox, b: NormBox): number {
  const interX1 = Math.max(a.x1, b.x1);
  const interY1 = Math.max(a.y1, b.y1);
  const interX2 = Math.min(a.x2, b.x2);
  const interY2 = Math.min(a.y2, b.y2);

  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;

  if (interArea === 0) return 0;

  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return interArea / (areaA + areaB - interArea);
}

/**
 * Compare user annotations against model predictions.
 * Only "Yellow globlues (ulcer)" user boxes are compared against the model.
 * All other user boxes are passed through as context for the LLM.
 */
export function compareAnnotations(
  userBoxes: AnnotationBox[],
  modelPredictions: ModelPrediction[],
  imageDimensions: { width: number; height: number }
): ComparisonResult {
  const { width: imgW, height: imgH } = imageDimensions;

  const yellowBoxes = userBoxes.filter((b) => b.label === MODEL_CLASS);
  const otherUserAnnotations = userBoxes.filter((b) => b.label !== MODEL_CLASS);

  // Convert to normalized 0-1 space
  const normUserBoxes = yellowBoxes.map((b) => toNormFromPixels(b, imgW, imgH));
  const normModelBoxes = modelPredictions.map(toNormFromPercent);

  // Greedy matching: for each model box find best-IoU user box >= threshold
  const matchedUserIndices = new Set<number>();
  const matchedModelIndices = new Set<number>();
  const matched: MatchedPair[] = [];

  // Build all candidate pairs sorted by IoU descending
  const candidates: Array<{ ui: number; mi: number; iou: number }> = [];
  for (let ui = 0; ui < normUserBoxes.length; ui++) {
    for (let mi = 0; mi < normModelBoxes.length; mi++) {
      const iou = computeIou(normUserBoxes[ui], normModelBoxes[mi]);
      if (iou >= IOU_THRESHOLD) {
        candidates.push({ ui, mi, iou });
      }
    }
  }
  candidates.sort((a, b) => b.iou - a.iou);

  for (const { ui, mi, iou } of candidates) {
    if (matchedUserIndices.has(ui) || matchedModelIndices.has(mi)) continue;
    matchedUserIndices.add(ui);
    matchedModelIndices.add(mi);
    matched.push({
      userBox: yellowBoxes[ui],
      modelBox: modelPredictions[mi],
      iou,
    });
  }

  const userOnlyYellow = yellowBoxes.filter(
    (_, i) => !matchedUserIndices.has(i)
  );
  const modelOnlyYellow = modelPredictions.filter(
    (_, i) => !matchedModelIndices.has(i)
  );

  return {
    matched,
    userOnlyYellow,
    modelOnlyYellow,
    otherUserAnnotations,
    imageDimensions,
  };
}
