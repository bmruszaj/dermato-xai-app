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
 *  x, y, width, height are percentages of image dimensions (0-100). */
export interface ModelPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

/** A matched pair between a user box and a model prediction. */
export interface MatchedPair {
  userBox: AnnotationBox;
  modelBox: ModelPrediction;
  iou: number;
}

/** Full comparison result passed to the prompt builder and the feedback API. */
export interface ComparisonResult {
  /** User Yellow-globules boxes that matched a model prediction. */
  matched: MatchedPair[];
  /** User boxes labeled Yellow-globules that did NOT match any model prediction. */
  userOnlyYellow: AnnotationBox[];
  /** Model predictions that did NOT match any user Yellow-globules box. */
  modelOnlyYellow: ModelPrediction[];
  /** All user annotations for the other 4 classes (context for the LLM). */
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

/** The 5 fixed annotation classes. */
export const ANNOTATION_LABELS = [
  "Rosettes",
  "Milia-like-cyst",
  "Blue-gray globules",
  "MAY globules",
  "Yellow globlues (ulcer)",
] as const;

export type AnnotationLabel = (typeof ANNOTATION_LABELS)[number];

/** The class the model is trained on — must match exactly. */
export const MODEL_CLASS = "Yellow globlues (ulcer)" as const;

/** IoU threshold for matching user boxes to model predictions. */
export const IOU_THRESHOLD = 0.3;
