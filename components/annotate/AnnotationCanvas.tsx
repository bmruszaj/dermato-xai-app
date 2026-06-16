"use client";

import React from "react";
import type { AnnotationLabel } from "@/lib/annotate/types";
import type { EntryType } from "./BBoxAnnotator";
import BBoxAnnotator from "./BBoxAnnotator";

interface AnnotationCanvasProps {
  imageUrl: string;
  labels: AnnotationLabel[];
  onChange: (entries: EntryType[]) => void;
}

export type AnnotatorHandle = { reset: () => void };

export const AnnotationCanvas = React.forwardRef<
  AnnotatorHandle,
  AnnotationCanvasProps
>(function AnnotationCanvas({ imageUrl, labels, onChange }, ref) {
  return (
    <div className="w-full overflow-auto rounded-[1.5rem] bg-[#0d4a48]">
      <div className="inline-block min-w-full">
        <BBoxAnnotator
          borderWidth={2}
          inputMethod="select"
          labels={labels}
          onChange={onChange}
          ref={ref}
          url={imageUrl}
        />
      </div>
    </div>
  );
});
