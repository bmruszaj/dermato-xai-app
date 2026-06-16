"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ALL_LABELS,
  CLASS_COLORS,
  getLabelDisplay,
} from "@/lib/annotate/classColors";
import type { ComparisonResult } from "@/lib/annotate/types";
import type { FilterState } from "./AnnotationSvgOverlay";
import { AnnotationSvgOverlay } from "./AnnotationSvgOverlay";
import { ImageComparisonSlider } from "./ImageComparisonSlider";
import { buildDefaultFilters, MatrixToggles } from "./MatrixToggles";

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
      <div className="h-4 w-2/3 rounded bg-[#d6eeee]" />
      <div className="space-y-2">
        <div className="h-3 rounded bg-[#d6eeee]" />
        <div className="h-3 w-11/12 rounded bg-[#d6eeee]" />
        <div className="h-3 w-4/5 rounded bg-[#d6eeee]" />
      </div>
      <div className="mt-2 h-4 w-1/2 rounded bg-[#d6eeee]" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[#d6eeee]" />
        <div className="h-3 w-10/12 rounded bg-[#d6eeee]" />
        <div className="h-3 w-3/4 rounded bg-[#d6eeee]" />
      </div>
      <div className="mt-2 h-4 w-3/5 rounded bg-[#d6eeee]" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[#d6eeee]" />
        <div className="h-3 w-5/6 rounded bg-[#d6eeee]" />
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
  for (const box of comparison.modelOnlyYellow) {
    inc(box.label, "model");
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
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_340px]">
        {/* ── Left: Image viewer ── */}
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* View mode toggle */}
            <div className="flex overflow-hidden rounded-full border border-[#b9e2e1] bg-white text-xs font-bold shadow-sm">
              <button
                className={`px-4 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#5fb7b9] focus-visible:ring-inset ${
                  viewMode === "overlay"
                    ? "bg-[#5fb7b9] text-white"
                    : "text-[#0d4a48] hover:bg-[#eef8f8]"
                }`}
                onClick={() => {
                  setViewMode("overlay");
                }}
                type="button"
              >
                Nakładka
              </button>
              <button
                className={`border-[#b9e2e1] border-l px-4 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#5fb7b9] focus-visible:ring-inset ${
                  viewMode === "compare"
                    ? "bg-[#5fb7b9] text-white"
                    : "text-[#0d4a48] hover:bg-[#eef8f8]"
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
            <span className="font-medium text-[#4c7372] text-xs tabular-nums">
              {bboxCount.visible} z {bboxCount.total} adnotacji widocznych
            </span>

            {/* Keyboard hint */}
            <span className="hidden items-center gap-1 text-[#4c7372]/70 text-[10px] md:inline-flex">
              <kbd className="rounded border border-[#b9e2e1] bg-[#eef8f8] px-1 py-0.5 font-mono text-[10px]">
                H
              </kbd>{" "}
              człowiek
              <kbd className="rounded border border-[#b9e2e1] bg-[#eef8f8] px-1 py-0.5 font-mono text-[10px]">
                M
              </kbd>{" "}
              model
              <kbd className="rounded border border-[#b9e2e1] bg-[#eef8f8] px-1 py-0.5 font-mono text-[10px]">
                {ALL_LABELS.length > 1 ? `1–${ALL_LABELS.length}` : "1"}
              </kbd>{" "}
              klasy
            </span>
          </div>

          {/* Image */}
          <div className="overflow-hidden rounded-[2rem] border border-[#b9e2e1] bg-white shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
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
            <div className="border-[#b9e2e1] border-t px-4 pt-2 pb-4">
              <div className="flex flex-wrap gap-3 text-[#4c7372] text-[11px]">
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
                <span className="text-[#4c7372]/40">|</span>
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
          <div className="space-y-4 rounded-[2rem] border border-[#b9e2e1] bg-white p-5 shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
            <h2 className="border-[#b9e2e1] border-b pb-3 font-bold text-[#0d4a48] text-sm">
              Feedback edukacyjny
            </h2>
            {feedbackLoading ? (
              <FeedbackSkeleton />
            ) : submitError ? (
              <div className="rounded-[1.25rem] border border-[#e4b65a]/45 bg-[#fff7df] p-4 text-[#8a6318] text-sm">
                <p className="font-bold">
                  Porównanie jest gotowe, ale feedback tekstowy jest chwilowo
                  niedostępny.
                </p>
                <p className="mt-1">
                  Możesz nadal analizować nakładkę, filtry i statystyki
                  porównania. Szczegóły błędu: {submitError}
                </p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none space-y-3">
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
                      className="mt-4 mb-1 font-bold text-[#0d4a48] text-sm"
                      key={paraKey}
                    >
                      {renderInline(cleanText)}
                    </h3>
                  ) : (
                    <p
                      className="text-[#4c7372] text-sm leading-relaxed"
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
          className="flex-1 rounded-full border border-[#b9e2e1] bg-white px-4 py-2.5 font-bold text-[#0d4a48] text-sm transition-transform hover:-translate-y-0.5 hover:bg-[#eef8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5fb7b9]"
          onClick={onAdjust}
          type="button"
        >
          Popraw adnotacje
        </button>
        <button
          className="flex-1 rounded-full bg-[#5fb7b9] px-4 py-2.5 font-bold text-sm text-white shadow-[0_12px_30px_rgba(95,183,185,0.3)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5fb7b9]"
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
  const totalComparableUser = matched.length + userOnlyYellow.length;
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
    <div className="overflow-hidden rounded-[2rem] border border-[#b9e2e1] bg-white shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
      <div className="border-[#b9e2e1] border-b bg-[#eef8f8] px-4 py-3">
        <h3 className="font-bold text-[#0b7975] text-xs uppercase tracking-wide">
          Dane porównania
        </h3>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
        <StatCard
          bg="bg-green-500/10"
          color="text-green-600"
          label="Dopasowane"
          value={matched.length}
        />
        <StatCard
          bg="bg-orange-500/10"
          color="text-orange-600"
          label="Tylko człowiek"
          value={userOnlyYellow.length}
        />
        <StatCard
          bg="bg-red-500/10"
          color="text-red-600"
          label="Tylko model"
          value={modelOnlyYellow.length}
        />
        <StatCard
          bg="bg-blue-500/10"
          color="text-blue-600"
          label="Inne klasy"
          value={comparison.otherUserAnnotations.length}
        />
      </div>

      {/* Totals */}
      <div className="space-y-1 border-[#b9e2e1] border-t px-4 pt-3 pb-3 text-[#4c7372] text-xs">
        <div className="flex justify-between">
          <span>Próg IoU</span>
          <span className="font-medium font-mono text-[#0d4a48] tabular-nums">
            0.30
          </span>
        </div>
        <div className="flex justify-between">
          <span>Porównywane adnotacje człowieka</span>
          <span className="font-medium font-mono text-[#0d4a48] tabular-nums">
            {totalComparableUser}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Porównywane detekcje modelu</span>
          <span className="font-medium font-mono text-[#0d4a48] tabular-nums">
            {totalModel}
          </span>
        </div>
        {avgIou !== null && (
          <div className="flex justify-between">
            <span>Średnie IoU</span>
            <span className="font-medium font-mono text-[#0d4a48] tabular-nums">
              {avgIou.toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {/* Hover-to-highlight category table */}
      {rows.length > 0 && (
        <div className="border-[#b9e2e1] border-t">
          <p className="px-4 pt-3 pb-1 font-bold text-[#4c7372] text-[10px] uppercase tracking-wide">
            Najedź na wiersz aby podświetlić na obrazku
          </p>
          <table className="w-full text-xs">
            <thead className="bg-[#eef8f8]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Klasa</th>
                <th className="px-3 py-2 text-center font-medium">Źródło</th>
                <th className="px-3 py-2 text-right font-medium">Liczba</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d6eeee]">
              {rows.map((row) => {
                const color = CLASS_COLORS[row.label] ?? "#94a3b8";
                return (
                  <tr
                    className="cursor-pointer transition-colors hover:bg-[#f7ffff]"
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
                    <td className="px-3 py-2 text-center text-[#4c7372]">
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
        <div className="border-[#b9e2e1] border-t">
          <p className="px-4 pt-3 pb-1 font-bold text-[#4c7372] text-[10px] uppercase tracking-wide">
            Dopasowane pary (IoU ≥ 0.30)
          </p>
          <div className="overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#eef8f8]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Etykieta</th>
                  <th className="px-3 py-2 text-right font-medium">IoU</th>
                  <th className="px-3 py-2 text-right font-medium">Pewność</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d6eeee]">
                {matched.map((m, i) => (
                  <tr
                    className="transition-colors hover:bg-[#f7ffff]"
                    key={`match-${m.userBox.label}-${m.iou.toFixed(4)}-${i}`}
                    onMouseEnter={() => {
                      onHighlight(`${m.userBox.label}|human`);
                    }}
                    onMouseLeave={() => {
                      onHighlight(null);
                    }}
                  >
                    <td className="px-3 py-1.5 text-[#4c7372]">{i + 1}</td>
                    <td className="px-3 py-1.5">{m.userBox.label}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-green-600 tabular-nums">
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
    <div
      className={`rounded-[1rem] p-3 ${bg} flex flex-col items-center gap-1`}
    >
      <span className={`text-2xl font-bold tabular-nums ${color}`}>
        {value}
      </span>
      <span className="text-center text-[#4c7372] text-xs leading-tight">
        {label}
      </span>
    </div>
  );
}
