"use client";

import { useEffect, useRef, useState } from "react";
import { AnnotationSvgOverlay } from "./AnnotationSvgOverlay";
import type { FilterState } from "./AnnotationSvgOverlay";
import type { ComparisonResult } from "@/lib/annotate/types";

interface ImageComparisonSliderProps {
  imageDataUri: string;
  comparison: ComparisonResult;
  filters: FilterState;
  highlightedCategory: string | null;
}

/**
 * Split-screen "curtain" slider.
 * Left side: only human annotations (solid lines).
 * Right side: only model AI annotations (dashed lines).
 * Drag the handle to reveal either side.
 */
export function ImageComparisonSlider({
  imageDataUri,
  comparison,
  filters,
  highlightedCategory,
}: ImageComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPct, setSplitPct] = useState(50);
  const dragging = useRef(false);

  const calcPct = (clientX: number): number => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return 50;
    }
    return Math.max(
      2,
      Math.min(98, ((clientX - rect.left) / rect.width) * 100)
    );
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: calcPct is stable (uses ref)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) {
        return;
      }
      setSplitPct(calcPct(e.clientX));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) {
        return;
      }
      const touch = e.touches[0];
      if (touch) {
        setSplitPct(calcPct(touch.clientX));
      }
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = () => {
    dragging.current = true;
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-border select-none touch-manipulation"
      ref={containerRef}
    >
      {/* Right layer (model only) — full width, shown underneath */}
      <div className="w-full">
        <AnnotationSvgOverlay
          compareSide="model"
          comparison={comparison}
          filters={filters}
          highlightedCategory={highlightedCategory}
          imageDataUri={imageDataUri}
          viewMode="compare"
        />
      </div>

      {/* Left layer (human only) — clipped to splitPct */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${splitPct}%` }}
      >
        {/* Stretch inner to full image width so the image doesn't shrink */}
        <div style={{ width: `${(100 / splitPct) * 100}%` }}>
          <AnnotationSvgOverlay
            compareSide="human"
            comparison={comparison}
            filters={filters}
            highlightedCategory={highlightedCategory}
            imageDataUri={imageDataUri}
            viewMode="compare"
          />
        </div>
      </div>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] pointer-events-none"
        style={{ left: `${splitPct}%` }}
      />

      {/* Drag handle */}
      <button
        aria-label="Przeciągnij aby porównać adnotacje człowieka i modelu"
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-border shadow-md flex items-center justify-center cursor-col-resize hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-ring"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        style={{ left: `${splitPct}%` }}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="text-foreground/60"
          fill="none"
          height="14"
          viewBox="0 0 16 16"
          width="14"
        >
          <path
            d="M5 3L2 8L5 13M11 3L14 8L11 13"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      {/* Side labels */}
      <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white pointer-events-none">
        Człowiek
      </div>
      <div className="absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white pointer-events-none">
        Model AI
      </div>
    </div>
  );
}
