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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      <h3 className="text-base font-semibold text-foreground">
        Dane porównania
      </h3>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          value={matched.length}
          label="Dopasowane"
          color="text-green-600 dark:text-green-400"
          bg="bg-green-500/10"
        />
        <StatCard
          value={userOnlyYellow.length}
          label="Tylko użytkownik"
          color="text-orange-600 dark:text-orange-400"
          bg="bg-orange-500/10"
        />
        <StatCard
          value={modelOnlyYellow.length}
          label="Tylko model"
          color="text-red-600 dark:text-red-400"
          bg="bg-red-500/10"
        />
        <StatCard
          value={otherUserAnnotations.length}
          label="Inne klasy"
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-500/10"
        />
      </div>

      {/* IoU + totals */}
      <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-4">
        <div className="flex justify-between">
          <span>Próg IoU</span>
          <span className="font-mono font-medium text-foreground">0.30</span>
        </div>
        <div className="flex justify-between">
          <span>Łącznie adnotacji użytkownika (Yellow globules)</span>
          <span className="font-mono font-medium text-foreground">
            {totalUserYellow}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Łącznie detekcji modelu</span>
          <span className="font-mono font-medium text-foreground">
            {totalModel}
          </span>
        </div>
        {avgIou !== null && (
          <div className="flex justify-between">
            <span>Średnie IoU dopasowanych par</span>
            <span className="font-mono font-medium text-foreground">
              {avgIou.toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {/* Matched pairs detail */}
      {matched.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Dopasowane pary
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
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
              <tbody className="divide-y divide-border">
                {matched.map((m, i) => (
                  <tr key={`match-${i}`} className="bg-background">
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-3 py-1.5">{m.userBox.label}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-green-600 dark:text-green-400">
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Yellow globules użytkownika — brak dopasowania modelu
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-right font-medium">Left</th>
                  <th className="px-3 py-2 text-right font-medium">Top</th>
                  <th className="px-3 py-2 text-right font-medium">W</th>
                  <th className="px-3 py-2 text-right font-medium">H</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {userOnlyYellow.map((b, i) => (
                  <tr key={`user-only-${i}`} className="bg-background">
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {i + 1}
                    </td>
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Detekcje modelu — brak adnotacji użytkownika
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-right font-medium">X%</th>
                  <th className="px-3 py-2 text-right font-medium">Y%</th>
                  <th className="px-3 py-2 text-right font-medium">W%</th>
                  <th className="px-3 py-2 text-right font-medium">H%</th>
                  <th className="px-3 py-2 text-right font-medium">Pewność</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modelOnlyYellow.map((p, i) => (
                  <tr key={`model-only-${i}`} className="bg-background">
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {i + 1}
                    </td>
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
    <div className={`rounded-lg p-3 ${bg} flex flex-col items-center gap-1`}>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}
