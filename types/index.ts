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

