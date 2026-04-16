"use client";

import type { ComparisonResult } from "@/lib/annotate/types";
import { ComparisonOverlay } from "./ComparisonOverlay";
import { ComparisonStats } from "./ComparisonStats";

interface FeedbackPanelProps {
  feedback: string;
  feedbackLoading: boolean;
  comparison: ComparisonResult;
  imageDataUri: string;
  submitError?: string | null;
  onRetry: () => void;
  onAdjust: () => void;
}

function FeedbackSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Section header skeleton */}
      <div className="h-4 bg-muted rounded w-2/3" />
      {/* Paragraph block 1 */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-11/12" />
        <div className="h-3 bg-muted rounded w-4/5" />
      </div>
      {/* Section header skeleton */}
      <div className="h-4 bg-muted rounded w-1/2 mt-2" />
      {/* Paragraph block 2 */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-10/12" />
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-11/12" />
      </div>
      {/* Section header skeleton */}
      <div className="h-4 bg-muted rounded w-3/5 mt-2" />
      {/* Paragraph block 3 */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-4/5" />
      </div>
    </div>
  );
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
  const paragraphs = feedback
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`bold-${j}`}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Left: Comparison ── */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              Porównanie adnotacji
            </h3>
            <ComparisonOverlay
              comparison={comparison}
              imageDataUri={imageDataUri}
            />
          </section>
          <ComparisonStats comparison={comparison} />
        </div>

        {/* ── Right: Feedback ── */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground border-b border-border pb-3">
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

                return isHeader ? (
                  <h3
                    className="text-sm font-semibold text-foreground mt-4 mb-1"
                    key={`h-${i}`}
                  >
                    {renderInline(cleanText)}
                  </h3>
                ) : (
                  <p
                    className="text-sm text-foreground/90 leading-relaxed"
                    key={`p-${i}`}
                  >
                    {renderInline(paragraph)}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={onAdjust}
          type="button"
        >
          Popraw adnotacje
        </button>
        <button
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={onRetry}
          type="button"
        >
          Zacznij od nowa
        </button>
      </div>
    </div>
  );
}
