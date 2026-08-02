"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RESEARCH_ERROR = "Could not research this company. Please retry.";

type Props = {
  jobId: string;
  company: string;
  hasDossier: boolean;
};

// The only Client Component on the job details page. Everything else — including
// the dossier this writes — renders on the server; the boundary exists for the
// click and the request, not for the content.
export function ResearchButton({ jobId, company, hasDossier }: Props) {
  const router = useRouter();
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function research(): Promise<void> {
    if (isResearching) return;

    setError(null);
    setIsResearching(true);

    try {
      const response = await fetch("/api/agent/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? RESEARCH_ERROR);
        return;
      }

      // The dossier is server-rendered from the jobs row, so it appears only
      // once the page data is refetched — the same pattern SearchControls uses
      // after a discovery run. No success banner: the card filling in with the
      // dossier is the confirmation, and a banner over it would say less.
      router.refresh();
    } catch (caught) {
      console.error("[job-details/ResearchButton]", caught);
      setError(RESEARCH_ERROR);
    } finally {
      setIsResearching(false);
    }
  }

  const Icon = hasDossier ? RefreshCw : Search;

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button
        type="button"
        variant={hasDossier ? "secondary" : "primary"}
        disabled={isResearching}
        onClick={() => void research()}
        className="rounded-full sm:shrink-0"
      >
        <Icon
          aria-hidden
          className={cn("size-4", isResearching && "animate-spin")}
        />
        {isResearching
          ? "Researching…"
          : hasDossier
            ? "Refresh research"
            : "Research Company"}
      </Button>

      {/* A run opens a cloud browser and reads up to four pages, so it is slow
          in a way a spinner alone does not excuse. Saying what is happening and
          roughly how long is the difference between "working" and "hung" — the
          same call SearchControls makes for the shorter Adzuna run. */}
      {isResearching ? (
        <p role="status" className="text-xs text-text-muted sm:text-right">
          Reading {company}&apos;s public pages and writing your briefing — this
          takes up to a minute.
        </p>
      ) : null}

      {error !== null && !isResearching ? (
        <p
          role="alert"
          className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-text-primary sm:text-right"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
