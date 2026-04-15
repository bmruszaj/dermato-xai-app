"use client";

import React, { useRef, useState } from "react";

interface UploadZoneProps {
  onImageReady: (dataUri: string) => void;
}

export function UploadZone({ onImageReady }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onImageReady(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center w-full min-h-64 rounded-xl border-2 border-dashed transition-colors cursor-pointer select-none ${
        dragging
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/60 hover:bg-muted/40"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {preview ? (
        <div className="flex flex-col items-center gap-3 p-4">
          {/* biome-ignore lint/performance/noImgElement: data URI preview thumbnail */}
          <img
            src={preview}
            alt="Podgląd wgranego obrazu"
            className="max-h-48 max-w-full rounded-lg object-contain shadow-md"
          />
          <p className="text-sm text-muted-foreground">
            Kliknij aby zmienić obraz
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-7 w-7 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              Przeciągnij obraz lub kliknij aby wybrać
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PNG, JPG, WEBP — obraz dermoskopowy
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
