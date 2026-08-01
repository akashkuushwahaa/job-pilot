import {
  EMPTY_EDUCATION,
  EMPTY_ROLE,
  EXPERIENCE_LEVELS,
  REMOTE_PREFERENCES,
  WORK_AUTHORIZATIONS,
  type EducationEntry,
  type ExperienceLevel,
  type Profile,
  type ProfileFormValues,
  type RemotePreference,
  type WorkAuthorization,
  type WorkExperienceEntry,
} from "@/types";

// Both directions of the row <-> form mapping live here, side by side. Split
// across two files they drift: a column added to one and forgotten in the other
// is silent, because every field is optional on the way in.

export type ProfileRow = Omit<Profile, "updated_at" | "resume_path">;

export function splitList(value: string): string[] {
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

export function toFormValues(profile: Profile | null): ProfileFormValues {
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
