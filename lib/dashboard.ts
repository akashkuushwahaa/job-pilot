import { z } from "zod";

import type { InsforgeServerClient } from "@/lib/insforge-server";
import type { ActivityEntry, ChartPoint, DashboardStat } from "@/types";

// The dashboard's data. Feature 15 wired the stats bar to real rows and feature
// 16 the activity feed; the three chart series are still mock and belong to
// feature 17, which replaces one function each.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Two columns, and only the two the four cards actually need. The average has to
// be computed over the rows because PostgREST only exposes aggregate functions
// when the server enables them, and nothing here can prove that from the client
// side — see the note in progress-tracker.md. A user's own job rows are a bounded
// set (30 today), and this reads an integer and a timestamp from each.
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
// Recent Activity
// ---------------------------------------------------------------------------

// The design draws five. build-plan.md feature 16 says "last 5-10 entries", and
// each source is read at this depth so the merge still has five candidates when
// all five newest entries happen to be the same kind.
export const ACTIVITY_LIMIT = 5;

const AgentRunSchema = z.object({
  id: z.string(),
  job_title_searched: z.string().nullable().catch(null),
  jobs_found: z.number().finite().nullable().catch(null),
  completed_at: z.string().nullable().catch(null),
  started_at: z.string().nullable().catch(null),
});

const ResearchedJobSchema = z.object({
  id: z.string(),
  company: z.string().nullable().catch(null),
  researched_at: z.string().nullable().catch(null),
});

type AgentRunRow = z.infer<typeof AgentRunSchema>;
type ResearchedJobRow = z.infer<typeof ResearchedJobSchema>;

export async function fetchRecentActivity(
  insforge: InsforgeServerClient,
  userId: string,
): Promise<ActivityEntry[]> {
  const [runs, researched] = await Promise.all([
    // Completed runs only. A failed run has no jobs to report, and "Found 0 jobs
    // for Frontend Developer" is a different claim from "that search failed" —
    // this database has one such row. The feed says nothing rather than
    // something untrue; a failure entry needs a third dot colour and an error
    // treatment that neither the design nor ui-tokens.md defines.
    insforge.database
      .from("agent_runs")
      .select("id, job_title_searched, jobs_found, completed_at, started_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
    // Ordered by researched_at, never found_at. On this database the two are
    // seven to nine hours apart — see migrations/20260803090000.
    insforge.database
      .from("jobs")
      .select("id, company, researched_at")
      .eq("user_id", userId)
      .not("researched_at", "is", null)
      .order("researched_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
  ]);

  if (runs.error) {
    console.error("[lib/dashboard] agent_runs read failed", runs.error);
    throw new Error("Dashboard unavailable");
  }

  if (researched.error) {
    console.error("[lib/dashboard] researched jobs read failed", researched.error);
    throw new Error("Dashboard unavailable");
  }

  return buildActivity(
    parseRows(runs.data, AgentRunSchema, "agent_runs"),
    parseRows(researched.data, ResearchedJobSchema, "researched jobs"),
  );
}

// Exported so the merge, the ordering and every sentence it can produce are
// runnable rather than only observable in a screenshot.
export function buildActivity(
  runs: AgentRunRow[],
  researched: ResearchedJobRow[],
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const run of runs) {
    // A completed run should always carry completed_at; started_at is the
    // fallback so a missing one costs the entry its precision, not its place.
    const at = run.completed_at ?? run.started_at;

    if (at === null || toTime(at) === null) {
      console.error("[lib/dashboard] dropped a run with no usable timestamp");
      continue;
    }

    entries.push({
      id: `run-${run.id}`,
      kind: "search",
      message: searchMessage(run.jobs_found ?? 0, run.job_title_searched),
      at,
    });
  }

  for (const job of researched) {
    const company = job.company?.trim() ?? "";

    // "Researched" naming nothing is noise, not an entry.
    if (company.length === 0 || job.researched_at === null) continue;
    if (toTime(job.researched_at) === null) continue;

    entries.push({
      id: `job-${job.id}`,
      kind: "research",
      message: `Researched ${company}`,
      at: job.researched_at,
    });
  }

  // Both reads are already ordered; the merge is what needs sorting. Ties break
  // on id so two events written in the same millisecond cannot swap places
  // between requests — the same rule every `jobs` ordering follows.
  return entries
    .sort((a, b) => {
      const diff = (toTime(b.at) ?? 0) - (toTime(a.at) ?? 0);

      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    })
    .slice(0, ACTIVITY_LIMIT);
}

// Zero is a real outcome — feature 10 saves a run that found nothing — and
// "Found 0 jobs" reads as a bug rather than as a result.
function searchMessage(count: number, title: string | null): string {
  const subject = count === 1 ? "1 job" : `${count} jobs`;
  const found = count === 0 ? "No jobs found" : `Found ${subject}`;
  const named = title?.trim() ?? "";

  return named.length === 0 ? found : `${found} for ${named}`;
}

function parseRows<T>(
  rows: unknown,
  schema: z.ZodType<T>,
  label: string,
): T[] {
  if (!Array.isArray(rows)) return [];

  const parsed: T[] = [];

  for (const row of rows) {
    const result = schema.safeParse(row);

    if (result.success) {
      parsed.push(result.data);
    } else {
      console.error(`[lib/dashboard] dropped an unreadable ${label} row`);
    }
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Still mock — feature 17 owns these three.
// ---------------------------------------------------------------------------

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
