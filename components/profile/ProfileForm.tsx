"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { saveProfile } from "@/actions/profile";
import { TagInput } from "@/components/profile/TagInput";
import { WorkExperienceCard } from "@/components/profile/WorkExperienceCard";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPTY_ROLE, toFormValues } from "@/lib/profile";
import { cn, MAX_WORK_EXPERIENCE } from "@/lib/utils";
import type {
  EducationEntry,
  Profile,
  ProfileFormValues,
  WorkExperienceEntry,
} from "@/types";

const EXPERIENCE_LEVEL_OPTIONS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
] as const;

const WORK_AUTHORIZATION_OPTIONS = [
  { value: "citizen", label: "Citizen" },
  { value: "permanent_resident", label: "Permanent resident" },
  { value: "visa_required", label: "Visa required" },
] as const;

const REMOTE_PREFERENCE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
] as const;

const DEGREE_OPTIONS = [
  "High School",
  "Associate",
  "Bachelor's",
  "Master's",
  "PhD",
  "Bootcamp",
  "Self-taught",
] as const;

type SectionProps = {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

function Section({ title, action, children }: SectionProps) {
  return (
    <section className="border-t border-border pt-8">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

type Status = { kind: "error" | "success"; message: string } | null;

type Props = {
  profile: Profile | null;
  email: string;
};

export function ProfileForm({ profile, email }: Props) {
  const [values, setValues] = useState<ProfileFormValues>(() => ({
    ...toFormValues(profile),
    // Shown disabled and always written from the session — the row's own email
    // column is only a copy, and on a first save there is no row to copy from.
    email,
  }));
  const [status, setStatus] = useState<Status>(null);
  const [isSaving, startSaving] = useTransition();

  function setValue<Key extends keyof ProfileFormValues>(
    key: Key,
    value: ProfileFormValues[Key],
  ): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setEducation(patch: Partial<EducationEntry>): void {
    setValues((current) => ({
      ...current,
      education: { ...current.education, ...patch },
    }));
  }

  function setRole(index: number, role: WorkExperienceEntry): void {
    setValues((current) => ({
      ...current,
      work_experience: current.work_experience.map((existing, position) =>
        position === index ? role : existing,
      ),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setStatus(null);

    startSaving(async () => {
      const result = await saveProfile(values);

      if (result.success) {
        // Adopt what was actually stored — trimmed, comma lists split, blank
        // roles dropped — so the form shows the row rather than the draft.
        if (result.values) {
          setValues(result.values);
        }
        setStatus({ kind: "success", message: "Profile saved." });
        return;
      }

      setStatus({
        kind: "error",
        message: result.error ?? "Could not save your profile.",
      });
    });
  }

  const canAddRole = values.work_experience.length < MAX_WORK_EXPERIENCE;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Profile Information
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            This context is used to accurately represent you in agent
            interactions.
          </p>
        </div>

        <Section title="Personal Info">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="full-name">
              <Input
                id="full-name"
                value={values.full_name}
                placeholder="Your name"
                onChange={(event) => setValue("full_name", event.target.value)}
              />
            </Field>

            <Field label="Email" htmlFor="email">
              <Input id="email" value={values.email} disabled readOnly />
            </Field>

            <Field label="Phone number" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                value={values.phone}
                placeholder="+1 (555) 000-0000"
                onChange={(event) => setValue("phone", event.target.value)}
              />
            </Field>

            <Field label="Location" htmlFor="location">
              <Input
                id="location"
                value={values.location}
                placeholder="City, Country"
                onChange={(event) => setValue("location", event.target.value)}
              />
            </Field>

            <Field label="LinkedIn URL" htmlFor="linkedin">
              <Input
                id="linkedin"
                type="url"
                value={values.linkedin_url}
                placeholder="https://linkedin.com/in/you"
                onChange={(event) =>
                  setValue("linkedin_url", event.target.value)
                }
              />
            </Field>

            <Field label="Portfolio / GitHub" htmlFor="portfolio">
              <Input
                id="portfolio"
                type="url"
                value={values.portfolio_url}
                placeholder="https://github.com/you"
                onChange={(event) =>
                  setValue("portfolio_url", event.target.value)
                }
              />
            </Field>

            <Field label="Work authorization" htmlFor="work-authorization">
              <Select
                id="work-authorization"
                value={values.work_authorization}
                onChange={(event) =>
                  setValue("work_authorization", event.target.value)
                }
              >
                <option value="">Select…</option>
                {WORK_AUTHORIZATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>

        <Section title="Professional Info">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Current / recent job title"
              htmlFor="current-title"
              className="sm:col-span-2"
            >
              <Input
                id="current-title"
                value={values.current_title}
                placeholder="E.g. Frontend Engineer"
                onChange={(event) =>
                  setValue("current_title", event.target.value)
                }
              />
            </Field>

            <Field label="Experience level" htmlFor="experience-level">
              <Select
                id="experience-level"
                value={values.experience_level}
                onChange={(event) =>
                  setValue("experience_level", event.target.value)
                }
              >
                <option value="">Select…</option>
                {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Years of experience" htmlFor="years-experience">
              <Input
                id="years-experience"
                type="number"
                min={0}
                max={60}
                value={values.years_experience}
                placeholder="0"
                onChange={(event) =>
                  setValue("years_experience", event.target.value)
                }
              />
            </Field>

            <div className="sm:col-span-2">
              <TagInput
                id="skills"
                label="Skills"
                placeholder="Add a skill"
                values={values.skills}
                onChange={(next) => setValue("skills", next)}
              />
            </div>

            <div className="sm:col-span-2">
              <TagInput
                id="industries"
                label="Industries worked in (optional)"
                placeholder="E.g. FinTech, Healthcare"
                values={values.industries}
                onChange={(next) => setValue("industries", next)}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Work Experience"
          action={
            <button
              type="button"
              disabled={!canAddRole}
              onClick={() =>
                setValue("work_experience", [
                  ...values.work_experience,
                  EMPTY_ROLE,
                ])
              }
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-dark focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus aria-hidden className="size-4" />
              Add role
            </button>
          }
        >
          <div className="space-y-5">
            {values.work_experience.map((role, index) => (
              <WorkExperienceCard
                key={index}
                index={index}
                value={role}
                onChange={(next) => setRole(index, next)}
                onRemove={
                  values.work_experience.length > 1
                    ? () =>
                        setValue(
                          "work_experience",
                          values.work_experience.filter(
                            (_, position) => position !== index,
                          ),
                        )
                    : null
                }
              />
            ))}
          </div>
        </Section>

        <Section title="Education">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Highest degree" htmlFor="degree">
              <Select
                id="degree"
                value={values.education.degree}
                onChange={(event) => setEducation({ degree: event.target.value })}
              >
                <option value="">Select…</option>
                {DEGREE_OPTIONS.map((degree) => (
                  <option key={degree} value={degree}>
                    {degree}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Field of study" htmlFor="field-of-study">
              <Input
                id="field-of-study"
                value={values.education.field}
                placeholder="E.g. Computer Science"
                onChange={(event) => setEducation({ field: event.target.value })}
              />
            </Field>

            <Field label="Institution name" htmlFor="institution">
              <Input
                id="institution"
                value={values.education.institution}
                placeholder="E.g. State University"
                onChange={(event) =>
                  setEducation({ institution: event.target.value })
                }
              />
            </Field>

            <Field label="Graduation year" htmlFor="graduation-year">
              <Input
                id="graduation-year"
                inputMode="numeric"
                maxLength={4}
                value={values.education.graduation_year}
                placeholder="YYYY"
                onChange={(event) =>
                  setEducation({ graduation_year: event.target.value })
                }
              />
            </Field>
          </div>
        </Section>

        <Section title="Job Preferences">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Job titles seeking"
              htmlFor="job-titles"
              className="sm:col-span-2"
            >
              <Input
                id="job-titles"
                value={values.job_titles_seeking}
                placeholder="E.g. Frontend Engineer, React Developer"
                onChange={(event) =>
                  setValue("job_titles_seeking", event.target.value)
                }
              />
            </Field>

            <Field label="Remote preference" htmlFor="remote-preference">
              <Select
                id="remote-preference"
                value={values.remote_preference}
                onChange={(event) =>
                  setValue("remote_preference", event.target.value)
                }
              >
                <option value="">Select…</option>
                {REMOTE_PREFERENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Salary expectation (optional)"
              htmlFor="salary-expectation"
            >
              <Input
                id="salary-expectation"
                value={values.salary_expectation}
                placeholder="E.g. $120k+"
                onChange={(event) =>
                  setValue("salary_expectation", event.target.value)
                }
              />
            </Field>

            <Field
              label="Preferred locations (optional)"
              htmlFor="preferred-locations"
              className="sm:col-span-2"
            >
              <Input
                id="preferred-locations"
                value={values.preferred_locations}
                placeholder="E.g. New York, London"
                onChange={(event) =>
                  setValue("preferred_locations", event.target.value)
                }
              />
            </Field>
          </div>
        </Section>
      </div>

      {status ? (
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={cn(
            "mt-8 rounded-md border px-3 py-2 text-sm text-text-primary",
            status.kind === "error"
              ? "border-error/30 bg-error/10"
              : "border-success/30 bg-success-lightest",
          )}
        >
          {status.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isSaving}
        className={cn("h-12 w-full", status ? "mt-4" : "mt-8")}
      >
        {isSaving ? "Saving…" : "Save Profile"}
      </Button>
    </form>
  );
}
