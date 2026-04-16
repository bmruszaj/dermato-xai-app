/**
 * Visual encoding system for bounding box annotations.
 *
 * COLOR → CLASS (5 fixed colors, one per annotation label)
 * LINE STYLE → SOURCE (solid = human, dashed = AI model)
 */

import { ANNOTATION_LABELS } from "./types";

/** Color assigned to each annotation class. */
export const CLASS_COLORS: Record<string, string> = {
  Rosettes: "#f59e0b", // amber
  "Milia-like-cyst": "#8b5cf6", // violet
  "Blue-gray globules": "#3b82f6", // blue
  "MAY globules": "#10b981", // emerald
  "Yellow globlues (ulcer)": "#eab308", // yellow
};

/** Fallback color for unknown labels. */
export const FALLBACK_COLOR = "#94a3b8";

export function getClassColor(label: string): string {
  return CLASS_COLORS[label] ?? FALLBACK_COLOR;
}

/** Line widths by source */
export const LINE_WIDTH_HUMAN = 2.5;
export const LINE_WIDTH_MODEL = 1.5;

/** SVG dash array: solid for human, dashed for AI model */
export const DASH_HUMAN = "none";
export const DASH_MODEL = "6 4";

/** Polish display names for labels */
export const LABEL_DISPLAY: Record<string, string> = {
  Rosettes: "Rosettes",
  "Milia-like-cyst": "Milia-like cyst",
  "Blue-gray globules": "Blue-gray globules",
  "MAY globules": "MAY globules",
  "Yellow globlues (ulcer)": "Yellow globules (ulcer)",
};

export function getLabelDisplay(label: string): string {
  return LABEL_DISPLAY[label] ?? label;
}

/** All labels in order */
export const ALL_LABELS = [...ANNOTATION_LABELS] as string[];
