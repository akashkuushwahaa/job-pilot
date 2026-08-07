export const EXPERIENCE_LEVELS = ["junior", "mid", "senior", "lead"] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const REMOTE_PREFERENCES = [
  "remote",
  "onsite",
  "hybrid",
  "any",
] as const;

export type RemotePreference = (typeof REMOTE_PREFERENCES)[number];

export const WORK_AUTHORIZATIONS = [
  "citizen",
  "permanent_resident",
  "visa_required",
] as const;

export type WorkAuthorization = (typeof WORK_AUTHORIZATIONS)[number];

// Not a database enum — profiles.education is jsonb and degree is a free string
// inside it. This list exists because the Education select offers exactly these
// and resume extraction has to pick from the same set: a degree the select
// cannot render would silently show as blank.
export const DEGREE_OPTIONS = [
  "High School",
  "Associate",
  "Bachelor's",
  "Master's",
  "PhD",
  "Bootcamp",
  "Self-taught",
] as const;

export type Degree = (typeof DEGREE_OPTIONS)[number];

// profiles.work_experience — jsonb array, capped at MAX_WORK_EXPERIENCE roles.
export type WorkExperienceEntry = {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  currently_working: boolean;
  responsibilities: string;
};

// profiles.education — a single jsonb object, not an array.
export type EducationEntry = {
  degree: string;
  field: string;
  institution: string;
  graduation_year: string;
};

// Mirrors the profiles table. Nullable columns stay nullable here — there is no
// row until the user saves, so callers must handle both a missing profile and a
// present-but-empty column.
export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  current_title: string | null;
  experience_level: ExperienceLevel | null;
  years_experience: number | null;
  skills: string[];
  industries: string[];
  work_experience: WorkExperienceEntry[];
  education: EducationEntry | null;
  job_titles_seeking: string[];
  remote_preference: RemotePreference | null;
  preferred_locations: string[];
  salary_expectation: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  work_authorization: WorkAuthorization | null;
  resume_path: string | null;
  updated_at: string;
};

// Everything on a profile except the columns the database maintains. A save
// composes one of these before the row exists, so nothing that reads profile
// content should require `updated_at`.
export type ProfileFields = Omit<Profile, "updated_at">;

// Every control is a string here even where the column is not. The form owns the
// display shape; lib/profile.ts owns both directions of the mapping. The two
// text[] columns entered as one comma-separated field stay strings until save.
export type ProfileFormValues = {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  portfolio_url: string;
  work_authorization: string;
  current_title: string;
  experience_level: string;
  years_experience: string;
  skills: string[];
  industries: string[];
  work_experience: WorkExperienceEntry[];
  education: EducationEntry;
  job_titles_seeking: string;
  remote_preference: string;
  salary_expectation: string;
  preferred_locations: string;
};

// One row of the Find Jobs list — the subset of the `jobs` table the table
// renders, and nothing more. Feature 10 writes the full row; feature 11 selects
// these columns onto this shape. `salary` is nullable because Adzuna does not
// always return one.
export type JobListItem = {
  id: string;
  company: string;
  title: string;
  match_score: number;
  salary: string | null;
  found_at: string;
};

// jobs.company_research — the dossier the research agent writes, and the only
// jsonb column the app renders. Postgres does not check jsonb structurally, so
// nothing may read this shape without parsing it first: a drifted field arrives
// as `undefined` and throws at the render, not at the read. See lib/dossier.ts.
//
// Every field can be empty. A dossier is always written whole, but a run whose
// browser phase found nothing produces one with thin arrays, and the card
// renders only the sections that have content — the same rule JobDescription
// follows.
export type CompanyDossier = {
  companyOverview: string;
  techStack: string[];
  culture: string[];
  whyThisRole: string;
  yourEdge: string[];
  gapsToAddress: string[];
  smartQuestions: string[];
  interviewPrep: string[];
  sources: string[];
};

// One whole job, as the details page renders it. Wider than JobListItem and
// deliberately not a superset of the `jobs` table: `run_id` / `source` /
// `external_id` are bookkeeping the page never shows.
//
// `company_research` is null until the research agent has run for this job.
// Feature 13 added it to the read, the dossier markup and the button's handler
// in one change, so there is never a card reporting "No research yet" over a
// dossier that exists.
//
// The five description fields are empty on every row Adzuna discovered — it
// returns a 500-character snippet, so feature 10 puts it in `about_role`
// verbatim and writes nothing else. Feature 13's backfill fills them from the
// real posting when it can reach one, so rendering stays per-section: present on
// a backfilled row, absent on every row the backfill could not read.
export type JobDetail = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  job_type: string | null;
  source_url: string | null;
  external_apply_url: string | null;
  about_role: string | null;
  responsibilities: string[];
  requirements: string[];
  nice_to_have: string[];
  benefits: string[];
  about_company: string | null;
  match_score: number;
  match_reason: string | null;
  matched_skills: string[];
  missing_skills: string[];
  company_research: CompanyDossier | null;
  found_at: string;
};

// The Find Jobs filter bar. Both the client component that renders the selects
// and the server read that applies them work from these two lists, so an option
// the query cannot honour cannot be rendered in the first place.
export const JOB_MATCH_FILTERS = ["all", "high", "low"] as const;

export type JobMatchFilter = (typeof JOB_MATCH_FILTERS)[number];

export const JOB_SORTS = ["score", "newest", "oldest"] as const;

export type JobSort = (typeof JOB_SORTS)[number];

// The whole state of the Find Jobs list. It lives in the URL rather than in
// component state, so a refresh, the back button and a shared link all reproduce
// the same list — and the read stays in the Server Component that renders it.
export type JobQuery = {
  text: string;
  match: JobMatchFilter;
  sort: JobSort;
  page: number;
};

// What resume extraction is allowed to hand back. The omissions are the point:
// email comes from the session, and work authorization and the four job
// preferences are things a resume does not state — filling them would mean
// inventing them. Every key is optional because a field the resume is silent
// about must leave whatever the user already typed alone.
export type ExtractedFormValues = Partial<
  Omit<
    ProfileFormValues,
    | "email"
    | "work_authorization"
    | "job_titles_seeking"
    | "remote_preference"
    | "salary_expectation"
    | "preferred_locations"
    | "education"
  >
> & {
  // Merged key by key rather than wholesale: a resume that names the institution
  // but not the field of study must not blank out a field of study already there.
  education?: Partial<EducationEntry>;
};


// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

// The four stat cards. `trend` is the "+12% vs last week" badge and is null on
// the two cards the design gives a plain subtitle instead — a card that has no
// week-on-week comparison says what the number is rather than inventing a
// change. `value` is pre-formatted because "82%" and "284" are different shapes.
export type DashboardStat = {
  label: string;
  value: string;
  trend: number | null;
  caption: string;
};

// Recent Activity. Feature 16 merges agent_runs and researched jobs into this
// shape; feature 14 renders it from a mock list. The kind drives the dot colour
// and nothing else — build-plan.md feature 16 fixes the two entry types.
//
// A plain union rather than a const array, unlike JOB_MATCH_FILTERS and
// JOB_SORTS. Those exist as arrays because the URL parser validates an untrusted
// string against them at runtime; this value is only ever constructed by the
// code that builds the entry, so an array here would be a list with no reader.
export type ActivityKind = "search" | "research";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  message: string;
  // ISO timestamp, not a rendered string. formatRelativeTime() turns it into
  // "10 minutes ago" at render, so feature 16 changes the data source and
  // nothing else — the same split feature 09 made on the Date Found column.
  at: string;
};

// One plotted value. Every dashboard chart is a labelled series over a small
// number of buckets — days of the week, or score ranges.
export type ChartPoint = {
  label: string;
  value: number;
};
