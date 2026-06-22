"use client";

import {
  ALL_LABELS,
  CLASS_COLORS,
  getLabelDisplay,
} from "@/lib/annotate/classColors";
import type { FilterState } from "./AnnotationSvgOverlay";

interface MatrixTogglesProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  /** How many of each category-source exist (for display) */
  counts?: Record<string, { human: number; model: number }>;
}

export function MatrixToggles({
  filters,
  onChange,
  counts,
}: MatrixTogglesProps) {
  const allHumanOn = ALL_LABELS.every((l) => filters[l]?.human !== false);
  const allModelOn = ALL_LABELS.every((l) => filters[l]?.model !== false);

  const setAll = (human: boolean, model: boolean) => {
    const next: FilterState = {};
    for (const label of ALL_LABELS) {
      next[label] = { human, model };
    }
    onChange(next);
  };

  const toggle = (label: string, source: "human" | "model") => {
    onChange({
      ...filters,
      [label]: {
        ...filters[label],
        [source]: !filters[label]?.[source],
      },
    });
  };

  const toggleColumn = (source: "human" | "model", value: boolean) => {
    const next: FilterState = { ...filters };
    for (const label of ALL_LABELS) {
      next[label] = { ...next[label], [source]: value };
    }
    onChange(next);
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#b9e2e1] bg-white shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
      {/* Header */}
      <div className="flex items-center justify-between border-[#b9e2e1] border-b bg-[#eef8f8] px-4 py-3">
        <span className="font-bold text-[#0b7975] text-xs uppercase tracking-wide">
          Filtry widoczności
        </span>
        <div className="flex gap-2">
          <button
            className="rounded px-1 text-[#4c7372] text-xs transition-colors hover:text-[#0d4a48] focus-visible:ring-2 focus-visible:ring-[#5fb7b9]"
            onClick={() => {
              setAll(true, true);
            }}
            type="button"
          >
            Zaznacz wszystko
          </button>
          <span className="text-[#4c7372]/40">|</span>
          <button
            className="rounded px-1 text-[#4c7372] text-xs transition-colors hover:text-[#0d4a48] focus-visible:ring-2 focus-visible:ring-[#5fb7b9]"
            onClick={() => {
              setAll(false, false);
            }}
            type="button"
          >
            Odznacz wszystko
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-[#b9e2e1] border-b">
            <th className="w-full px-3 py-2 text-left font-medium text-[#4c7372]">
              Klasa
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-center font-medium text-[#4c7372]">
              <div className="flex flex-col items-center gap-1">
                <span>Człowiek</span>
                <span className="text-[10px] opacity-60">── ciągła</span>
                <input
                  aria-label="Pokaż wszystkie anotacje człowieka"
                  checked={allHumanOn}
                  className="cursor-pointer accent-[#5fb7b9]"
                  onChange={(e) => {
                    toggleColumn("human", e.target.checked);
                  }}
                  type="checkbox"
                />
              </div>
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-center font-medium text-[#4c7372]">
              <div className="flex flex-col items-center gap-1">
                <span>Model AI</span>
                <span className="text-[10px] opacity-60">╌╌ przeryw.</span>
                <input
                  aria-label="Pokaż wszystkie anotacje modelu AI"
                  checked={allModelOn}
                  className="cursor-pointer accent-[#5fb7b9]"
                  onChange={(e) => {
                    toggleColumn("model", e.target.checked);
                  }}
                  type="checkbox"
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#d6eeee]">
          {ALL_LABELS.map((label) => {
            const color = CLASS_COLORS[label] ?? "#94a3b8";
            const humanOn = filters[label]?.human !== false;
            const modelOn = filters[label]?.model !== false;
            const humanCount = counts?.[label]?.human ?? 0;
            const modelCount = counts?.[label]?.model ?? 0;

            return (
              <tr className="transition-colors hover:bg-[#f7ffff]" key={label}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[#0d4a48]">
                      {getLabelDisplay(label)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                    <input
                      aria-label={`Pokaż ${getLabelDisplay(label)} — Człowiek`}
                      checked={humanOn}
                      className="cursor-pointer accent-[#5fb7b9]"
                      onChange={() => {
                        toggle(label, "human");
                      }}
                      type="checkbox"
                    />
                    {humanCount > 0 && (
                      <span className="font-mono text-[#4c7372] text-[10px]">
                        {humanCount}
                      </span>
                    )}
                  </label>
                </td>
                <td className="px-3 py-2 text-center">
                  <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                    <input
                      aria-label={`Pokaż ${getLabelDisplay(label)} — Model AI`}
                      checked={modelOn}
                      className="cursor-pointer accent-[#5fb7b9]"
                      onChange={() => {
                        toggle(label, "model");
                      }}
                      type="checkbox"
                    />
                    {modelCount > 0 && (
                      <span className="font-mono text-[#4c7372] text-[10px]">
                        {modelCount}
                      </span>
                    )}
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Build default FilterState (all visible) */
export function buildDefaultFilters(): FilterState {
  const state: FilterState = {};
  for (const label of ALL_LABELS) {
    state[label] = { human: true, model: true };
  }
  return state;
}
