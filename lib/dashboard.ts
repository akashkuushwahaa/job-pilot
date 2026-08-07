import { z } from "zod";

import type { InsforgeServerClient } from "@/lib/insforge-server";
import type { ActivityEntry, ChartPoint, DashboardStat } from "@/types";

// The dashboard's data. Feature 15 wired the stats bar to real rows; the
// activity feed and the three chart series are still mock and belong to
// features 16 and 17, which replace one function each.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Two columns, and only the two the four cards actually need. The average has to
// be computed over the rows because PostgREST only exposes aggregate functions
// when the server enables them, and nothing here can prove that from the client
// side — see the note in progress-tracker.md. A user's own job rows are a bounded
// set (20 today), and this reads an integer and a timestamp from each.
const STAT_COLUMNS = "match_score, found_at";

// Nullable rather than `.catch(0)`. A row whose score is missing or unreadable
// is a row with no score, and folding it in as a zero would drag the average
// down and report a worse match rate than the user actually has. It counts
// towards Total Jobs Found and towards nothing else.
const StatRowSchema = z.object({
  match_score: z.number().finite().nullable().catch(null),
  found_at: z.string().nullable().catch(null),
});

type StatRow = z.infer<typeof StatRowSchema>;

export async function fetchDashboardStats(
  insforge: InsforgeServerClient,
  userId: string,
): Promise<DashboardStat[]> {
  const [jobs, researched] = await Promise.all([
    insforge.database.from("jobs").select(STAT_COLUMNS).eq("user_id", userId),
    // head: true asks for the count and no rows. The alternative is selecting
    // company_research to test it, which would pull every dossier on the account
    // across the wire to answer a question about how many there are.
    insforge.database
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("company_research", "is", null),
  ]);

  // Fatal, like every other read on a protected page. A dashboard that silently
  // reports zeroes because a query failed is worse than one that says it broke:
  // the user reads "0 jobs found" as their data being gone.
  if (jobs.error) {
    console.error("[lib/dashboard] jobs read failed", jobs.error);
    throw new Error("Dashboard unavailable");
  }

  if (researched.error) {
    console.error("[lib/dashboard] research count failed", researched.error);
    throw new Error("Dashboard unavailable");
  }

  return buildStats(
    parseStatRows(jobs.data),
    researched.count ?? 0,
    Date.now(),
  );
}

export function parseStatRows(rows: unknown): StatRow[] {
  if (!Array.isArray(rows)) return [];

  const parsed: StatRow[] = [];

  for (const row of rows) {
    const result = StatRowSchema.safeParse(row);

    if (result.success) {
      parsed.push(result.data);
    } else {
      console.error("[lib/dashboard] dropped an unreadable row");
    }
  }

  return parsed;
}

// Exported for its own sake: every branch below is a decision about what a
// number means, and those are worth running rather than eyeballing. `now` is a
// parameter so the week boundary is testable.
export function buildStats(
  rows: StatRow[],
  researchedCount: number,
  now: number,
): DashboardStat[] {
  const cutoff = now - WEEK_MS;
  const timestamps = rows.map((row) => toTime(row.found_at));

  const before = rows.filter((_, index) => {
    const time = timestamps[index];

    return time !== null && time < cutoff;
  });

  const thisWeek = timestamps.filter(
    (time) => time !== null && time >= cutoff,
  ).length;

  const average = meanScore(rows);
  const averageBefore = meanScore(before);

  return [
    {
      label: "Total Jobs Found",
      value: String(rows.length),
      ...trendOrCaption(relativeChange(rows.length, before.length), "All time"),
    },
    {
      label: "Avg. Match Rate",
      // Null, not "0%". With no scored job there is no average, and a rate of
      // zero is a different claim from the absence of one.
      value: average === null ? null : `${Math.round(average)}%`,
      ...trendOrCaption(
        average === null || averageBefore === null
          ? null
          : relativeChange(average, averageBefore),
        "Across all jobs",
      ),
    },
    {
      label: "Companies Researched",
      value: String(researchedCount),
      trend: null,
      caption: "Total researched",
    },
    {
      label: "Jobs This Week",
      value: String(thisWeek),
      trend: null,
      caption: "New this week",
    },
  ];
}

function meanScore(rows: StatRow[]): number | null {
  const scores = rows
    .map((row) => row.match_score)
    .filter((score): score is number => score !== null);

  if (scores.length === 0) return null;

  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

// Relative change, for both cards that carry a badge — so "+12%" means the same
// thing on the count as it does on the rate. A percentage-point delta on the
// match rate would render "+3%" for a move from 79% to 82%, which is a different
// claim wearing the same badge.
//
// Null when there is nothing to compare against: a first-week account has no
// previous value, and dividing by it would report an infinite rise.
function relativeChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;

  return Math.round(((current - previous) / previous) * 100);
}

// A badge that cannot be drawn leaves "vs last week" sitting under a number with
// nothing beside it, which reads as a missing element. The caption changes with
// it and says what the number is instead.
function trendOrCaption(
  trend: number | null,
  fallback: string,
): { trend: number | null; caption: string } {
  return trend === null
    ? { trend: null, caption: fallback }
    : { trend, caption: "vs last week" };
}

function toTime(value: string | null): number | null {
  if (value === null) return null;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
}

// ---------------------------------------------------------------------------
// Still mock — features 16 and 17 own these.
// ---------------------------------------------------------------------------

// Timestamps are real ISO instants offset from now, not the rendered strings the
// design shows. formatRelativeTime() produces "10 minutes ago" / "Yesterday" at
// render time, so feature 16 swaps the source and touches no formatting.
export function mockActivity(): ActivityEntry[] {
  const minutesAgo = (minutes: number): string =>
    new Date(Date.now() - minutes * 60_000).toISOString();

  return [
    {
      id: "activity-1",
      kind: "search",
      message: "Found 8 jobs for Frontend Engineer",
      at: minutesAgo(10),
    },
    {
      id: "activity-2",
      kind: "research",
      message: "Researched Stripe",
      at: minutesAgo(60),
    },
    {
      id: "activity-3",
      kind: "search",
      message: "Found 12 jobs for React Developer",
      at: minutesAgo(2 * 60),
    },
    {
      id: "activity-4",
      kind: "research",
      message: "Researched Vercel",
      at: minutesAgo(26 * 60),
    },
    {
      id: "activity-5",
      kind: "search",
      message: "Found 10 jobs for Full Stack Engineer",
      at: minutesAgo(30 * 60),
    },
  ];
}

export function mockResearchActivity(): ChartPoint[] {
  return toSeries(DAYS, [2, 5, 3, 8, 12, 4, 1]);
}

export function mockJobsFound(): ChartPoint[] {
  return toSeries(DAYS, [12, 46, 38, 64, 85, 52, 14]);
}

// The buckets build-plan.md feature 17 names, so the labels the chart renders
// now are the ones the PostHog grouping will fill later.
export function mockScoreDistribution(): ChartPoint[] {
  return toSeries(
    ["50-60%", "60-70%", "70-80%", "80-90%", "90-100%"],
    [5, 15, 45, 85, 36],
  );
}

function toSeries(labels: string[], values: number[]): ChartPoint[] {
  return labels.map((label, index) => ({ label, value: values[index] ?? 0 }));
}
