/**
 * Shared types for the annotation + ML comparison + feedback flow.
 */

/** One bounding box drawn by the user.
 *  Coordinates are in original image pixels (scaled by the annotator's multiplier). */
export interface AnnotationBox {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
}

/** One detection returned by the RF-DETR model.
 *  x, y, width, height are Label Studio percentages of image dimensions (0-100). */
export interface ModelPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
}

/** A matched pair between a user box and a model prediction. */
export interface MatchedPair {
  userBox: AnnotationBox;
  modelBox: ModelPrediction;
  iou: number;
}

/** Full comparison result passed to the prompt builder and the feedback API. */
export interface ComparisonResult {
  /** User boxes that matched a same-label model prediction. */
  matched: MatchedPair[];
  /** User boxes that did NOT match any same-label model prediction. */
  userOnlyYellow: AnnotationBox[];
  /** Model predictions that did NOT match any same-label user box. */
  modelOnlyYellow: ModelPrediction[];
  /** User annotations outside the currently comparable model label set. */
  otherUserAnnotations: AnnotationBox[];
  /** Original image pixel dimensions (needed for coordinate conversion). */
  imageDimensions: { width: number; height: number };
}

/** Flow state phases for the main page. */
export type AnnotationPhase =
  | "upload"
  | "annotating"
  | "submitting"
  | "feedback";

/** The 5 fixed annotation classes supported by the project. */
export const ALL_ANNOTATION_LABELS = [
  "Rosettes",
  "Milia-like-cyst",
  "Blue-gray globules",
  "MAY globules",
  "Yellow globlues (ulcer)",
] as const;

export type AnnotationLabel = (typeof ALL_ANNOTATION_LABELS)[number];

/** The default showcase class — spelling must match the Modal label mapping. */
export const MODEL_CLASS = "Yellow globlues (ulcer)" as const;

export const BLUE_GRAY_GLOBULES_CLASS = "Blue-gray globules" as const;

const LABEL_SET_BY_MODE: Record<string, readonly AnnotationLabel[]> = {
  "1": [MODEL_CLASS, BLUE_GRAY_GLOBULES_CLASS],
  "2": [MODEL_CLASS],
};

function getConfiguredLabelSetMode(): string {
  return (
    process.env.ANNOTATION_STRUCTURE_SET ??
    process.env.NEXT_PUBLIC_ANNOTATION_STRUCTURE_SET ??
    ""
  ).trim();
}

export function getEnabledAnnotationLabels(
  mode = getConfiguredLabelSetMode()
): AnnotationLabel[] {
  const labels = LABEL_SET_BY_MODE[mode];
  return [...(labels ?? ALL_ANNOTATION_LABELS)];
}

/** Annotation classes exposed to the current build/runtime. */
export const ANNOTATION_LABELS = getEnabledAnnotationLabels();

/** IoU threshold for matching user boxes to model predictions. */
export const IOU_THRESHOLD = 0.3;
