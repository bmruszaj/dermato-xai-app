"use client";

import NextImage from "next/image";
import Link from "next/link";
import React, { useCallback, useRef, useState } from "react";
import type { AnnotatorHandle } from "@/components/annotate/AnnotationCanvas";
import { AnnotationCanvas } from "@/components/annotate/AnnotationCanvas";
import type { EntryType } from "@/components/annotate/BBoxAnnotator";
import { FeedbackPanel } from "@/components/annotate/FeedbackPanel";
import { UploadZone } from "@/components/annotate/UploadZone";
import { getClassColor, getLabelDisplay } from "@/lib/annotate/classColors";
import { compareAnnotations } from "@/lib/annotate/compare";
import {
  ANNOTATION_LABELS,
  type AnnotationBox,
  type AnnotationLabel,
  type AnnotationPhase,
  BLUE_GRAY_GLOBULES_CLASS,
  type ComparisonResult,
  MODEL_CLASS,
  type ModelPrediction,
} from "@/lib/annotate/types";
import logoIcon from "../../../dermato-xai-icon-512.png";

type MlStatus = "idle" | "loading" | "done" | "error";
const DEFAULT_PREDICTION_LABELS: AnnotationLabel[] = [
  MODEL_CLASS,
  BLUE_GRAY_GLOBULES_CLASS,
].filter((label) => ANNOTATION_LABELS.includes(label));

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
      color: "border-[#e4b65a]/40 bg-[#fff7df] text-[#8a6318]",
      text: "Model analizuje obraz...",
      spin: true,
    },
    done: {
      color: "border-[#5fb7b9]/40 bg-[#eef8f8] text-[#0b7975]",
      text: `Model gotowy — ${predCount} detekcj${predCount === 1 ? "a" : "i"}`,
      spin: false,
    },
    error: {
      color: "border-[#f0b8ad] bg-[#fff1ef] text-[#9b3f34]",
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            fill="currentColor"
          />
        </svg>
      )}
      {cfg.text}
    </div>
  );
}

function PredictionClassSelector({
  selectedLabels,
  onToggle,
}: {
  selectedLabels: AnnotationLabel[];
  onToggle: (label: AnnotationLabel) => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#b9e2e1] bg-[#eef8f8] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-bold text-[#0d4a48] text-sm">
            Klasy predykcji modelu
          </h3>
          <p className="mt-1 text-[#4c7372] text-xs leading-5">
            Domyślnie pytamy model o Yellow globules i Blue-gray globules.
            Możesz włączyć dodatkowe struktury przed wyborem obrazu.
          </p>
        </div>
        <p className="font-bold text-[#0b7975] text-xs">
          {selectedLabels.length} z {ANNOTATION_LABELS.length} aktywne
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {ANNOTATION_LABELS.map((label) => {
          const active = selectedLabels.includes(label);
          const color = getClassColor(label);
          return (
            <button
              aria-pressed={active}
              className={`inline-flex touch-manipulation items-center gap-2 rounded-full border px-3 py-2 font-bold text-xs transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5fb7b9] ${
                active
                  ? "border-[#5fb7b9] bg-white text-[#0d4a48] shadow-sm"
                  : "border-[#b9e2e1] bg-white/50 text-[#4c7372] opacity-75"
              }`}
              key={label}
              onClick={() => onToggle(label)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              {getLabelDisplay(label)}
            </button>
          );
        })}
      </div>
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
  const [selectedPredictionLabels, setSelectedPredictionLabels] = useState<
    AnnotationLabel[]
  >(
    DEFAULT_PREDICTION_LABELS.length > 0
      ? DEFAULT_PREDICTION_LABELS
      : [ANNOTATION_LABELS[0]]
  );

  // Holds the in-flight ML promise so submit can await it
  const mlPromiseRef = useRef<Promise<ModelPrediction[]> | null>(null);
  const annotatorRef = useRef<AnnotatorHandle>(null);

  // ─── Image upload ───────────────────────────────────────────────────────────
  const handleImageReady = useCallback(
    (dataUri: string) => {
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
        body: JSON.stringify({
          imageBase64: dataUri,
          predictionLabels: selectedPredictionLabels,
        }),
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
    },
    [selectedPredictionLabels]
  );

  const togglePredictionLabel = useCallback((label: AnnotationLabel) => {
    setSelectedPredictionLabels((current) => {
      if (current.includes(label)) {
        return current.length === 1
          ? current
          : current.filter((selected) => selected !== label);
      }
      return [...current, label];
    });
  }, []);

  const resetPredictionLabels = useCallback(() => {
    setSelectedPredictionLabels(
      DEFAULT_PREDICTION_LABELS.length > 0
        ? DEFAULT_PREDICTION_LABELS
        : [ANNOTATION_LABELS[0]]
    );
  }, []);

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
    resetPredictionLabels();
  }, [resetPredictionLabels]);

  const handleAdjust = useCallback(() => {
    setPhase("annotating");
    setSubmitError(null);
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

        const data = (await res.json()) as {
          feedback?: string;
          error?: string;
        };

        if (!res.ok || data.error) {
          throw new Error(data.error ?? `Feedback API error ${res.status}`);
        }

        setFeedback(data.feedback ?? "");
      } catch (feedbackErr: unknown) {
        const msg =
          feedbackErr instanceof Error
            ? feedbackErr.message
            : String(feedbackErr);
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

  // ─── ML Status badge ─────────────────────────────────────────────────────────

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f6fb] text-[#0d4a48]">
      <div
        aria-hidden="true"
        className="pointer-events-none -left-24 -top-28 absolute h-72 w-96 rounded-[45%_0_70%_50%] bg-[#a9dada]/55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none -right-28 top-8 absolute h-64 w-96 rounded-[0_45%_50%_70%] bg-[#a9dada]/45"
      />

      {/* Header */}
      <header className="relative z-10 px-4 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-[2rem] border border-[#b9e2e1] bg-white/90 px-4 py-4 shadow-[0_18px_55px_rgba(69,151,153,0.16)] backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(95,183,185,0.35)]"
              href="/"
            >
              <NextImage
                alt="Logo DermatoAI"
                className="size-full object-cover"
                height={48}
                priority
                src={logoIcon}
                width={48}
              />
            </Link>
            <div>
              <h1 className="font-bold text-[#0d4a48] text-xl">
                Anotacja dermoskopowa
              </h1>
              <p className="font-medium text-[#4c7372] text-sm">
                Zaznacz struktury i porównaj wynik z modelem AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
                          ? "bg-[#5fb7b9] text-white shadow-sm"
                          : done
                            ? "bg-[#eef8f8] text-[#0b7975]"
                            : "text-[#4c7372]/50"
                      }`}
                    >
                      {label}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="text-[#4c7372]/35">›</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* ── UPLOAD phase ── */}
        {phase === "upload" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="font-bold text-[#5fb7b9] text-sm uppercase tracking-[0.2em]">
                Publiczne demo
              </p>
              <h2 className="font-bold text-3xl text-[#0d4a48]">
                Wybierz obraz do demo
              </h2>
              <p className="mx-auto max-w-2xl font-medium text-[#4c7372] leading-7">
                Skorzystaj z przykładu albo wgraj własny obraz dermoskopowy.
                Model AI rozpocznie analizę automatycznie po wyborze obrazu.
              </p>
            </div>
            <div className="grid gap-3 rounded-[2rem] border border-[#b9e2e1] bg-white p-4 text-sm shadow-[0_14px_40px_rgba(69,151,153,0.12)] md:grid-cols-4">
              {[
                "Wybierz obraz",
                "Zaznacz struktury",
                "Zatwierdź anotacje",
                "Porównaj wynik",
              ].map((step, index) => (
                <div className="flex items-center gap-3" key={step}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#5fb7b9] font-bold text-white text-xs shadow-sm">
                    {index + 1}
                  </span>
                  <span className="font-medium text-[#4c7372]">{step}</span>
                </div>
              ))}
            </div>
            <PredictionClassSelector
              onToggle={togglePredictionLabel}
              selectedLabels={selectedPredictionLabels}
            />
            <UploadZone onImageReady={handleImageReady} />
          </div>
        )}

        {/* ── ANNOTATING phase ── */}
        {phase === "annotating" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-bold text-[#5fb7b9] text-sm uppercase tracking-[0.2em]">
                  Krok 2
                </p>
                <h2 className="font-bold text-2xl text-[#0d4a48]">
                  Adnotuj obraz
                </h2>
                <p className="max-w-3xl font-medium text-[#4c7372] text-sm leading-7">
                  Wybierz klasę, kliknij pierwszy róg struktury, a potem drugi.
                  Dostępne etykiety odpowiadają klasom wybranym w poprzednim
                  kroku.
                </p>
              </div>
              <MlStatusBadge
                predCount={mlPredictions.length}
                status={mlStatus}
              />
            </div>

            <div className="overflow-hidden rounded-[2rem] border-8 border-white bg-white shadow-[0_24px_70px_rgba(69,151,153,0.2)]">
              <AnnotationCanvas
                imageUrl={imageDataUri}
                labels={selectedPredictionLabels}
                onChange={handleAnnotationChange}
                ref={annotatorRef}
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="font-medium text-[#4c7372] text-sm">
                {userAnnotations.length === 0
                  ? "Brak anotacji"
                  : `${userAnnotations.length} anotacj${userAnnotations.length === 1 ? "a" : "i"}`}
              </div>
              <div className="flex gap-3">
                <button
                  className="rounded-full border border-[#b9e2e1] bg-white px-5 py-2.5 font-bold text-[#0d4a48] text-sm transition-transform hover:-translate-y-0.5 hover:bg-[#eef8f8]"
                  onClick={handleRetry}
                  type="button"
                >
                  Zmień obraz
                </button>
                <button
                  className="rounded-full bg-[#5fb7b9] px-6 py-2.5 font-bold text-sm text-white shadow-[0_12px_30px_rgba(95,183,185,0.3)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={submitting || userAnnotations.length === 0}
                  onClick={handleSubmit}
                  type="button"
                >
                  Zatwierdź anotacje
                </button>
              </div>
            </div>

            {submitError && (
              <div className="rounded-[1.25rem] border border-[#f0b8ad] bg-[#fff1ef] p-4 text-[#9b3f34] text-sm">
                {submitError}
              </div>
            )}

            {mlError && (
              <div className="rounded-[1.25rem] border border-[#e4b65a]/45 bg-[#fff7df] p-4 text-[#8a6318] text-sm">
                <strong>Uwaga:</strong> {mlError}. Feedback zostanie
                wygenerowany bez porównania z modelem.
              </div>
            )}
          </div>
        )}

        {/* ── SUBMITTING phase — brief wait for ML predictions ── */}
        {phase === "submitting" && (
          <div className="w-full space-y-6 animate-pulse">
            <p className="text-center font-medium text-[#4c7372] text-sm">
              Czekam na predykcje modelu...
            </p>
            {/* Mirror the two-column feedback layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left column — image + stats skeleton */}
              <div className="space-y-4">
                <div className="space-y-4 rounded-[2rem] border border-[#b9e2e1] bg-white p-6 shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
                  <div className="h-4 w-1/2 rounded bg-[#d6eeee]" />
                  {/* Image placeholder */}
                  <div className="aspect-video w-full rounded-[1.25rem] bg-[#eef8f8]" />
                </div>
                {/* Stats card */}
                <div className="space-y-4 rounded-[2rem] border border-[#b9e2e1] bg-white p-6 shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
                  <div className="h-4 w-1/3 rounded bg-[#d6eeee]" />
                  <div className="grid grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div
                        className="h-16 rounded-[1rem] bg-[#eef8f8]"
                        key={i}
                      />
                    ))}
                  </div>
                  <div className="space-y-2 border-[#b9e2e1] border-t pt-4">
                    <div className="h-3 w-full rounded bg-[#d6eeee]" />
                    <div className="h-3 w-5/6 rounded bg-[#d6eeee]" />
                    <div className="h-3 w-4/5 rounded bg-[#d6eeee]" />
                  </div>
                </div>
              </div>
              {/* Right column — feedback skeleton */}
              <div className="space-y-4 rounded-[2rem] border border-[#b9e2e1] bg-white p-6 shadow-[0_14px_40px_rgba(69,151,153,0.12)]">
                <div className="h-4 w-2/5 rounded border-[#b9e2e1] border-b bg-[#d6eeee] pb-3" />
                <div className="space-y-2 pt-1">
                  <div className="h-4 w-2/3 rounded bg-[#d6eeee]" />
                  <div className="h-3 rounded bg-[#d6eeee]" />
                  <div className="h-3 w-11/12 rounded bg-[#d6eeee]" />
                  <div className="h-3 w-4/5 rounded bg-[#d6eeee]" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 w-1/2 rounded bg-[#d6eeee]" />
                  <div className="h-3 w-full rounded bg-[#d6eeee]" />
                  <div className="h-3 w-10/12 rounded bg-[#d6eeee]" />
                  <div className="h-3 w-3/4 rounded bg-[#d6eeee]" />
                  <div className="h-3 w-11/12 rounded bg-[#d6eeee]" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 w-3/5 rounded bg-[#d6eeee]" />
                  <div className="h-3 w-full rounded bg-[#d6eeee]" />
                  <div className="h-3 w-5/6 rounded bg-[#d6eeee]" />
                  <div className="h-3 w-4/5 rounded bg-[#d6eeee]" />
                </div>
              </div>
            </div>
            {/* Actions skeleton */}
            <div className="flex gap-3">
              <div className="h-10 flex-1 rounded-full bg-[#d6eeee]" />
              <div className="h-10 flex-1 rounded-full bg-[#d6eeee]" />
            </div>
          </div>
        )}

        {/* ── FEEDBACK phase ── */}
        {phase === "feedback" && comparison && (
          <FeedbackPanel
            comparison={comparison}
            feedback={feedback}
            feedbackLoading={feedbackLoading}
            imageDataUri={imageDataUri}
            onAdjust={handleAdjust}
            onRetry={handleRetry}
            submitError={submitError}
          />
        )}
      </main>
    </div>
  );
}
