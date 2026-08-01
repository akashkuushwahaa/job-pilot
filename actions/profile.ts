"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import { createInsforgeServer } from "@/lib/insforge-server";
import { captureServerEvent } from "@/lib/posthog-server";
import { parseProfile, toFormValues, toProfileRow } from "@/lib/profile";
import { MAX_WORK_EXPERIENCE } from "@/lib/utils";
import type { ProfileFormValues } from "@/types";

const SHORT_TEXT = 200;
const LONG_TEXT = 2000;

// A Server Action is a public endpoint — this payload is whatever the network
// sends, not whatever the form rendered. Enum values are re-narrowed in
// toProfileRow as well; this layer exists to reject sizes and shapes before any
// of it reaches the database.
const RoleInput = z.object({
  company: z.string().max(SHORT_TEXT),
  title: z.string().max(SHORT_TEXT),
  start_date: z.string().max(SHORT_TEXT),
  end_date: z.string().max(SHORT_TEXT).nullable(),
  currently_working: z.boolean(),
  responsibilities: z.string().max(LONG_TEXT),
});

const EducationInput = z.object({
  degree: z.string().max(SHORT_TEXT),
  field: z.string().max(SHORT_TEXT),
  institution: z.string().max(SHORT_TEXT),
  graduation_year: z.string().max(SHORT_TEXT),
});

const ProfileInput = z.object({
  full_name: z.string().max(SHORT_TEXT),
  email: z.string().max(SHORT_TEXT),
  phone: z.string().max(SHORT_TEXT),
  location: z.string().max(SHORT_TEXT),
  linkedin_url: z.string().max(SHORT_TEXT),
  portfolio_url: z.string().max(SHORT_TEXT),
  work_authorization: z.string().max(SHORT_TEXT),
  current_title: z.string().max(SHORT_TEXT),
  experience_level: z.string().max(SHORT_TEXT),
  years_experience: z.string().max(10),
  skills: z.array(z.string().max(SHORT_TEXT)).max(100),
  industries: z.array(z.string().max(SHORT_TEXT)).max(100),
  work_experience: z.array(RoleInput).max(MAX_WORK_EXPERIENCE),
  education: EducationInput,
  job_titles_seeking: z.string().max(LONG_TEXT),
  remote_preference: z.string().max(SHORT_TEXT),
  salary_expectation: z.string().max(SHORT_TEXT),
  preferred_locations: z.string().max(LONG_TEXT),
});

type SaveResult = {
  success: boolean;
  error?: string;
  values?: ProfileFormValues;
};

export async function saveProfile(
  values: ProfileFormValues,
): Promise<SaveResult> {
  try {
    const user = await requireUser();

    const parsed = ProfileInput.safeParse(values);

    if (!parsed.success) {
      console.error("[actions/profile] invalid payload", parsed.error.issues);
      return {
        success: false,
        error: "Some of those details could not be saved. Please check and retry.",
      };
    }

    const insforge = await createInsforgeServer();

    // Read before writing so profile_completed can fire on the transition rather
    // than on every save. There is no is_complete column and deliberately so.
    const { data: existing, error: readError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[actions/profile] read failed", readError);
      return { success: false, error: "Could not save your profile. Please retry." };
    }

    const existingProfile = parseProfile(existing);

    const before = completeness(existingProfile);
    const row = toProfileRow(parsed.data, user.id, user.email ?? "");

    const { error: writeError } = await insforge.database
      .from("profiles")
      .upsert([row]);

    if (writeError) {
      console.error("[actions/profile] write failed", writeError);
      return { success: false, error: "Could not save your profile. Please retry." };
    }

    // resume_path is not part of `row`, so the saved profile is the merge of what
    // we just wrote over what was already there.
    const savedProfile = {
      ...row,
      resume_path: existingProfile?.resume_path ?? null,
    };

    const saved = completeness(savedProfile);

    if (!before.isComplete && saved.isComplete) {
      after(() => captureServerEvent(user.id, "profile_completed"));
    }

    revalidatePath("/profile");

    // Returned so the form can adopt the normalised values — trimmed strings,
    // comma lists split, blank roles dropped — without being remounted. Keying
    // the form on updated_at did that job before, but it also fired on a resume
    // upload, which bumps the same column and wiped whatever was being typed.
    return { success: true, values: toFormValues(savedProfile) };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[actions/profile] saveProfile", error);
    return { success: false, error: "Could not save your profile. Please retry." };
  }
}
