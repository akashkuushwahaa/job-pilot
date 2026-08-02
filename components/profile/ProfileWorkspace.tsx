"use client";

import { useState } from "react";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { toFormValues } from "@/lib/profile";
import type { ExtractedFormValues, Profile, ProfileFormValues } from "@/types";

type Props = {
  profile: Profile | null;
  email: string;
};

// Form state lives here rather than in ProfileForm because two cards now write
// to it: the form itself, and the Extract button over in the Resume card. This
// is the lowest node that owns both.
export function ProfileWorkspace({ profile, email }: Props) {
  const [values, setValues] = useState<ProfileFormValues>(() => ({
    ...toFormValues(profile),
    // Shown disabled and always written from the session — the row's own email
    // column is only a copy, and on a first save there is no row to copy from.
    email,
  }));

  // Extraction only ever sends keys the resume actually spoke to, so spreading
  // is the whole merge rule: named fields win, unnamed fields keep what the user
  // typed. Nothing is persisted, so a page refresh undoes all of it.
  function applyExtracted(extracted: ExtractedFormValues): void {
    setValues((current) => {
      const { education, ...rest } = extracted;

      return {
        ...current,
        ...rest,
        education: { ...current.education, ...education },
      };
    });
  }

  return (
    <>
      <ResumeUpload
        resumePath={profile?.resume_path ?? null}
        onExtracted={applyExtracted}
      />
      <ProfileForm values={values} setValues={setValues} />
    </>
  );
}
