"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComparisonResult } from "@/lib/annotate/types";
import {
  ALL_LABELS,
  CLASS_COLORS,
  getLabelDisplay,
} from "@/lib/annotate/classColors";
import { AnnotationSvgOverlay } from "./AnnotationSvgOverlay";
import type { FilterState } from "./AnnotationSvgOverlay";
import { MatrixToggles, buildDefaultFilters } from "./MatrixToggles";
import { ImageComparisonSlider } from "./ImageComparisonSlider";

interface FeedbackPanelProps {
  feedback: string;
  feedbackLoading: boolean;
  comparison: ComparisonResult;
  imageDataUri: string;
  submitError?: string | null;
  onRetry: () => void;
  onAdjust: () => void;
}

type ViewMode = "overlay" | "compare";

function FeedbackSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-11/12" />
        <div className="h-3 bg-muted rounded w-4/5" />
      </div>
      <div className="h-4 bg-muted rounded w-1/2 mt-2" />
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-10/12" />
        <div className="h-3 bg-muted rounded w-3/4" />
      </div>
      <div className="h-4 bg-muted rounded w-3/5 mt-2" />
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
    </div>
  );
}

/** Compute per-label, per-source bbox counts from comparison result */
function computeCounts(
  comparison: ComparisonResult
): Record<string, { human: number; model: number }> {
  const counts: Record<string, { human: number; model: number }> = {};
  const inc = (label: string, source: "human" | "model") => {
    if (!counts[label]) {
      counts[label] = { human: 0, model: 0 };
    }
    counts[label][source]++;
  };

  for (const box of comparison.otherUserAnnotations) {
    inc(box.label, "human");
  }
  for (const { userBox } of comparison.matched) {
    inc(userBox.label, "human");
  }
  for (const { userBox } of comparison.matched) {
    inc(userBox.label, "model");
  }
  for (const box of comparison.userOnlyYellow) {
    inc(box.label, "human");
  }
  for (const _ of comparison.modelOnlyYellow) {
    inc("Yellow globlues (ulcer)", "model");
  }
  return counts;
}

export function FeedbackPanel({
  feedback,
  feedbackLoading,
  comparison,
  imageDataUri,
  submitError,
  onRetry,
  onAdjust,
}: FeedbackPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("overlay");
  const [filters, setFilters] = useState<FilterState>(buildDefaultFilters);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(
    null
  );
  const [bboxCount, setBboxCount] = useState<{
    visible: number;
    total: number;
  }>({
    visible: 0,
    total: 0,
  });

  const counts = useMemo(() => computeCounts(comparison), [comparison]);

  // Keyboard shortcuts: H = toggle human, M = toggle model, 1-5 = toggle class
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "h" || e.key === "H") {
        setFilters((prev) => {
          const allOn = ALL_LABELS.every((l) => prev[l]?.human !== false);
          const next = { ...prev };
          for (const label of ALL_LABELS) {
            next[label] = { ...next[label], human: !allOn };
          }
          return next;
        });
      } else if (e.key === "m" || e.key === "M") {
        setFilters((prev) => {
          const allOn = ALL_LABELS.every((l) => prev[l]?.model !== false);
          const next = { ...prev };
          for (const label of ALL_LABELS) {
            next[label] = { ...next[label], model: !allOn };
          }
          return next;
        });
      } else if (e.key >= "1" && e.key <= "5") {
        const idx = Number.parseInt(e.key, 10) - 1;
        const label = ALL_LABELS[idx];
        if (label) {
          setFilters((prev) => {
            const cur = prev[label] ?? { human: true, model: true };
            const anyOn = cur.human || cur.model;
            return { ...prev, [label]: { human: !anyOn, model: !anyOn } };
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const handleBBoxCountChange = useCallback(
    (visible: number, total: number) => {
      setBboxCount({ visible, total });
    },
    []
  );

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const inner = part.slice(2, -2);
        return <strong key={`bold-${inner}`}>{inner}</strong>;
      }
      return part;
    });
  };

  const paragraphs = feedback
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="w-full space-y-6">
      {/* ── Main two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        {/* ── Left: Image viewer ── */}
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* View mode toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
              <button
                className={`px-3 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                  viewMode === "overlay"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
                onClick={() => {
                  setViewMode("overlay");
                }}
                type="button"
              >
                Nakładka
              </button>
              <button
                className={`px-3 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset border-l border-border ${
                  viewMode === "compare"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
                onClick={() => {
                  setViewMode("compare");
                }}
                type="button"
              >
                Porównaj ↔
              </button>
            </div>

            {/* Bbox counter */}
            <span className="text-xs text-muted-foreground tabular-nums">
              {bboxCount.visible} z {bboxCount.total} adnotacji widocznych
            </span>

            {/* Keyboard hint */}
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">
                H
              </kbd>{" "}
              człowiek
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">
                M
              </kbd>{" "}
              model
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">
                1–5
              </kbd>{" "}
              klasy
            </span>
          </div>

          {/* Image */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {viewMode === "overlay" ? (
              <div className="p-3">
                <AnnotationSvgOverlay
                  comparison={comparison}
                  filters={filters}
                  highlightedCategory={highlightedCategory}
                  imageDataUri={imageDataUri}
                  onBBoxCountChange={handleBBoxCountChange}
                  viewMode="overlay"
                />
              </div>
            ) : (
              <div className="p-3">
                <ImageComparisonSlider
                  comparison={comparison}
                  filters={filters}
                  highlightedCategory={highlightedCategory}
                  imageDataUri={imageDataUri}
                />
              </div>
            )}

            {/* Legend */}
            <div className="px-4 pb-4 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <svg aria-hidden="true" height="10" width="20">
                    <line
                      stroke="#94a3b8"
                      strokeWidth="2.5"
                      x1="0"
                      x2="20"
                      y1="5"
                      y2="5"
                    />
                  </svg>
                  <span>Człowiek (ciągła)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg aria-hidden="true" height="10" width="20">
                    <line
                      stroke="#94a3b8"
                      strokeDasharray="4 3"
                      strokeWidth="1.5"
                      x1="0"
                      x2="20"
                      y1="5"
                      y2="5"
                    />
                  </svg>
                  <span>Model AI (przerywana)</span>
                </div>
                <span className="text-muted-foreground/40">|</span>
                {ALL_LABELS.map((label) => (
                  <div className="flex items-center gap-1" key={label}>
                    <span
                      aria-hidden="true"
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: CLASS_COLORS[label] ?? "#94a3b8",
                      }}
                    />
                    <span>{getLabelDisplay(label)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats table — hover highlights bboxes */}
          <ComparisonStatsInteractive
            comparison={comparison}
            counts={counts}
            onHighlight={setHighlightedCategory}
          />
        </div>

        {/* ── Right: Filters + Feedback ── */}
        <div className="space-y-4">
          {/* Matrix Toggles */}
          <MatrixToggles
            counts={counts}
            filters={filters}
            onChange={setFilters}
          />

          {/* Feedback text */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">
              Feedback edukacyjny
            </h2>
            {feedbackLoading ? (
              <FeedbackSkeleton />
            ) : submitError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 p-3 text-sm text-red-700 dark:text-red-400">
                {submitError}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
                {paragraphs.map((paragraph, i) => {
                  const isHeader =
                    paragraph.startsWith("##") ||
                    paragraph.startsWith("**") ||
                    paragraph.startsWith("1.") ||
                    paragraph.startsWith("2.") ||
                    paragraph.startsWith("3.");
                  const cleanText = paragraph
                    .replace(/^##\s*/, "")
                    .replace(/^\d+\.\s*/, "");
                  const paraKey = `para-${paragraph.slice(0, 40)}-${i}`;
                  return isHeader ? (
                    <h3
                      className="text-sm font-semibold text-foreground mt-4 mb-1"
                      key={paraKey}
                    >
                      {renderInline(cleanText)}
                    </h3>
                  ) : (
                    <p
                      className="text-sm text-foreground/90 leading-relaxed"
                      key={paraKey}
                    >
                      {renderInline(paragraph)}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onAdjust}
          type="button"
        >
          Popraw adnotacje
        </button>
        <button
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onRetry}
          type="button"
        >
          Zacznij od nowa
        </button>
      </div>
    </div>
  );
}

// ── Interactive stats table ────────────────────────────────────────────────

interface ComparisonStatsInteractiveProps {
  comparison: ComparisonResult;
  counts: Record<string, { human: number; model: number }>;
  onHighlight: (key: string | null) => void;
}

function ComparisonStatsInteractive({
  comparison,
  counts,
  onHighlight,
}: ComparisonStatsInteractiveProps) {
  const { matched, userOnlyYellow, modelOnlyYellow } = comparison;
  const totalUserYellow = matched.length + userOnlyYellow.length;
  const totalModel = matched.length + modelOnlyYellow.length;
  const avgIou =
    matched.length > 0
      ? matched.reduce((sum, m) => sum + m.iou, 0) / matched.length
      : null;

  // Build category rows for all active labels
  const rows: Array<{
    label: string;
    source: "human" | "model";
    count: number;
    key: string;
  }> = [];
  for (const label of ALL_LABELS) {
    const c = counts[label];
    if (!c) {
      continue;
    }
    if (c.human > 0) {
      rows.push({
        label,
        source: "human",
        count: c.human,
        key: `${label}|human`,
      });
    }
    if (c.model > 0) {
      rows.push({
        label,
        source: "model",
        count: c.model,
        key: `${label}|model`,
      });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dane porównania
        </h3>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
        <StatCard
          bg="bg-green-500/10"
          color="text-green-600 dark:text-green-400"
          label="Dopasowane"
          value={matched.length}
        />
        <StatCard
          bg="bg-orange-500/10"
          color="text-orange-600 dark:text-orange-400"
          label="Tylko człowiek"
          value={userOnlyYellow.length}
        />
        <StatCard
          bg="bg-red-500/10"
          color="text-red-600 dark:text-red-400"
          label="Tylko model"
          value={modelOnlyYellow.length}
        />
        <StatCard
          bg="bg-blue-500/10"
          color="text-blue-600 dark:text-blue-400"
          label="Inne klasy"
          value={comparison.otherUserAnnotations.length}
        />
      </div>

      {/* Totals */}
      <div className="px-4 pb-3 text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
        <div className="flex justify-between">
          <span>Próg IoU</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            0.30
          </span>
        </div>
        <div className="flex justify-between">
          <span>Adnotacje Yellow globules (człowiek)</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            {totalUserYellow}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Detekcje modelu (Yellow globules)</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            {totalModel}
          </span>
        </div>
        {avgIou !== null && (
          <div className="flex justify-between">
            <span>Średnie IoU</span>
            <span className="font-mono font-medium text-foreground tabular-nums">
              {avgIou.toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {/* Hover-to-highlight category table */}
      {rows.length > 0 && (
        <div className="border-t border-border">
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Najedź na wiersz aby podświetlić na obrazku
          </p>
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Klasa</th>
                <th className="px-3 py-2 text-center font-medium">Źródło</th>
                <th className="px-3 py-2 text-right font-medium">Liczba</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const color = CLASS_COLORS[row.label] ?? "#94a3b8";
                return (
                  <tr
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    key={row.key}
                    onMouseEnter={() => {
                      onHighlight(row.key);
                    }}
                    onMouseLeave={() => {
                      onHighlight(null);
                    }}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        {getLabelDisplay(row.label)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground">
                      {row.source === "human" ? "Człowiek" : "Model AI"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {row.count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Matched pairs detail */}
      {matched.length > 0 && (
        <div className="border-t border-border">
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Dopasowane pary (IoU ≥ 0.30)
          </p>
          <div className="overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Etykieta</th>
                  <th className="px-3 py-2 text-right font-medium">IoU</th>
                  <th className="px-3 py-2 text-right font-medium">Pewność</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matched.map((m, i) => (
                  <tr
                    className="hover:bg-muted/30 transition-colors"
                    key={`match-${m.userBox.label}-${m.iou.toFixed(4)}-${i}`}
                    onMouseEnter={() => {
                      onHighlight(`${m.userBox.label}|human`);
                    }}
                    onMouseLeave={() => {
                      onHighlight(null);
                    }}
                  >
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-3 py-1.5">{m.userBox.label}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-green-600 dark:text-green-400">
                      {m.iou.toFixed(3)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                      {(m.modelBox.confidence * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
  bg,
}: {
  value: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-lg p-3 ${bg} flex flex-col items-center gap-1`}>
      <span className={`text-2xl font-bold tabular-nums ${color}`}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground text-center leading-tight">
        {label}
      </span>
    </div>
  );
}
