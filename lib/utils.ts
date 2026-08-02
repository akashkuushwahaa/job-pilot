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
