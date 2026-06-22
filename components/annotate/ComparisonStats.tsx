"use client";

import type { ComparisonResult } from "@/lib/annotate/types";

interface ComparisonStatsProps {
  comparison: ComparisonResult;
}

export function ComparisonStats({ comparison }: ComparisonStatsProps) {
  const { matched, userOnlyYellow, modelOnlyYellow, otherUserAnnotations } =
    comparison;

  const totalUserYellow = matched.length + userOnlyYellow.length;
  const totalModel = matched.length + modelOnlyYellow.length;
  const avgIou =
    matched.length > 0
      ? matched.reduce((sum, m) => sum + m.iou, 0) / matched.length
      : null;

  return (
    <div className="space-y-5 rounded-[2rem] border border-[#b9e2e1] bg-white p-6 shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
      <h3 className="font-bold text-[#0d4a48] text-base">Dane porównania</h3>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          bg="bg-green-500/10"
          color="text-green-600"
          label="Dopasowane"
          value={matched.length}
        />
        <StatCard
          bg="bg-orange-500/10"
          color="text-orange-600"
          label="Tylko użytkownik"
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
          value={otherUserAnnotations.length}
        />
      </div>

      {/* IoU + totals */}
      <div className="space-y-1 border-[#b9e2e1] border-t pt-4 text-[#4c7372] text-xs">
        <div className="flex justify-between">
          <span>Próg IoU</span>
          <span className="font-medium font-mono text-[#0d4a48]">0.30</span>
        </div>
        <div className="flex justify-between">
          <span>Łącznie anotacji użytkownika (Yellow globules)</span>
          <span className="font-medium font-mono text-[#0d4a48]">
            {totalUserYellow}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Łącznie detekcji modelu</span>
          <span className="font-medium font-mono text-[#0d4a48]">
            {totalModel}
          </span>
        </div>
        {avgIou !== null && (
          <div className="flex justify-between">
            <span>Średnie IoU dopasowanych par</span>
            <span className="font-medium font-mono text-[#0d4a48]">
              {avgIou.toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {/* Matched pairs detail */}
      {matched.length > 0 && (
        <div className="space-y-2">
          <p className="font-bold text-[#4c7372] text-xs uppercase tracking-wide">
            Dopasowane pary
          </p>
          <div className="overflow-hidden rounded-[1.25rem] border border-[#b9e2e1]">
            <table className="w-full text-xs">
              <thead className="bg-[#eef8f8]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Etykieta użytkownika
                  </th>
                  <th className="px-3 py-2 text-right font-medium">IoU</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Pewność modelu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d6eeee]">
                {matched.map((m, i) => (
                  <tr className="bg-white" key={`match-${i}`}>
                    <td className="px-3 py-1.5 text-[#4c7372]">{i + 1}</td>
                    <td className="px-3 py-1.5">{m.userBox.label}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-green-600">
                      {m.iou.toFixed(3)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {(m.modelBox.confidence * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User-only Yellow globules */}
      {userOnlyYellow.length > 0 && (
        <div className="space-y-2">
          <p className="font-bold text-[#4c7372] text-xs uppercase tracking-wide">
            Yellow globules użytkownika — brak dopasowania modelu
          </p>
          <div className="overflow-hidden rounded-[1.25rem] border border-[#b9e2e1]">
            <table className="w-full text-xs">
              <thead className="bg-[#eef8f8]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-right font-medium">Left</th>
                  <th className="px-3 py-2 text-right font-medium">Top</th>
                  <th className="px-3 py-2 text-right font-medium">W</th>
                  <th className="px-3 py-2 text-right font-medium">H</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d6eeee]">
                {userOnlyYellow.map((b, i) => (
                  <tr className="bg-white" key={`user-only-${i}`}>
                    <td className="px-3 py-1.5 text-[#4c7372]">{i + 1}</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {b.left.toFixed(0)}px
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {b.top.toFixed(0)}px
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {b.width.toFixed(0)}px
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {b.height.toFixed(0)}px
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model-only predictions */}
      {modelOnlyYellow.length > 0 && (
        <div className="space-y-2">
          <p className="font-bold text-[#4c7372] text-xs uppercase tracking-wide">
            Detekcje modelu — brak anotacji użytkownika
          </p>
          <div className="overflow-hidden rounded-[1.25rem] border border-[#b9e2e1]">
            <table className="w-full text-xs">
              <thead className="bg-[#eef8f8]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-right font-medium">X%</th>
                  <th className="px-3 py-2 text-right font-medium">Y%</th>
                  <th className="px-3 py-2 text-right font-medium">W%</th>
                  <th className="px-3 py-2 text-right font-medium">H%</th>
                  <th className="px-3 py-2 text-right font-medium">Pewność</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d6eeee]">
                {modelOnlyYellow.map((p, i) => (
                  <tr className="bg-white" key={`model-only-${i}`}>
                    <td className="px-3 py-1.5 text-[#4c7372]">{i + 1}</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {p.x.toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {p.y.toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {p.width.toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {p.height.toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {(p.confidence * 100).toFixed(1)}%
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
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-center text-[#4c7372] text-xs">{label}</span>
    </div>
  );
}
