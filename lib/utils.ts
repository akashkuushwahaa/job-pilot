import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const MATCH_THRESHOLD = 70;

export const MAX_WORK_EXPERIENCE = 3;

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Match score bar bands, read off context/designs/find-jobs.png, which draws 96
// and 91 green, 88 and 85 blue, and 72 orange. ui-rules.md said 80/60 and
// ui-tokens.md said 90/70/50 — the two disagreed with each other and with the
// design, so the rendered artefact broke the tie. See ui-rules.md.
export function matchScoreFill(score: number): string {
  if (score >= 90) return "bg-success";
  if (score >= 80) return "bg-info";
  return "bg-warning";
}

// jobs.source_url and jobs.external_apply_url come from Adzuna, and lib/adzuna.ts
// validates redirect_url as a non-empty string and nothing more — so the only
// thing standing between a third party payload and an href on our page is this.
// A `javascript:` or `data:` scheme in a link is an XSS vector; React blocks the
// obvious case, but the project's own rule is that a third party payload is
// untrusted input, and this is where it becomes clickable.
//
// Returning null is the handling, not a swallowed failure: a URL we cannot vouch
// for is one the page must not offer as a link at all.
export function safeExternalUrl(value: string | null): string | null {
  if (value === null || value.length === 0) return null;

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    console.error("[lib/utils] discarded an unparseable job URL");
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    console.error("[lib/utils] discarded a job URL scheme", parsed.protocol);
    return null;
  }

  return value;
}

// A status badge, not a score bar, and the two answer different questions.
// ui-tokens.md keys High Match / Low Match on MATCH_THRESHOLD, which is why the
// job details header draws 85% green while matchScoreFill() paints an 85 bar
// blue — the bar reports where in the range a score sits, the badge reports
// whether it cleared the bar. Do not collapse these into one function.
export function matchBadge(score: number): string {
  return score >= MATCH_THRESHOLD
    ? "bg-success-lightest text-success-foreground"
    : "bg-surface-secondary text-text-secondary";
}

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const absoluteDate = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// "2 hours ago", "Yesterday", "3 days ago" — the DATE FOUND column. numeric:
// "auto" is what turns -1 day into "yesterday" rather than "1 day ago"; it comes
// back lowercase, so it is capitalised to sit with the numeric forms.
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();

  if (Number.isNaN(then)) return "";

  const minutes = Math.round((Date.now() - then) / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return capitalise(relativeTime.format(-minutes, "minute"));

  const hours = Math.round(minutes / 60);

  if (hours < 24) return capitalise(relativeTime.format(-hours, "hour"));

  const days = Math.round(hours / 24);

  if (days < 30) return capitalise(relativeTime.format(-days, "day"));

  return absoluteDate.format(new Date(then));
}

// jobs.job_type stores the three values architecture.md names. It is null far
// more often than not — lib/adzuna.ts refuses to default an unstated listing to
// "fulltime" — so this returns null rather than a placeholder and the caller
// decides what absence looks like.
const JOB_TYPE_LABELS: Record<string, string> = {
  fulltime: "Full-time",
  parttime: "Part-time",
  contract: "Contract",
};

export function formatJobType(value: string | null): string | null {
  if (value === null || value.length === 0) return null;

  return JOB_TYPE_LABELS[value] ?? capitalise(value);
}
