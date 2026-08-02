import {
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  MapPin,
  type LucideIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  cn,
  formatJobType,
  formatRelativeTime,
  matchBadge,
  matchScoreFill,
} from "@/lib/utils";
import type { JobDetail } from "@/types";

type Props = {
  job: JobDetail;
};

type Fact = {
  key: string;
  icon: LucideIcon;
  chip: string;
  value: string | null;
  label: string;
};

// The identity of the job, then its four facts. Two cards rather than one
// because the page stack owns the 24px between them — same reason ResumeUpload
// owns a whole card while ProfileWorkspace renders none of its own markup.
export function JobInfo({ job }: Props) {
  const facts: Fact[] = [
    {
      key: "salary",
      icon: DollarSign,
      chip: "bg-success-lightest text-success-foreground",
      value: job.salary,
      label: "Salary est.",
    },
    {
      key: "location",
      icon: MapPin,
      chip: "bg-info-lightest text-info-foreground",
      value: job.location,
      label: "Location",
    },
    {
      key: "job-type",
      icon: Briefcase,
      chip: "bg-accent-muted text-accent",
      value: formatJobType(job.job_type),
      label: "Job type",
    },
    {
      key: "found-at",
      icon: Calendar,
      chip: "bg-surface-secondary text-text-secondary",
      value: formatRelativeTime(job.found_at),
      label: "Date found",
    },
  ];

  return (
    <>
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-surface-secondary text-text-secondary">
              <Building2 aria-hidden className="size-6" />
            </span>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
                {job.title}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm text-text-secondary">
                  {job.company}
                </span>
                <span
                  aria-hidden
                  className="size-1 shrink-0 rounded-full bg-text-muted"
                />
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    matchBadge(job.match_score),
                  )}
                >
                  {job.match_score}% Match Score
                </span>
              </div>

              {/* project-overview.md asks the match section for a score number
                  *and* a visual indicator; the design draws only the badge. The
                  bar is the reading of the two that satisfies both, and it reuses
                  feature 09's matchScoreFill so this page and the jobs table can
                  never colour the same score differently. aria-hidden because the
                  percentage is directly above it — one reading, not two. */}
              <span
                aria-hidden
                className="mt-3 block h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-border-light"
              >
                <span
                  className={cn(
                    "block h-full rounded-full",
                    matchScoreFill(job.match_score),
                  )}
                  style={{ width: `${job.match_score}%` }}
                />
              </span>
            </div>
          </div>

          {job.source_url === null ? null : (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: "secondary",
                className: "sm:shrink-0",
              })}
            >
              <ExternalLink aria-hidden className="size-4" />
              View Job Post
            </a>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div
            key={fact.key}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg",
                fact.chip,
              )}
            >
              <fact.icon aria-hidden className="size-4" />
            </span>

            <div className="min-w-0">
              {/* The design draws an em dash for a fact the listing did not
                  state. Read aloud that is "em dash", so the label carries the
                  meaning for a screen reader instead. */}
              <p className="truncate text-sm font-semibold text-text-primary">
                {fact.value ?? (
                  <>
                    <span aria-hidden>—</span>
                    <span className="sr-only">Not stated</span>
                  </>
                )}
              </p>
              <p className="text-xs font-medium tracking-wider text-text-muted uppercase">
                {fact.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
