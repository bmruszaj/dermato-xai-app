"use client";

import React, { useEffect, useRef } from "react";
import type { ComparisonResult } from "@/lib/annotate/types";

interface ComparisonOverlayProps {
  imageDataUri: string;
  comparison: ComparisonResult;
}

/**
 * Renders the uploaded image with bounding boxes overlaid:
 *   - Blue  = user annotation (all labels)
 *   - Red   = model-only prediction (false negative from user's perspective)
 *   - Green = matched pair (both user Yellow-globules + model agree)
 *   - Orange = user Yellow-globules that didn't match any model box
 */
export function ComparisonOverlay({
  imageDataUri,
  comparison,
}: ComparisonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const { imageDimensions } = comparison;
      const imgW = imageDimensions.width;
      const imgH = imageDimensions.height;

      // Scale to fit container width
      const maxW = container.clientWidth || 800;
      const scale = Math.min(1, maxW / imgW);
      const drawW = imgW * scale;
      const drawH = imgH * scale;

      canvas.width = drawW;
      canvas.height = drawH;

      // Draw image
      ctx.drawImage(img, 0, 0, drawW, drawH);

      // Helper: draw a box in pixel coords (already in image pixels)
      const drawPixelBox = (
        left: number,
        top: number,
        width: number,
        height: number,
        color: string,
        label: string
      ) => {
        const x = left * scale;
        const y = top * scale;
        const w = width * scale;
        const h = height * scale;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Label background
        ctx.font = "bold 11px sans-serif";
        const textW = ctx.measureText(label).width + 6;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 16, textW, 16);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x + 3, y - 4);
      };

      // Helper: draw a model box (percent coords → pixels)
      const drawModelBox = (
        xPct: number,
        yPct: number,
        wPct: number,
        hPct: number,
        color: string,
        label: string
      ) => {
        const left = (xPct / 100) * imgW;
        const top = (yPct / 100) * imgH;
        const width = (wPct / 100) * imgW;
        const height = (hPct / 100) * imgH;
        drawPixelBox(left, top, width, height, color, label);
      };

      // 1. Other user annotations (blue)
      for (const box of comparison.otherUserAnnotations) {
        drawPixelBox(
          box.left,
          box.top,
          box.width,
          box.height,
          "#3b82f6",
          box.label
        );
      }

      // 2. Matched pairs — green for both user + model
      for (const { userBox, modelBox, iou } of comparison.matched) {
        drawPixelBox(
          userBox.left,
          userBox.top,
          userBox.width,
          userBox.height,
          "#22c55e",
          `Użytkownik (IoU ${iou.toFixed(2)})`
        );
        drawModelBox(
          modelBox.x,
          modelBox.y,
          modelBox.width,
          modelBox.height,
          "#16a34a",
          `Model (IoU ${iou.toFixed(2)})`
        );
      }

      // 3. User Yellow-globules with no model match (orange)
      for (const box of comparison.userOnlyYellow) {
        drawPixelBox(
          box.left,
          box.top,
          box.width,
          box.height,
          "#f97316",
          `${box.label} (brak dopasowania)`
        );
      }

      // 4. Model predictions with no user match (red)
      for (const pred of comparison.modelOnlyYellow) {
        drawModelBox(
          pred.x,
          pred.y,
          pred.width,
          pred.height,
          "#ef4444",
          `Model (${(pred.confidence * 100).toFixed(0)}%)`
        );
      }
    };

    img.src = imageDataUri;
  }, [imageDataUri, comparison]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border border-border"
        style={{ display: "block" }}
      />
      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <LegendItem
          color="#3b82f6"
          label="Adnotacje użytkownika (inne klasy)"
        />
        <LegendItem
          color="#22c55e"
          label="Yellow globules użytkownika — dopasowane"
        />
        <LegendItem color="#16a34a" label="Model — dopasowany" />
        <LegendItem
          color="#f97316"
          label="Yellow globules użytkownika — brak dopasowania"
        />
        <LegendItem
          color="#ef4444"
          label="Model — brak dopasowania użytkownika"
        />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-5 rounded-sm border-2"
        style={{ borderColor: color }}
      />
      {label}
    </span>
  );
}
