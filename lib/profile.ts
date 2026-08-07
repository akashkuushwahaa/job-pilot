import { z } from "zod";

import type { InsforgeServerClient } from "@/lib/insforge-server";
import {
  EXPERIENCE_LEVELS,
  REMOTE_PREFERENCES,
  WORK_AUTHORIZATIONS,
  type EducationEntry,
  type ExperienceLevel,
  type Profile,
  type ProfileFields,
  type ProfileFormValues,
  type RemotePreference,
  type WorkAuthorization,
  type WorkExperienceEntry,
} from "@/types";

// Both directions of the row <-> form mapping live here, side by side. Split
// across two files they drift: a column added to one and forgotten in the other
// is silent, because every field is optional on the way in.

export type ProfileRow = Omit<ProfileFields, "resume_path">;

// The caller's own profile row, or null if they have never saved one — there is
// no row until the first save, so every read has to handle absence.
//
// **A read failure throws rather than degrading to null.** The two callers both
// render something consequential off the answer: /profile would show an empty
// form over real saved data and let the next save blank it, and /dashboard would
// show the needs-attention banner over a profile that is actually complete. An
// unreadable row is not an absent one.
//
// Lives here rather than in each page because both were running the identical
// query, the identical error branch and the identical parse — architecture.md
// scopes app/ to pages, not to data access.
export async function fetchProfile(
  insforge: InsforgeServerClient,
  userId: string,
  caller: string,
): Promise<Profile | null> {
  const { data, error } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(`[${caller}] profile read failed`, error);
    throw new Error("Profile unavailable");
  }

  return parseProfile(data);
}

export const EMPTY_ROLE: WorkExperienceEntry = {
  company: "",
  title: "",
  start_date: "",
  end_date: "",
  currently_working: false,
  responsibilities: "",
};

export const EMPTY_EDUCATION: EducationEntry = {
  degree: "",
  field: "",
  institution: "",
  graduation_year: "",
};

const EducationSchema = z.object({
  degree: z.string().catch(""),
  field: z.string().catch(""),
  institution: z.string().catch(""),
  graduation_year: z.string().catch(""),
});

const RoleSchema = z.object({
  company: z.string().catch(""),
  title: z.string().catch(""),
  start_date: z.string().catch(""),
  end_date: z.string().nullable().catch(null),
  currently_working: z.boolean().catch(false),
  responsibilities: z.string().catch(""),
});

// The SDK hands back PostgREST rows as `any`. Annotating the variable would only
// rename the `any`; this actually checks it. Every field carries `.catch()` so a
// single drifted column degrades to its empty value instead of taking the page
// down — jsonb in particular is structurally unchecked by Postgres, so nothing
// upstream guarantees the shape of education or work_experience.
const ProfileSchema = z.object({
  id: z.string(),
  full_name: z.string().nullable().catch(null),
  email: z.string().nullable().catch(null),
  phone: z.string().nullable().catch(null),
  location: z.string().nullable().catch(null),
  current_title: z.string().nullable().catch(null),
  experience_level: z.enum(EXPERIENCE_LEVELS).nullable().catch(null),
  years_experience: z.number().int().nullable().catch(null),
  skills: z.array(z.string()).catch([]),
  industries: z.array(z.string()).catch([]),
  work_experience: z.array(RoleSchema).catch([]),
  education: EducationSchema.nullable().catch(null),
  job_titles_seeking: z.array(z.string()).catch([]),
  remote_preference: z.enum(REMOTE_PREFERENCES).nullable().catch(null),
  preferred_locations: z.array(z.string()).catch([]),
  salary_expectation: z.string().nullable().catch(null),
  linkedin_url: z.string().nullable().catch(null),
  portfolio_url: z.string().nullable().catch(null),
  work_authorization: z.enum(WORK_AUTHORIZATIONS).nullable().catch(null),
  resume_path: z.string().nullable().catch(null),
  updated_at: z.string().catch(""),
});

// Absent row -> null. Present but unrecognisable -> throw, never null: rendering
// an empty form over a row we failed to read invites the next save to overwrite
// real data with blanks.
export function parseProfile(row: unknown): Profile | null {
  if (row === null || row === undefined) {
    return null;
  }

  const parsed = ProfileSchema.safeParse(row);

  if (!parsed.success) {
    console.error("[lib/profile] unreadable profiles row", parsed.error.issues);
    throw new Error("Unreadable profile row");
  }

  return parsed.data;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Narrowing through the const arrays rather than asserting: an unrecognised value
// becomes null instead of reaching the column's CHECK constraint, where it would
// surface to the user as a raw Postgres error.
function asExperienceLevel(value: string): ExperienceLevel | null {
  return EXPERIENCE_LEVELS.find((level) => level === value) ?? null;
}

function asRemotePreference(value: string): RemotePreference | null {
  return REMOTE_PREFERENCES.find((preference) => preference === value) ?? null;
}

function asWorkAuthorization(value: string): WorkAuthorization | null {
  return WORK_AUTHORIZATIONS.find((status) => status === value) ?? null;
}

// profiles.years_experience carries CHECK (years_experience >= 0). Anything that
// is not a non-negative integer becomes null rather than reaching Postgres, where
// it would fail the whole save and surface only as a generic error. null reads as
// "not provided", which completeness() already reports back to the user.
function asYearsExperience(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const years = Number.parseInt(trimmed, 10);

  return Number.isSafeInteger(years) ? years : null;
}

function isMeaningfulRole(role: WorkExperienceEntry): boolean {
  return role.company.trim().length > 0 || role.title.trim().length > 0;
}

function isMeaningfulEducation(education: EducationEntry): boolean {
  return (
    education.degree.trim().length > 0 ||
    education.field.trim().length > 0 ||
    education.institution.trim().length > 0 ||
    education.graduation_year.trim().length > 0
  );
}

export function toFormValues(profile: ProfileFields | null): ProfileFormValues {
  if (profile === null) {
    return {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      linkedin_url: "",
      portfolio_url: "",
      work_authorization: "",
      current_title: "",
      experience_level: "",
      years_experience: "",
      skills: [],
      industries: [],
      work_experience: [EMPTY_ROLE],
      education: EMPTY_EDUCATION,
      job_titles_seeking: "",
      remote_preference: "",
      salary_expectation: "",
      preferred_locations: "",
    };
  }

  return {
    full_name: profile.full_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    portfolio_url: profile.portfolio_url ?? "",
    work_authorization: profile.work_authorization ?? "",
    current_title: profile.current_title ?? "",
    experience_level: profile.experience_level ?? "",
    years_experience:
      profile.years_experience === null ? "" : String(profile.years_experience),
    skills: profile.skills,
    industries: profile.industries,
    work_experience:
      profile.work_experience.length > 0 ? profile.work_experience : [EMPTY_ROLE],
    education: profile.education ?? EMPTY_EDUCATION,
    job_titles_seeking: profile.job_titles_seeking.join(", "),
    remote_preference: profile.remote_preference ?? "",
    salary_expectation: profile.salary_expectation ?? "",
    preferred_locations: profile.preferred_locations.join(", "),
  };
}

// email and resume_path are deliberately not taken from the client. email comes
// from the session — the field is disabled in the UI, so a payload carrying a
// different one is tampering. resume_path is owned entirely by the resume route
// and must never be overwritten by a profile save.
const TEXT_KEYS = [
  "full_name",
  "email",
  "phone",
  "location",
  "linkedin_url",
  "portfolio_url",
  "work_authorization",
  "current_title",
  "experience_level",
  "years_experience",
  "job_titles_seeking",
  "remote_preference",
  "salary_expectation",
  "preferred_locations",
] as const satisfies ReadonlyArray<keyof ProfileFormValues>;

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index]);
}

function sameRole(a: WorkExperienceEntry, b: WorkExperienceEntry): boolean {
  return (
    a.company === b.company &&
    a.title === b.title &&
    a.start_date === b.start_date &&
    // "" and null both mean "no end date" — they arrive from different places
    // (an empty control, a jsonb null) and must not read as a difference.
    (a.end_date ?? "") === (b.end_date ?? "") &&
    a.currently_working === b.currently_working &&
    a.responsibilities === b.responsibilities
  );
}

// Compared field by field rather than by JSON.stringify: work_experience entries
// reach the form from three places — EMPTY_ROLE, resume extraction, and a jsonb
// column that returns its keys in Postgres's own order — so two structurally
// identical roles can serialise to different strings.
export function isSameFormValues(
  a: ProfileFormValues,
  b: ProfileFormValues,
): boolean {
  return (
    TEXT_KEYS.every((key) => a[key] === b[key]) &&
    sameList(a.skills, b.skills) &&
    sameList(a.industries, b.industries) &&
    a.work_experience.length === b.work_experience.length &&
    a.work_experience.every((role, index) => sameRole(role, b.work_experience[index])) &&
    a.education.degree === b.education.degree &&
    a.education.field === b.education.field &&
    a.education.institution === b.education.institution &&
    a.education.graduation_year === b.education.graduation_year
  );
}

export function toProfileRow(
  values: ProfileFormValues,
  userId: string,
  email: string,
): ProfileRow {
  return {
    id: userId,
    email,
    full_name: trimmedOrNull(values.full_name),
    phone: trimmedOrNull(values.phone),
    location: trimmedOrNull(values.location),
    current_title: trimmedOrNull(values.current_title),
    experience_level: asExperienceLevel(values.experience_level),
    years_experience: asYearsExperience(values.years_experience),
    skills: values.skills,
    industries: values.industries,
    work_experience: values.work_experience.filter(isMeaningfulRole),
    education: isMeaningfulEducation(values.education) ? values.education : null,
    job_titles_seeking: splitList(values.job_titles_seeking),
    remote_preference: asRemotePreference(values.remote_preference),
    preferred_locations: splitList(values.preferred_locations),
    salary_expectation: trimmedOrNull(values.salary_expectation),
    linkedin_url: trimmedOrNull(values.linkedin_url),
    portfolio_url: trimmedOrNull(values.portfolio_url),
    work_authorization: asWorkAuthorization(values.work_authorization),
  };
}
