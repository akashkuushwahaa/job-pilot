import { z } from "zod";

import { MATCH_THRESHOLD } from "@/lib/utils";
import type { JobListItem } from "@/types";

// The same discipline as parseProfile in lib/profile.ts: PostgREST hands back
// `any`, so annotating a row `JobListItem` renames the `any` and checks nothing.
// Unlike a profile this does not .catch() per field — a job row with no title or
// no score has nothing worth rendering, so it is dropped from the list instead
// of degraded into a blank row the user cannot act on.
const JobListItemSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  match_score: z.number(),
  salary: z.string().nullish().transform((value) => value ?? null),
  found_at: z.string(),
});

export function parseJobList(rows: unknown): JobListItem[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  const jobs: JobListItem[] = [];

  for (const row of rows) {
    const parsed = JobListItemSchema.safeParse(row);

    if (parsed.success) {
      jobs.push(parsed.data);
    } else {
      console.error("[lib/jobs] dropped an unreadable row", parsed.error.issues);
    }
  }

  return jobs;
}

// The sentence under the search controls. The design reads "Found 8 jobs and
// saved 4 strong matches", which says only the strong ones were kept —
// project-overview.md requires every job visible regardless of score, and all
// of them are saved. Reworded so the count and the table agree.
export function discoveryMessage(scores: number[]): string {
  if (scores.length === 0) {
    return "No jobs found for that search. Try a broader title or location.";
  }

  const strong = scores.filter((score) => score >= MATCH_THRESHOLD).length;
  const jobs = scores.length === 1 ? "1 job" : `${scores.length} jobs`;

  if (strong === 0) {
    return `Found ${jobs}. None cleared ${MATCH_THRESHOLD}% — they are all listed below.`;
  }

  const matches = strong === 1 ? "1 is a strong match" : `${strong} are strong matches`;

  return `Found ${jobs} — ${matches}.`;
}
