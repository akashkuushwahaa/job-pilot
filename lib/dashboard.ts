import { z } from "zod";

import type { InsforgeServerClient } from "@/lib/insforge-server";
import type {
  ActivityEntry,
  ChartPoint,
  DashboardData,
  DashboardStat,
} from "@/types";

// The dashboard's data. Every number on the page comes from the user's own rows:
// feature 15 wired the stats bar, feature 16 the activity feed, and feature 17
// the three charts.
//
// build-plan.md feature 17 specifies PostHog as the chart source. It is not, and
// the reasons are worth keeping. There is no way to read PostHog from this
// project at all — the only credential is the write-only public project token,
// there is no MCP server and no skill, so a read would mean an account-wide
// personal API key and a hand-rolled HogQL client. More decisively, PostHog
// could not answer two of the three questions even if it were readable:
// `job_found` carries { userId, source, matchScore } and no jobId, so distinct
// jobs cannot be counted, and it fires once per saved row on every run — while
// `found_at` is deliberately omitted from the discovery upsert so it keeps
// meaning *first discovered*. A repeated search would inflate the event series
// and leave the rows correct. PostHog still captures; it is not read from here.

const DAY_MS = 24 * 60 * 60 * 1000;

// Seven, as feature 14 built and the design draws. build-plan.md feature 17 asks
// for 30 days on Jobs Found Over Time, which this card cannot label — and seven
// puts it on the same window as Company Research Activity beside it, so the two
// can be read against each other.
const CHART_DAYS = 7;

// **The page has one definition of "the last 7 days", and this is it.** The stat
// card, both trend baselines and both time charts all measure from here.
//
// It used to have two. `Jobs This Week` counted a rolling `now - 7 x 24h` while
// the charts bucketed seven UTC calendar days, and the calendar window is always
// the shorter of the pair — by exactly the current time of day, so by up to 23
// hours. A job found in that band counted on the card and not in the chart, which
// rendered "Jobs This Week: 1" directly above a chart captioned "No jobs found in
// the last 7 days". Two surfaces, one window name, opposite answers. Found by
// `/review` on feature 17.
//
// The calendar reading won because it is the one with a visible definition: the
// chart draws seven labelled days, and a reader can count them.
function weekStart(now: number): number {
  return (utcDay(now) - (CHART_DAYS - 1)) * DAY_MS;
}

// Whole UTC days since the epoch. Integer arithmetic rather than a Date per row,
// and no local-timezone drift on the way through.
function utcDay(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

// Three columns, and only the three the whole page needs. One read now serves
// the stats bar and all three charts, which is the same call feature 15 made in
// choosing two queries over four: these are rows the page has already loaded,
// and a separate query per chart would be three more round trips to fetch them
// again. The average has to be computed over the rows because PostgREST only
// exposes aggregate functions when the server enables them, and nothing here can
// prove that from the client side. A user's own job rows are a bounded set (30
// today), and this reads an integer and two timestamps from each.
const JOB_FACT_COLUMNS = "match_score, found_at, researched_at";

// Nullable rather than `.catch(0)`. A row whose score is missing or unreadable
// is a row with no score, and folding it in as a zero would drag the average
// down and report a worse match rate than the user actually has. It counts
// towards Total Jobs Found and towards nothing else — including the score
// distribution, which is a chart about scored jobs.
const JobFactSchema = z.object({
  match_score: z.number().finite().nullable().catch(null),
  found_at: z.string().nullable().catch(null),
  // Null until the research agent writes a dossier. Never rewritten by a
  // re-discovery — see the upsert-omission list in agent/adzuna.ts.
  researched_at: z.string().nullable().catch(null),
});

type JobFact = z.infer<typeof JobFactSchema>;

export async function fetchDashboardData(
  insforge: InsforgeServerClient,
  userId: string,
): Promise<DashboardData> {
  const [jobs, researched] = await Promise.all([
    insforge.database
      .from("jobs")
      .select(JOB_FACT_COLUMNS)
      .eq("user_id", userId),
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

  const rows = parseJobFacts(jobs.data);
  const now = Date.now();

  return {
    stats: buildStats(rows, researched.count ?? 0, now),
    researchActivity: buildResearchActivity(rows, now),
    jobsFound: buildJobsFound(rows, now),
    scoreDistribution: buildScoreDistribution(rows),
  };
}

export function parseJobFacts(rows: unknown): JobFact[] {
  return parseRows(rows, JobFactSchema, "job");
}

// Exported for its own sake: every branch below is a decision about what a
// number means, and those are worth running rather than eyeballing. `now` is a
// parameter so the week boundary is testable.
export function buildStats(
  rows: JobFact[],
  researchedCount: number,
  now: number,
): DashboardStat[] {
  const cutoff = weekStart(now);
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

function meanScore(rows: JobFact[]): number | null {
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
// The three charts
// ---------------------------------------------------------------------------

// Days are bucketed in UTC, and the label is formatted in UTC to match. The page
// is server-rendered with no client boundary anywhere in the chart chain, so the
// reader's own timezone is not knowable without adding one; pinning UTC at least
// makes the chart identical in development and on the deployed server, which the
// machine's local zone would not. If the label's zone and the bucket's zone ever
// disagree, every bar names a different day from the one it counts.
const CHART_TIME_ZONE = "UTC";

const weekdayLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: CHART_TIME_ZONE,
});

// When a dossier was written, not when the job was found — the two are seven to
// nine hours apart on this database, which is why feature 16 added the column.
export function buildResearchActivity(
  rows: JobFact[],
  now: number,
): ChartPoint[] {
  return dailySeries(
    rows.map((row) => row.researched_at),
    now,
  );
}

// When a job was *first* discovered. `found_at` is never rewritten by a
// re-discovery, so a repeated search does not move a job to today.
export function buildJobsFound(rows: JobFact[], now: number): ChartPoint[] {
  return dailySeries(
    rows.map((row) => row.found_at),
    now,
  );
}

// One bucket per UTC day for the last CHART_DAYS days, ending today. A day with
// nothing in it is a zero rather than a missing bucket: the series has to stay
// the same length or the axis silently shortens and every label slides onto the
// wrong bar.
function dailySeries(values: (string | null)[], now: number): ChartPoint[] {
  // The clock is the one input in this chain that was not narrowed. A non-finite
  // `now` makes every bucket boundary NaN and `Intl.DateTimeFormat.format` throws
  // RangeError on it — a 500 on the whole dashboard, from a chart. Nothing
  // reaches this with a bad clock today (`Date.now()` is the only caller), but
  // these are exported functions and lib/charts.ts guards its own inputs for
  // exactly this reason. An empty series renders the card's empty state, which is
  // the same degrade an all-zero series gets. Found by `/review` on feature 17.
  if (!Number.isFinite(now)) {
    console.error("[lib/dashboard] dailySeries received a non-finite clock");

    return [];
  }

  const today = utcDay(now);
  const first = today - (CHART_DAYS - 1);
  const counts = new Array<number>(CHART_DAYS).fill(0);

  for (const value of values) {
    const time = toTime(value);

    // Null is the ordinary case here — most rows have no researched_at — so an
    // absent or unparseable timestamp is skipped without a log. buildActivity
    // logs because a row it drops is an entry the user does not see; a row
    // outside the window is simply not in the window.
    if (time === null) continue;

    const index = utcDay(time) - first;

    if (index >= 0 && index < CHART_DAYS) {
      counts[index] += 1;
    }
  }

  return counts.map((value, index) => ({
    label: weekdayLabel.format((first + index) * DAY_MS),
    value,
  }));
}

// build-plan.md feature 17 names five buckets starting at 50. This account's
// scores run 30-65, so those five would silently drop most of its rows — and a
// distribution that discards data is not a distribution. The sixth bucket is
// what makes every scored job appear somewhere.
//
// Lower-inclusive, upper-exclusive, so 60 lands in "60-70%". The two ends are
// unbounded: the column carries CHECK (match_score BETWEEN 0 AND 100), but the
// value arrives here through PostgREST and zod rather than from the constraint,
// and a score that fell through every bucket would vanish without a trace.
// The labels carry no "%". The design draws one per bucket, and with five
// buckets it fits — but the sixth consumes the slack exactly: at 414px the six
// labelled "50-60%" and up need 274px of the 277px the card has, so they render
// as one unbroken run with no gap between categories. Measured in the browser,
// not reasoned about. Dropping the repeated unit costs about 7px each and buys
// back the same spacing five labels had; the card is titled "Match Score
// Distribution", so the unit is stated once instead of six times in the
// tightest row on the page.
const SCORE_BUCKETS: {
  label: string;
  srLabel: string;
  min: number;
  max: number;
}[] = [
  { label: "<50", srLabel: "under 50%", min: -Infinity, max: 50 },
  { label: "50-60", srLabel: "50-60%", min: 50, max: 60 },
  { label: "60-70", srLabel: "60-70%", min: 60, max: 70 },
  { label: "70-80", srLabel: "70-80%", min: 70, max: 80 },
  { label: "80-90", srLabel: "80-90%", min: 80, max: 90 },
  { label: "90-100", srLabel: "90-100%", min: 90, max: Infinity },
];

// All time, like Avg. Match Rate — this is a question about the shape of
// someone's matches, not about this week. An unscored row is excluded, the same
// rule the average follows: it counts towards Total Jobs Found and nothing else.
export function buildScoreDistribution(rows: JobFact[]): ChartPoint[] {
  const counts = new Array<number>(SCORE_BUCKETS.length).fill(0);

  for (const row of rows) {
    const score = row.match_score;

    if (score === null) continue;

    const index = SCORE_BUCKETS.findIndex(
      (bucket) => score >= bucket.min && score < bucket.max,
    );

    if (index !== -1) {
      counts[index] += 1;
    }
  }

  // srLabel keeps the unit the visual label had to give up. Horizontal space is
  // what forced "60-70" on screen; a screen reader has no such constraint, and
  // "60-70: 5" read aloud loses what the number is a range of. Found by
  // `/review` on feature 17.
  return SCORE_BUCKETS.map((bucket, index) => ({
    label: bucket.label,
    srLabel: bucket.srLabel,
    value: counts[index],
  }));
}
