import { z } from "zod";

import { marketName, type AdzunaCountry } from "@/lib/adzuna";
import { parseDossier } from "@/lib/dossier";
import type { InsforgeServerClient } from "@/lib/insforge-server";
import { MATCH_THRESHOLD, safeExternalUrl } from "@/lib/utils";
import {
  JOB_MATCH_FILTERS,
  JOB_SORTS,
  type JobDetail,
  type JobListItem,
  type JobMatchFilter,
  type JobQuery,
  type JobSort,
} from "@/types";

export const JOBS_PAGE_SIZE = 20;

const MAX_FILTER_TEXT = 100;

const JOB_LIST_COLUMNS = "id, company, title, match_score, salary, found_at";

// company_research joined this select in feature 13, in the same change that
// added the dossier markup and the Research Company button's handler. The three
// move together on purpose: a card reporting "No research yet" over a dossier
// that exists is worse than one that cannot render a dossier at all.
const JOB_DETAIL_COLUMNS =
  "id, title, company, location, salary, job_type, source_url, external_apply_url, about_role, responsibilities, requirements, nice_to_have, benefits, about_company, match_score, match_reason, matched_skills, missing_skills, company_research, found_at";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
//
// It also names the market. A search that ran against the wrong country is
// otherwise invisible until the user reads the locations in the table and finds
// another continent — which is exactly how the Indianapolis rows went unnoticed.
// Naming it costs three words and makes a wrong market self-evident, including
// on the zero-result sentence, where it is the most likely explanation.
export function discoveryMessage(
  scores: number[],
  country: AdzunaCountry,
): string {
  const market = marketName(country);

  if (scores.length === 0) {
    return `No jobs found in ${market} for that search. Try a broader title, or a different country.`;
  }

  const strong = scores.filter((score) => score >= MATCH_THRESHOLD).length;
  const jobs = scores.length === 1 ? "1 job" : `${scores.length} jobs`;

  if (strong === 0) {
    return `Found ${jobs} in ${market}. None cleared ${MATCH_THRESHOLD}% — they are all listed below.`;
  }

  const matches = strong === 1 ? "1 is a strong match" : `${strong} are strong matches`;

  return `Found ${jobs} in ${market} — ${matches}.`;
}

// Adzuna's search endpoint returns a 500-character snippet that stops mid-word
// and ends with a single ellipsis character. Verified twice: all ten live results
// in feature 10, and all 20 stored rows — every one exactly 500 characters, every
// one ending in this character.
//
// The details page keys its "the rest is elsewhere" note on the ellipsis rather
// than on the length, because 500 is Adzuna's number to change and a description
// that arrives whole must not carry the note. Until something fetches the real
// posting body, this is the only signal that the text is partial.
const SNIPPET_ELLIPSIS = "…";

export function isTruncatedDescription(text: string | null): boolean {
  return text !== null && text.endsWith(SNIPPET_ELLIPSIS);
}

// Narrowing without a type assertion: `find` compares the untrusted string
// against the const list and hands back the union member or nothing.
export function toMatchFilter(value: string): JobMatchFilter {
  return JOB_MATCH_FILTERS.find((option) => option === value) ?? "all";
}

export function toJobSort(value: string): JobSort {
  return JOB_SORTS.find((option) => option === value) ?? "score";
}

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";

  return value ?? "";
}

// Every value here arrives from the address bar, so nothing is trusted: an
// unknown filter or sort falls back to its default rather than reaching
// PostgREST, and the page number cannot go below one.
export function parseJobQuery(
  params: Record<string, string | string[] | undefined>,
): JobQuery {
  const page = Number.parseInt(firstValue(params.page), 10);

  return {
    text: firstValue(params.q).trim().slice(0, MAX_FILTER_TEXT),
    match: toMatchFilter(firstValue(params.match)),
    sort: toJobSort(firstValue(params.sort)),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

// Defaults are omitted rather than written out, so the unfiltered list is plain
// `/find-jobs` and a link only ever carries what actually differs.
export function jobsHref(query: JobQuery): string {
  const params = new URLSearchParams();

  if (query.text.length > 0) params.set("q", query.text);
  if (query.match !== "all") params.set("match", query.match);
  if (query.sort !== "score") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));

  const search = params.toString();

  return search.length > 0 ? `/find-jobs?${search}` : "/find-jobs";
}

// PostgREST parses the `or` argument itself, so a comma, a dot or a parenthesis
// in the filter text would be read as syntax and fail the whole request. Double
// quotes make it a literal; inside them only `\` and `"` still need escaping.
function quoteFilterValue(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return `"*${escaped}*"`;
}

async function readJobPage(
  insforge: InsforgeServerClient,
  userId: string,
  query: JobQuery,
  page: number,
): Promise<{ jobs: JobListItem[]; total: number }> {
  let builder = insforge.database
    .from("jobs")
    .select(JOB_LIST_COLUMNS, { count: "exact" })
    .eq("user_id", userId);

  if (query.match === "high") {
    builder = builder.gte("match_score", MATCH_THRESHOLD);
  }

  if (query.match === "low") {
    builder = builder.lt("match_score", MATCH_THRESHOLD);
  }

  if (query.text.length > 0) {
    const value = quoteFilterValue(query.text);

    builder = builder.or(`company.ilike.${value},title.ilike.${value}`);
  }

  const ordered =
    query.sort === "score"
      ? builder.order("match_score", { ascending: false })
      : builder.order("found_at", { ascending: query.sort === "oldest" });

  const from = (page - 1) * JOBS_PAGE_SIZE;

  // `id` is the tiebreaker on every sort, and it is not optional. found_at
  // defaults to now(), which is transaction time — all ten rows of one discovery
  // run carry the same millisecond — and match_score ties are common. Without a
  // unique final key Postgres is free to order ties differently per request, so
  // one row appears on two pages and another on none.
  const { data, error, count } = await ordered
    .order("id", { ascending: true })
    .range(from, from + JOBS_PAGE_SIZE - 1);

  if (error) {
    // Fields, not the object: the dev server's log formatter renders a whole
    // PostgrestError as `{}`, which tells whoever is reading it nothing at all.
    console.error("[lib/jobs] jobs read failed", error.code, error.message);
    throw new Error("Find Jobs unavailable");
  }

  return { jobs: parseJobList(data), total: count ?? 0 };
}

// Returns the page it actually read, which is not always the one asked for.
export async function fetchJobPage(
  insforge: InsforgeServerClient,
  userId: string,
  query: JobQuery,
): Promise<{ jobs: JobListItem[]; total: number; page: number }> {
  const first = await readJobPage(insforge, userId, query, query.page);
  const totalPages = Math.max(1, Math.ceil(first.total / JOBS_PAGE_SIZE));

  // A bookmarked ?page=3 outlives the filter that made three pages of results.
  // Re-reading the last real page costs one round trip in a rare case and beats
  // rendering "no jobs match" over rows that plainly exist.
  if (query.page > totalPages && first.total > 0) {
    const clamped = await readJobPage(insforge, userId, query, totalPages);

    return { jobs: clamped.jobs, total: clamped.total, page: totalPages };
  }

  return { jobs: first.jobs, total: first.total, page: query.page };
}

const nullableText = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

// A text[] column reads back as null only if something wrote null into it, but
// jsonb-style surprises are exactly what parseProfile was written for — an empty
// list renders as "no section", which is the honest answer either way.
const stringArray = z
  .array(z.string())
  .nullish()
  .transform((value) => value ?? []);

// Scheme-checked at the boundary rather than at each href, so JobDetail carries
// only URLs the page is allowed to link to and no consumer has to remember.
const externalUrl = z
  .string()
  .nullish()
  .transform((value) => safeExternalUrl(value ?? null));

const JobDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: nullableText,
  salary: nullableText,
  job_type: nullableText,
  source_url: externalUrl,
  external_apply_url: externalUrl,
  about_role: nullableText,
  responsibilities: stringArray,
  requirements: stringArray,
  nice_to_have: stringArray,
  benefits: stringArray,
  about_company: nullableText,
  match_score: z.number(),
  match_reason: nullableText,
  matched_skills: stringArray,
  missing_skills: stringArray,
  // jsonb, so Postgres has checked nothing about what is in here. parseDossier
  // narrows it the same way this schema narrows the row, and answers null for
  // both "no research yet" and "whatever is in the column is not a dossier" —
  // the card's empty state is the honest render of either.
  company_research: z.unknown().transform((value) => parseDossier(value)),
  found_at: z.string(),
});

// Null means "no such job for this user" and the page turns that into a 404.
// A read failure and an unreadable row both throw, because neither is the same
// statement: rendering "not found" over a job that plainly exists would send the
// user back to a list still showing the row they just clicked.
export async function fetchJob(
  insforge: InsforgeServerClient,
  userId: string,
  jobId: string,
): Promise<JobDetail | null> {
  // PostgREST answers a malformed uuid with 22P02, which arrives as a read
  // failure and would render the error boundary. A hand-typed /find-jobs/nope is
  // a missing job, not a broken database.
  if (!UUID_PATTERN.test(jobId)) {
    return null;
  }

  const { data, error } = await insforge.database
    .from("jobs")
    .select(JOB_DETAIL_COLUMNS)
    .eq("user_id", userId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("[lib/jobs] job read failed", error.code, error.message);
    throw new Error("Job unavailable");
  }

  if (!data) {
    return null;
  }

  const parsed = JobDetailSchema.safeParse(data);

  if (!parsed.success) {
    console.error("[lib/jobs] unreadable job row", parsed.error.issues);
    throw new Error("Job unavailable");
  }

  return parsed.data;
}
