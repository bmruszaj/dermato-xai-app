"use client";

import React from "react";
import BBoxAnnotator from "./BBoxAnnotator";
import type { EntryType } from "./BBoxAnnotator";
import { ANNOTATION_LABELS } from "@/lib/annotate/types";

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
          url={imageUrl}
          inputMethod="select"
          labels={[...ANNOTATION_LABELS]}
          onChange={onChange}
          borderWidth={2}
          ref={ref}
        />
      </div>
    </div>
  );
});
