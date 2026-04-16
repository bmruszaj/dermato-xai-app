"use client";

import React from "react";
import { ANNOTATION_LABELS } from "@/lib/annotate/types";
import type { EntryType } from "./BBoxAnnotator";
import BBoxAnnotator from "./BBoxAnnotator";

interface AnnotationCanvasProps {
  imageUrl: string;
  onChange: (entries: EntryType[]) => void;
}

export type AnnotatorHandle = { reset: () => void };

export const AnnotationCanvas = React.forwardRef<
  AnnotatorHandle,
  AnnotationCanvasProps
>(function AnnotationCanvas({ imageUrl, onChange }, ref) {
  return (
    <div className="w-full overflow-auto rounded-lg border border-border bg-black">
      <div className="inline-block min-w-full">
        <BBoxAnnotator
          borderWidth={2}
          inputMethod="select"
          labels={[...ANNOTATION_LABELS]}
          onChange={onChange}
          ref={ref}
          url={imageUrl}
        />
      </div>
    </div>
  );
});
