"use client";

import { useRef, useState } from "react";
import { CloudUpload, FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, MAX_RESUME_BYTES } from "@/lib/utils";

const ERROR_MESSAGES = {
  type: "That file is not a PDF. Upload your resume as a PDF.",
  size: "That file is larger than 5MB. Upload a smaller PDF.",
} as const;

function formatSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;

  if (megabytes >= 0.1) {
    return `${megabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ResumeUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function acceptFile(candidate: File | undefined): void {
    if (!candidate) {
      return;
    }

    if (candidate.type !== "application/pdf") {
      setFile(null);
      setError(ERROR_MESSAGES.type);
      return;
    }

    if (candidate.size > MAX_RESUME_BYTES) {
      setFile(null);
      setError(ERROR_MESSAGES.size);
      return;
    }

    setError(null);
    setFile(candidate);
  }

  function clearFile(): void {
    setFile(null);
    setError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-base font-semibold text-text-primary">Resume</h2>
      <p className="mt-1 text-sm leading-6 text-text-secondary">
        Upload an existing resume to auto-fill your profile, or generate a fresh
        one from the details below.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />

      {file ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-3">
          <FileText aria-hidden className="size-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {file.name}
            </p>
            <p className="text-xs text-text-muted">
              {formatSize(file.size)} — not uploaded yet
            </p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="grid size-8 shrink-0 place-items-center rounded-md text-text-secondary transition-colors hover:bg-border-light hover:text-text-primary focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
          >
            <X aria-hidden className="size-4" />
            <span className="sr-only">Remove {file.name}</span>
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            acceptFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-border bg-surface-secondary px-6 py-10 text-center transition-colors",
            isDragging && "border-accent bg-accent-muted",
          )}
        >
          <span className="grid size-12 place-items-center rounded-full border border-border bg-surface text-accent shadow-sm">
            <CloudUpload aria-hidden className="size-5" />
          </span>
          <p className="mt-4 text-sm font-semibold text-text-primary">
            Click to upload or drag and drop
          </p>
          <p className="mt-1 text-xs text-text-muted">
            PDF only. Maximum file size 5MB.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-5 shadow-sm"
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Select Resume
          </Button>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-text-primary"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          Need a fresh document based on the fields below?
        </p>
        <Button type="button" className="sm:shrink-0">
          <FileText aria-hidden className="size-4" />
          Generate Resume from Profile
        </Button>
      </div>
    </section>
  );
}
