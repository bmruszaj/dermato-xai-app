"use client";

import React, { useCallback, useRef, useState } from "react";
import { UploadZone } from "@/components/annotate/UploadZone";
import { AnnotationCanvas } from "@/components/annotate/AnnotationCanvas";
import type { AnnotatorHandle } from "@/components/annotate/AnnotationCanvas";
import { FeedbackPanel } from "@/components/annotate/FeedbackPanel";
import { compareAnnotations } from "@/lib/annotate/compare";
import type {
  AnnotationBox,
  AnnotationPhase,
  ComparisonResult,
  ModelPrediction,
} from "@/lib/annotate/types";
import type { EntryType } from "@/components/annotate/BBoxAnnotator";

type MlStatus = "idle" | "loading" | "done" | "error";

function MlStatusBadge({
  status,
  predCount,
}: {
  status: MlStatus;
  predCount: number;
}) {
  if (status === "idle") return null;
  const configs = {
    loading: {
      color:
        "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
      text: "Model analizuje obraz...",
      spin: true,
    },
    done: {
      color:
        "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
      text: `Model gotowy — ${predCount} detekcj${predCount === 1 ? "a" : "i"}`,
      spin: false,
    },
    error: {
      color:
        "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
      text: "Błąd ML (porównanie bez modelu)",
      spin: false,
    },
  } as const;
  const cfg = configs[status as keyof typeof configs];
  if (!cfg) return null;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${cfg.color}`}
    >
      {cfg.spin && (
        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {cfg.text}
    </div>
  );
}

export default function AnnotatePage() {
  const [phase, setPhase] = useState<AnnotationPhase>("upload");
  const [imageDataUri, setImageDataUri] = useState<string>("");
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 1, height: 1 });
  const [userAnnotations, setUserAnnotations] = useState<AnnotationBox[]>([]);
  const [mlStatus, setMlStatus] = useState<MlStatus>("idle");
  const [mlPredictions, setMlPredictions] = useState<ModelPrediction[]>([]);
  const [mlError, setMlError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Holds the in-flight ML promise so submit can await it
  const mlPromiseRef = useRef<Promise<ModelPrediction[]> | null>(null);
  const annotatorRef = useRef<AnnotatorHandle>(null);

  // ─── Image upload ───────────────────────────────────────────────────────────
  const handleImageReady = useCallback((dataUri: string) => {
    setImageDataUri(dataUri);
    setUserAnnotations([]);
    setMlPredictions([]);
    setMlError(null);
    setSubmitError(null);

    // Measure actual image dimensions for IoU conversion
    const img = new Image();
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = dataUri;

    // Fire ML inference in background
    setMlStatus("loading");
    const mlPromise = fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: dataUri }),
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          predictions: ModelPrediction[];
          error?: string;
        };
        if (data.error) {
          setMlError(data.error);
          setMlStatus("error");
          return [] as ModelPrediction[];
        }
        const preds = data.predictions ?? [];
        setMlPredictions(preds);
        setMlStatus("done");
        return preds;
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setMlError(msg);
        setMlStatus("error");
        return [] as ModelPrediction[];
      });

    mlPromiseRef.current = mlPromise;
    setPhase("annotating");
  }, []);

  // ─── Annotation changes ──────────────────────────────────────────────────────
  const handleAnnotationChange = useCallback((entries: EntryType[]) => {
    setUserAnnotations(entries as AnnotationBox[]);
  }, []);

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    setPhase("submitting");

    try {
      // Await ML result (may already be done, or may still be in-flight)
      const predictions =
        mlStatus === "done"
          ? mlPredictions
          : mlPromiseRef.current
            ? await mlPromiseRef.current
            : [];

      const comparisonResult: ComparisonResult = compareAnnotations(
        userAnnotations,
        predictions,
        imageDimensions
      );

      // Show comparison immediately — switch to feedback phase right away
      setComparison(comparisonResult);
      setFeedback("");
      setFeedbackLoading(true);
      setPhase("feedback");
      setSubmitting(false);

      // Fetch Clarin feedback in background
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comparison: comparisonResult }),
        });

        const data = (await res.json()) as { feedback?: string; error?: string };

        if (!res.ok || data.error) {
          throw new Error(data.error ?? `Feedback API error ${res.status}`);
        }

        setFeedback(data.feedback ?? "");
      } catch (feedbackErr: unknown) {
        const msg = feedbackErr instanceof Error ? feedbackErr.message : String(feedbackErr);
        setSubmitError(msg);
      } finally {
        setFeedbackLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg);
      setPhase("annotating");
      setSubmitting(false);
    }
  }, [mlStatus, mlPredictions, userAnnotations, imageDimensions]);

  // ─── Retry / Adjust ──────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setPhase("upload");
    setImageDataUri("");
    setUserAnnotations([]);
    setMlPredictions([]);
    setMlStatus("idle");
    setMlError(null);
    setComparison(null);
    setFeedback("");
    setFeedbackLoading(false);
    setSubmitError(null);
    mlPromiseRef.current = null;
  }, []);

  const handleAdjust = useCallback(() => {
    setPhase("annotating");
    setSubmitError(null);
  }, []);

  // ─── ML Status badge ─────────────────────────────────────────────────────────

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Adnotacja dermoskopowa
            </h1>
            <p className="text-sm text-muted-foreground">
              Zaznacz zmiany skórne i otrzymaj feedback od AI
            </p>
          </div>
          {/* Progress steps */}
          <div className="hidden sm:flex items-center gap-1 text-xs">
            {(
              [
                { key: "upload", label: "1. Wgraj" },
                { key: "annotating", label: "2. Adnotuj" },
                { key: "submitting", label: "3. Analiza" },
                { key: "feedback", label: "4. Feedback" },
              ] as const
            ).map(({ key, label }, i, arr) => {
              const phases: AnnotationPhase[] = [
                "upload",
                "annotating",
                "submitting",
                "feedback",
              ];
              const currentIdx = phases.indexOf(phase);
              const stepIdx = phases.indexOf(key);
              const active = currentIdx === stepIdx;
              const done = currentIdx > stepIdx;
              return (
                <React.Fragment key={key}>
                  <span
                    className={`px-2 py-1 rounded-md font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40"
                    }`}
                  >
                    {label}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="text-muted-foreground/30">›</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* ── UPLOAD phase ── */}
        {phase === "upload" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Wgraj obraz</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Wgraj obraz dermoskopowy, który chcesz opatrzyć adnotacjami.
                Model AI rozpocznie analizę automatycznie.
              </p>
            </div>
            <UploadZone onImageReady={handleImageReady} />
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-medium mb-2">Dostępne klasy:</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  "Rosettes",
                  "Milia-like-cyst",
                  "Blue-gray globules",
                  "MAY globules",
                  "Yellow globlues (ulcer)",
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ANNOTATING phase ── */}
        {phase === "annotating" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-semibold">Adnotuj obraz</h2>
                <p className="text-sm text-muted-foreground">
                  Przeciągnij prostokąty na zmianach skórnych i przypisz klasy.
                  Podwójne kliknięcie pozwala zmienić etykietę.
                </p>
              </div>
              <MlStatusBadge
                status={mlStatus}
                predCount={mlPredictions.length}
              />
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <AnnotationCanvas
                imageUrl={imageDataUri}
                onChange={handleAnnotationChange}
                ref={annotatorRef}
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-muted-foreground">
                {userAnnotations.length === 0
                  ? "Brak adnotacji"
                  : `${userAnnotations.length} adnotacj${userAnnotations.length === 1 ? "a" : "i"}`}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Zmień obraz
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || userAnnotations.length === 0}
                  className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zatwierdź adnotacje
                </button>
              </div>
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 p-3 text-sm text-red-700 dark:text-red-400">
                {submitError}
              </div>
            )}

            {mlError && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/40 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                <strong>Uwaga:</strong> {mlError}. Feedback zostanie
                wygenerowany bez porównania z modelem.
              </div>
            )}
          </div>
        )}

        {/* ── SUBMITTING phase — brief wait for ML predictions ── */}
        {phase === "submitting" && (
          <div className="w-full space-y-6 animate-pulse">
            <p className="text-sm text-muted-foreground text-center">
              Czekam na predykcje modelu...
            </p>
            {/* Mirror the two-column feedback layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left column — image + stats skeleton */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  {/* Image placeholder */}
                  <div className="w-full aspect-video bg-muted rounded-lg" />
                </div>
                {/* Stats card */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="grid grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded-lg" />
                    ))}
                  </div>
                  <div className="space-y-2 border-t border-border pt-4">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-5/6" />
                    <div className="h-3 bg-muted rounded w-4/5" />
                  </div>
                </div>
              </div>
              {/* Right column — feedback skeleton */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="h-4 bg-muted rounded w-2/5 border-b border-border pb-3" />
                <div className="space-y-2 pt-1">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-11/12" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-10/12" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-11/12" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 bg-muted rounded w-3/5" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                </div>
              </div>
            </div>
            {/* Actions skeleton */}
            <div className="flex gap-3">
              <div className="flex-1 h-10 bg-muted rounded-lg" />
              <div className="flex-1 h-10 bg-muted rounded-lg" />
            </div>
          </div>
        )}

        {/* ── FEEDBACK phase ── */}
        {phase === "feedback" && comparison && (
          <FeedbackPanel
            feedback={feedback}
            feedbackLoading={feedbackLoading}
            comparison={comparison}
            imageDataUri={imageDataUri}
            onRetry={handleRetry}
            onAdjust={handleAdjust}
            submitError={submitError}
          />
        )}
      </main>
    </div>
  );
}
