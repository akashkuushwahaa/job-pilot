"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, FileText, Sparkles } from "lucide-react";

import { ResumePreview } from "@/components/profile/ResumePreview";
import { Button } from "@/components/ui/button";
import { cn, MAX_RESUME_BYTES } from "@/lib/utils";
import type { ExtractedFormValues } from "@/types";

const ERROR_MESSAGES = {
  type: "That file is not a PDF. Upload your resume as a PDF.",
  size: "That file is larger than 5MB. Upload a smaller PDF.",
  upload: "Could not upload that resume. Please retry.",
  extract: "Could not read your resume. Please retry.",
  generate: "Could not generate your resume. Please retry.",
} as const;

const EXTRACT_SUCCESS =
  "Fields filled from your resume. Review them, then press Save Profile.";

const GENERATE_SUCCESS =
  "Resume generated from your profile. Open it to review.";

// Why the Generate button is unavailable. Generation reads the saved row, so
// both cases are the same problem seen twice: the row is not what the user is
// looking at.
const BLOCKER_MESSAGES = {
  incomplete:
    "Complete your profile before generating — the banner above lists what is still missing.",
  unsaved:
    "Save your profile first. Generating reads your saved details, not what is currently typed in.",
} as const;

type Banner = { kind: "error" | "success"; message: string } | null;

type Props = {
  resumePath: string | null;
  onExtracted: (values: ExtractedFormValues) => void;
  generateBlocker: keyof typeof BLOCKER_MESSAGES | null;
};

export function ResumeUpload({
  resumePath,
  onExtracted,
  generateBlocker,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState<Banner>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<Banner>(null);

  function resetInput(): void {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function uploadFile(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }

    // Shapes the UI only. The route re-checks both — these are not the defence.
    if (file.type !== "application/pdf") {
      setError(ERROR_MESSAGES.type);
      resetInput();
      return;
    }

    if (file.size > MAX_RESUME_BYTES) {
      setError(ERROR_MESSAGES.size);
      resetInput();
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const body = new FormData();
      body.append("resume", file);

      const response = await fetch("/api/resume", { method: "POST", body });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? ERROR_MESSAGES.upload);
        return;
      }

      setIsReplacing(false);
      // A new file makes any previous extraction notice describe a resume that
      // is no longer the stored one.
      setExtractStatus(null);
      // The stored path lives on the server-rendered profile row, so the card
      // only reflects the new file once the page data is refetched.
      router.refresh();
    } catch (uploadError) {
      console.error("[profile/ResumeUpload]", uploadError);
      setError(ERROR_MESSAGES.upload);
    } finally {
      setIsUploading(false);
      resetInput();
    }
  }

  // Sends no body. The route reads whichever resume this session's own row
  // points at, so there is nothing here for a caller to name.
  async function extractFromResume(): Promise<void> {
    setExtractStatus(null);
    setIsExtracting(true);

    try {
      const response = await fetch("/api/resume/extract", { method: "POST" });
      // Not re-validated here on purpose. Unlike a database row, this payload
      // was shaped by lib/resume-extraction's zod schema moments ago and has
      // been nowhere since — the server is the validator.
      const result = await response.json();

      if (!response.ok || !result.success) {
        setExtractStatus({
          kind: "error",
          message: result.error ?? ERROR_MESSAGES.extract,
        });
        return;
      }

      onExtracted(result.data);
      setExtractStatus({ kind: "success", message: EXTRACT_SUCCESS });
    } catch (extractError) {
      console.error("[profile/ResumeUpload] extract", extractError);
      setExtractStatus({ kind: "error", message: ERROR_MESSAGES.extract });
    } finally {
      setIsExtracting(false);
    }
  }

  // Also sends no body — the route reads the caller's own saved row. The two
  // gates on this button are re-checked there; these only shape the UI.
  async function generateFromProfile(): Promise<void> {
    setIsConfirming(false);
    setGenerateStatus(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/resume/generate", { method: "POST" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setGenerateStatus({
          kind: "error",
          message: result.error ?? ERROR_MESSAGES.generate,
        });
        return;
      }

      setIsReplacing(false);
      // The stored resume is no longer the one those fields were read out of.
      setExtractStatus(null);
      setGenerateStatus({ kind: "success", message: GENERATE_SUCCESS });
      // Same reason as upload: resume_path lives on the server-rendered row, so
      // the preview only appears once the page data is refetched.
      router.refresh();
    } catch (generateError) {
      console.error("[profile/ResumeUpload] generate", generateError);
      setGenerateStatus({ kind: "error", message: ERROR_MESSAGES.generate });
    } finally {
      setIsGenerating(false);
    }
  }

  const showDropzone = resumePath === null || isReplacing;
  const blockerMessage =
    generateBlocker === null ? null : BLOCKER_MESSAGES[generateBlocker];

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
        onChange={(event) => void uploadFile(event.target.files?.[0])}
      />

      {showDropzone ? (
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
            void uploadFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-border bg-surface-secondary px-6 py-10 text-center transition-colors",
            isDragging && "border-accent bg-accent-muted",
            isUploading && "pointer-events-none opacity-60",
          )}
        >
          <span className="grid size-12 place-items-center rounded-full border border-border bg-surface text-accent shadow-sm">
            <CloudUpload aria-hidden className="size-5" />
          </span>
          <p className="mt-4 text-sm font-semibold text-text-primary">
            {isUploading ? "Uploading…" : "Click to upload or drag and drop"}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            PDF only. Maximum file size 5MB.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={isUploading}
            className="mt-5 shadow-sm"
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Select Resume
          </Button>
        </div>
      ) : (
        <ResumePreview
          path={resumePath}
          onReplace={() => {
            setError(null);
            setIsReplacing(true);
          }}
        />
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-text-primary"
        >
          {error}
        </p>
      ) : null}

      {/* Gated on the stored path rather than on the preview being visible, so
          the action stays available while a replacement is being chosen — the
          resume it reads is the saved one either way. */}
      {resumePath !== null ? (
        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-secondary">
              Auto-fill the fields below from your saved resume.
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={isExtracting}
              onClick={() => void extractFromResume()}
              className="sm:shrink-0"
            >
              <Sparkles aria-hidden className="size-4" />
              {isExtracting ? "Extracting…" : "Extract from Resume"}
            </Button>
          </div>

          {extractStatus ? (
            <p
              role={extractStatus.kind === "error" ? "alert" : "status"}
              className={cn(
                "mt-3 rounded-md border px-3 py-2 text-sm text-text-primary",
                extractStatus.kind === "error"
                  ? "border-error/30 bg-error/10"
                  : "border-success/30 bg-success-lightest",
              )}
            >
              {extractStatus.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 border-t border-border pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">
            {isConfirming
              ? "This replaces your stored resume. It cannot be undone."
              : "Need a fresh document based on the fields below?"}
          </p>

          {isConfirming ? (
            <div className="flex gap-2 sm:shrink-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsConfirming(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                // The form can go stale between opening this confirm and
                // answering it — a keystroke in the profile below is enough.
                disabled={generateBlocker !== null}
                onClick={() => void generateFromProfile()}
              >
                Replace resume
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              disabled={generateBlocker !== null || isGenerating}
              // Generating over an existing resume destroys the file it
              // replaces, and there is only ever one. Asking first is the whole
              // difference between a deliberate act and a misplaced click.
              onClick={() =>
                resumePath === null
                  ? void generateFromProfile()
                  : setIsConfirming(true)
              }
              className="sm:shrink-0"
            >
              <FileText aria-hidden className="size-4" />
              {isGenerating ? "Generating…" : "Generate Resume from Profile"}
            </Button>
          )}
        </div>

        {blockerMessage !== null && !isGenerating ? (
          <p className="mt-3 text-xs text-text-muted">{blockerMessage}</p>
        ) : null}

        {generateStatus ? (
          <p
            role={generateStatus.kind === "error" ? "alert" : "status"}
            className={cn(
              "mt-3 rounded-md border px-3 py-2 text-sm text-text-primary",
              generateStatus.kind === "error"
                ? "border-error/30 bg-error/10"
                : "border-success/30 bg-success-lightest",
            )}
          >
            {generateStatus.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
