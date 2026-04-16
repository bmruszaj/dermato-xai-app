"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DASH_HUMAN,
  DASH_MODEL,
  LINE_WIDTH_HUMAN,
  LINE_WIDTH_MODEL,
  getClassColor,
  getLabelDisplay,
} from "@/lib/annotate/classColors";
import type { ComparisonResult } from "@/lib/annotate/types";

export interface BBoxEntry {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  source: "human" | "model";
  iou?: number;
  confidence?: number;
  categoryKey: string;
}

export interface FilterState {
  [label: string]: { human: boolean; model: boolean };
}

interface TooltipState {
  x: number;
  y: number;
  entry: BBoxEntry;
}

interface AnnotationSvgOverlayProps {
  imageDataUri: string;
  comparison: ComparisonResult;
  filters: FilterState;
  highlightedCategory: string | null;
  viewMode: "overlay" | "compare";
  compareSide?: "human" | "model";
  onBBoxCountChange?: (visible: number, total: number) => void;
}

export function AnnotationSvgOverlay({
  imageDataUri,
  comparison,
  filters,
  highlightedCategory,
  viewMode,
  compareSide,
  onBBoxCountChange,
}: AnnotationSvgOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Measure image on load + resize
  useEffect(() => {
    const img = imgRef.current;
    if (!img) {
      return;
    }
    const measure = () => {
      setImgSize({ w: img.clientWidth, h: img.clientHeight });
    };
    if (img.complete) {
      measure();
    } else {
      img.addEventListener("load", measure);
    }
    const obs = new ResizeObserver(measure);
    obs.observe(img);
    return () => {
      img.removeEventListener("load", measure);
      obs.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildEntries = useCallback((): BBoxEntry[] => {
    if (!imgSize) {
      return [];
    }
    const { width: imgW, height: imgH } = comparison.imageDimensions;
    const scaleX = imgSize.w / imgW;
    const scaleY = imgSize.h / imgH;
    const entries: BBoxEntry[] = [];

    for (const box of comparison.otherUserAnnotations) {
      entries.push({
        x: box.left * scaleX,
        y: box.top * scaleY,
        w: box.width * scaleX,
        h: box.height * scaleY,
        label: box.label,
        source: "human",
        categoryKey: `${box.label}|human`,
      });
    }

    for (const { userBox, modelBox, iou } of comparison.matched) {
      entries.push({
        x: userBox.left * scaleX,
        y: userBox.top * scaleY,
        w: userBox.width * scaleX,
        h: userBox.height * scaleY,
        label: userBox.label,
        source: "human",
        iou,
        categoryKey: `${userBox.label}|human`,
      });
      const left = ((modelBox.x - modelBox.width / 2) / 100) * imgW * scaleX;
      const top = ((modelBox.y - modelBox.height / 2) / 100) * imgH * scaleY;
      entries.push({
        x: left,
        y: top,
        w: (modelBox.width / 100) * imgW * scaleX,
        h: (modelBox.height / 100) * imgH * scaleY,
        label: userBox.label,
        source: "model",
        iou,
        confidence: modelBox.confidence,
        categoryKey: `${userBox.label}|model`,
      });
    }

    for (const box of comparison.userOnlyYellow) {
      entries.push({
        x: box.left * scaleX,
        y: box.top * scaleY,
        w: box.width * scaleX,
        h: box.height * scaleY,
        label: box.label,
        source: "human",
        categoryKey: `${box.label}|human`,
      });
    }

    for (const pred of comparison.modelOnlyYellow) {
      const left = ((pred.x - pred.width / 2) / 100) * imgW * scaleX;
      const top = ((pred.y - pred.height / 2) / 100) * imgH * scaleY;
      entries.push({
        x: left,
        y: top,
        w: (pred.width / 100) * imgW * scaleX,
        h: (pred.height / 100) * imgH * scaleY,
        label: "Yellow globlues (ulcer)",
        source: "model",
        confidence: pred.confidence,
        categoryKey: "Yellow globlues (ulcer)|model",
      });
    }

    return entries;
  }, [comparison, imgSize]);

  const isVisible = useCallback(
    (entry: BBoxEntry): boolean => {
      if (
        viewMode === "compare" &&
        compareSide &&
        entry.source !== compareSide
      ) {
        return false;
      }
      const f = filters[entry.label];
      if (!f) {
        return true;
      }
      return entry.source === "human" ? f.human : f.model;
    },
    [filters, viewMode, compareSide]
  );

  const entries = useMemo(() => buildEntries(), [buildEntries]);
  const visibleEntries = useMemo(
    () => entries.filter(isVisible),
    [entries, isVisible]
  );

  useEffect(() => {
    onBBoxCountChange?.(visibleEntries.length, entries.length);
  }, [visibleEntries.length, entries.length, onBBoxCountChange]);

  // Imperative mouse tracking (avoids biome "static element" warnings)
  const visibleEntriesRef = useRef(visibleEntries);
  visibleEntriesRef.current = visibleEntries;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Find smallest bbox under cursor
      let best: BBoxEntry | null = null;
      let bestArea = Number.POSITIVE_INFINITY;
      for (const entry of visibleEntriesRef.current) {
        if (
          cx >= entry.x &&
          cx <= entry.x + entry.w &&
          cy >= entry.y &&
          cy <= entry.y + entry.h
        ) {
          const area = entry.w * entry.h;
          if (area < bestArea) {
            bestArea = area;
            best = entry;
          }
        }
      }
      setTooltip(best ? { x: cx, y: cy, entry: best } : null);
    };
    const onLeave = () => {
      setTooltip(null);
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const getOpacity = (entry: BBoxEntry): number => {
    if (!highlightedCategory) {
      return 1;
    }
    return entry.categoryKey === highlightedCategory ? 1 : 0.1;
  };

  return (
    <div
      className="relative w-full select-none cursor-crosshair"
      ref={containerRef}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {/* biome-ignore lint/performance/noImgElement: data URI — next/image cannot handle data: URIs */}
      <img
        alt="Dermoskopia — obraz do analizy"
        className="block w-full rounded-lg"
        ref={imgRef}
        src={imageDataUri}
      />

      {imgSize && (
        <svg
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-visible"
          height={imgSize.h}
          style={{ top: 0, left: 0 }}
          width={imgSize.w}
        >
          <defs>
            <style>{`
              @keyframes bboxPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
              }
              .bbox-pulse { animation: bboxPulse 1s ease-in-out infinite; }
            `}</style>
          </defs>
          {visibleEntries.map((entry, i) => {
            const color = getClassColor(entry.label);
            const dash = entry.source === "human" ? DASH_HUMAN : DASH_MODEL;
            const lw =
              entry.source === "human" ? LINE_WIDTH_HUMAN : LINE_WIDTH_MODEL;
            const opacity = getOpacity(entry);
            const isHighlighted = highlightedCategory === entry.categoryKey;
            const isHovered = tooltip?.entry === entry;

            return (
              <g
                className={isHighlighted ? "bbox-pulse" : undefined}
                key={`bbox-${entry.categoryKey}-${i}`}
                opacity={opacity}
                style={{ transition: "opacity 0.2s ease" }}
              >
                <rect
                  fill="transparent"
                  height={entry.h}
                  rx={2}
                  stroke={color}
                  strokeDasharray={dash}
                  strokeWidth={isHighlighted || isHovered ? lw * 2.2 : lw}
                  width={entry.w}
                  x={entry.x}
                  y={entry.y}
                />
                {entry.source === "model" && entry.confidence !== undefined && (
                  <>
                    <rect
                      fill={color}
                      height={14}
                      rx={2}
                      width={32}
                      x={entry.x + entry.w - 34}
                      y={entry.y + entry.h - 16}
                    />
                    <text
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={9}
                      fontWeight="bold"
                      textAnchor="middle"
                      x={entry.x + entry.w - 18}
                      y={entry.y + entry.h - 9}
                    >
                      {(entry.confidence * 100).toFixed(0)}%
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {tooltip && imgSize && (
        <div
          aria-live="polite"
          className="absolute z-30 pointer-events-none"
          style={{
            left: Math.min(tooltip.x + 14, imgSize.w - 200),
            top: Math.max(tooltip.y - 10, 4),
          }}
        >
          <BBoxTooltip entry={tooltip.entry} />
        </div>
      )}
    </div>
  );
}

function BBoxTooltip({ entry }: { entry: BBoxEntry }) {
  const color = getClassColor(entry.label);
  return (
    <div className="rounded-lg border border-border bg-popover shadow-lg px-3 py-2 text-xs space-y-1 min-w-[160px] max-w-[210px]">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-semibold text-foreground leading-tight">
          {getLabelDisplay(entry.label)}
        </span>
      </div>
      <div className="text-muted-foreground">
        Źródło:{" "}
        <span className="font-medium text-foreground">
          {entry.source === "human" ? "Człowiek" : "Model AI"}
        </span>
      </div>
      {entry.iou !== undefined && (
        <div className="text-muted-foreground">
          IoU:{" "}
          <span className="font-mono font-medium text-foreground">
            {entry.iou.toFixed(3)}
          </span>
        </div>
      )}
      {entry.confidence !== undefined && (
        <div className="text-muted-foreground">
          Pewność:{" "}
          <span className="font-mono font-medium text-foreground">
            {(entry.confidence * 100).toFixed(1)}%
          </span>
        </div>
      )}
      <div
        className="mt-1 pt-1 border-t border-border/50 text-[10px] font-medium"
        style={{ color }}
      >
        {entry.source === "model"
          ? "╌╌ przerywana = AI"
          : "── ciągła = Człowiek"}
      </div>
    </div>
  );
}
