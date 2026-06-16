"use client";

import type React from "react";
import { useState } from "react";
import { DEMO_IMAGES, type DemoImage } from "@/lib/annotate/demoImages";

interface UploadZoneProps {
  onImageReady: (dataUri: string) => void;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const FILE_INPUT_ID = "dermato-image-upload";

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") {
        reject(new Error("Nie udało się odczytać obrazu."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => {
      reject(new Error("Nie udało się odczytać obrazu."));
    };
    reader.readAsDataURL(blob);
  });
}

export function UploadZone({ onImageReady }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setReadyImage = (dataUri: string) => {
    setPreview(dataUri);
    setError(null);
    onImageReady(dataUri);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Wybierz plik graficzny w formacie PNG, JPG albo WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Obraz jest za duży. Maksymalny rozmiar to 10 MB.");
      return;
    }
    const dataUri = await blobToDataUri(file);
    setReadyImage(dataUri);
  };

  const handleSampleSelect = async (image: DemoImage) => {
    setLoadingSampleId(image.id);
    setError(null);
    try {
      const response = await fetch(`${BASE_PATH}${image.src}`);
      if (!response.ok) {
        throw new Error("Nie udało się pobrać przykładowego obrazu.");
      }
      const dataUri = await blobToDataUri(await response.blob());
      setReadyImage(dataUri);
    } catch (sampleError) {
      const message =
        sampleError instanceof Error
          ? sampleError.message
          : "Nie udało się pobrać przykładowego obrazu.";
      setError(message);
    } finally {
      setLoadingSampleId(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-3 font-bold text-[#0d4a48] text-sm">
          Wybierz obraz przykładowy
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {DEMO_IMAGES.map((image) => (
            <button
              className="group touch-manipulation rounded-[1.5rem] border border-[#b9e2e1] bg-white p-3 text-left shadow-[0_14px_40px_rgba(69,151,153,0.12)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5fb7b9]"
              disabled={loadingSampleId !== null}
              key={image.id}
              onClick={() => {
                void handleSampleSelect(image);
              }}
              onPointerUp={(event) => {
                if (event.pointerType !== "touch" || loadingSampleId !== null) {
                  return;
                }
                event.preventDefault();
                void handleSampleSelect(image);
              }}
              type="button"
            >
              <span className="block overflow-hidden rounded-[1.1rem] border border-[#d6eeee] bg-[#eef8f8]">
                {/* biome-ignore lint/performance/noImgElement: public demo thumbnails are static and tiny */}
                <img
                  alt={image.title}
                  className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                  src={`${BASE_PATH}${image.src}`}
                />
              </span>
              <span className="mt-3 block font-medium text-sm">
                {image.title}
              </span>
              <span className="mt-1 block text-[#4c7372] text-xs leading-5">
                {loadingSampleId === image.id
                  ? "Ładowanie obrazu..."
                  : image.description}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[#4c7372] text-xs">
          Obrazy przykładowe służą wyłącznie do demonstracji działania
          interfejsu i modeli.
        </p>
      </div>

      <label
        className={`flex min-h-64 w-full cursor-pointer select-none flex-col items-center justify-center rounded-[2rem] border-2 border-dashed bg-white transition-colors shadow-[0_14px_40px_rgba(69,151,153,0.12)] ${
          dragging
            ? "border-[#5fb7b9] bg-[#eef8f8]"
            : "border-[#b9e2e1] hover:border-[#5fb7b9] hover:bg-[#f7ffff]"
        } touch-manipulation`}
        htmlFor={FILE_INPUT_ID}
        onDragLeave={() => setDragging(false)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDrop={handleDrop}
      >
        <input
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          id={FILE_INPUT_ID}
          onChange={handleChange}
          type="file"
        />

        {preview ? (
          <div className="flex flex-col items-center gap-3 p-4">
            {/* biome-ignore lint/performance/noImgElement: data URI preview thumbnail */}
            <img
              alt="Podgląd wybranego obrazu"
              className="max-h-48 max-w-full rounded-[1.25rem] object-contain shadow-md"
              src={preview}
            />
            <p className="font-medium text-[#4c7372] text-sm">
              Kliknij aby zmienić obraz lub wybierz inny przykład powyżej
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef8f8]">
              <svg
                className="h-7 w-7 text-[#5fb7b9]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                />
              </svg>
            </div>
            <div>
              <p className="font-bold text-[#0d4a48] text-base">
                Albo przeciągnij własny obraz
              </p>
              <p className="mt-1 font-medium text-[#4c7372] text-sm">
                PNG, JPG, WEBP · maksymalnie 10 MB
              </p>
            </div>
          </div>
        )}
      </label>

      {error ? (
        <div className="rounded-[1.25rem] border border-[#f0b8ad] bg-[#fff1ef] p-4 text-[#9b3f34] text-sm">
          {error}
        </div>
      ) : (
        <p className="font-medium text-[#4c7372] text-xs">
          Demo nie wymaga konta. Nie przesyłaj obrazów zawierających dane
          identyfikujące pacjenta.
        </p>
      )}
    </div>
  );
}
