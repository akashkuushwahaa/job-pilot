import type { Profile } from "@/types";

export type Completeness = {
  percent: number;
  missing: string[];
  isComplete: boolean;
};

// The single source of truth for "is this profile complete". Nothing about
// completeness is stored on the row: redefining the rules here needs no backfill
// migration and can never go stale against a cached copy.
//
// These ten fields are what job matching actually reads. Everything else on the
// profile — LinkedIn, portfolio, work authorization, industries, job preferences,
// the resume — improves results without being required for them.
const REQUIRED_FIELDS: ReadonlyArray<{
  label: string;
  isFilled: (profile: Profile) => boolean;
}> = [
  { label: "Full name", isFilled: (p) => hasText(p.full_name) },
  { label: "Email", isFilled: (p) => hasText(p.email) },
  { label: "Phone", isFilled: (p) => hasText(p.phone) },
  { label: "Location", isFilled: (p) => hasText(p.location) },
  { label: "Job title", isFilled: (p) => hasText(p.current_title) },
  { label: "Experience level", isFilled: (p) => p.experience_level !== null },
  {
    label: "Years of experience",
    isFilled: (p) => p.years_experience !== null && p.years_experience >= 0,
  },
  { label: "Skills", isFilled: (p) => p.skills.length > 0 },
  {
    label: "Work experience",
    isFilled: (p) =>
      p.work_experience.some(
        (role) => hasText(role.company) && hasText(role.title),
      ),
  },
  {
    label: "Education",
    isFilled: (p) =>
      p.education !== null &&
      hasText(p.education.degree) &&
      hasText(p.education.field) &&
      hasText(p.education.institution),
  },
];

function hasText(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

export function completeness(profile: Profile | null): Completeness {
  if (profile === null) {
    return {
      percent: 0,
      missing: REQUIRED_FIELDS.map((field) => field.label),
      isComplete: false,
    };
  }

  const missing = REQUIRED_FIELDS.filter(
    (field) => !field.isFilled(profile),
  ).map((field) => field.label);

  const filled = REQUIRED_FIELDS.length - missing.length;

  return {
    percent: Math.round((filled / REQUIRED_FIELDS.length) * 100),
    missing,
    isComplete: missing.length === 0,
  };
}
