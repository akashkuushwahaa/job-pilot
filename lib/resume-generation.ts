import { z } from "zod";

import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import { MAX_WORK_EXPERIENCE } from "@/lib/utils";
import type { Profile, WorkExperienceEntry } from "@/types";

// library-docs.md: 0.7 for resume generation, 1000 tokens for this call.
// Warmer than extraction on purpose — this one is writing prose, not reading it.
const TEMPERATURE = 0.7;
const MAX_TOKENS = 1000;

// The single-page budget. react-pdf paginates silently rather than refusing to
// overflow, so the only real control over page count is how much goes in.
const MAX_BULLETS_PER_ROLE = 4;

// Facts the model receives but never restates. Everything structural — company
// names, titles, dates, degree, institution — is rendered straight off the row.
// A model that can retype your employer's name can also invent one.
export type ResumeRole = WorkExperienceEntry & { bullets: string[] };

export type ResumeContent = {
  summary: string;
  roles: ResumeRole[];
};

export type GenerationResult =
  | { success: true; content: ResumeContent }
  | { success: false; error: string };

const UNAVAILABLE =
  "Could not generate your resume right now. Please retry in a moment.";

const ContentSchema = z.object({
  summary: z.string().catch(""),
  roles: z
    .array(z.object({ bullets: z.array(z.string()).catch([]) }))
    .catch([]),
});

const SYSTEM_PROMPT =
  "You are an expert resume writer. You rewrite a candidate's own material into " +
  "clean professional resume language. You never invent an employer, a date, a " +
  "metric, a technology, or an achievement that is not in the material you were " +
  "given — a resume is a claim the candidate has to defend in an interview. You " +
  "return one JSON object and nothing else.";

function fieldRules(roleCount: number): string {
  return `Return a JSON object with exactly these keys:

- "summary": a professional summary of 2 to 3 sentences, under 400 characters.
  Written in resume voice — no "I", no "he", no "she", no "they". Ground it in
  the candidate's stated title, years of experience, skills and industries.
  Never state an achievement, metric or employer that is not given below.
- "roles": an array of exactly ${roleCount} objects, in the same order as the
  roles listed below. The first object describes the first role, and so on.
  Each object is { "bullets": string[] }.
  - Between 2 and ${MAX_BULLETS_PER_ROLE} bullets per role.
  - Each bullet is one line, under 160 characters, no trailing period needed,
    starting with a strong verb. Past tense, except for a role marked as current.
  - Every bullet must be a rewrite of that role's own responsibilities text.
    Sharpen the language; do not add scope, numbers, or technologies that the
    responsibilities text does not mention.
  - If a role's responsibilities text is empty, return an empty array for that
    role. Never invent duties to fill a gap.

Do not explain your answer. Return only the JSON object.`;
}

function describeRole(role: WorkExperienceEntry, index: number): string {
  const period = role.currently_working
    ? `${role.start_date || "unknown start"} to present`
    : `${role.start_date || "unknown start"} to ${role.end_date || "unknown end"}`;

  return [
    // The tense rule is repeated on the role itself, not left in the rules
    // block alone: stated only once up top, the model wrote the current role in
    // past tense anyway.
    `Role ${index + 1}${role.currently_working ? " (CURRENT ROLE — write these bullets in present tense)" : ""}:`,
    `  Title: ${role.title || "not stated"}`,
    `  Company: ${role.company || "not stated"}`,
    `  Period: ${period}`,
    `  Responsibilities: ${role.responsibilities || "(none given)"}`,
  ].join("\n");
}

function describeProfile(profile: Profile, roles: WorkExperienceEntry[]): string {
  const lines = [
    `Current title: ${profile.current_title ?? "not stated"}`,
    `Experience level: ${profile.experience_level ?? "not stated"}`,
    `Years of experience: ${profile.years_experience ?? "not stated"}`,
    `Location: ${profile.location ?? "not stated"}`,
    `Skills: ${profile.skills.length > 0 ? profile.skills.join(", ") : "none listed"}`,
    `Industries: ${profile.industries.length > 0 ? profile.industries.join(", ") : "none listed"}`,
  ];

  if (profile.education !== null) {
    lines.push(
      `Education: ${profile.education.degree} in ${profile.education.field}, ` +
        `${profile.education.institution}`,
    );
  }

  return `${lines.join("\n")}\n\n${roles.map(describeRole).join("\n\n")}`;
}

// The same roles the renderer draws, chosen once here so the two can never
// disagree about which role bullet index 2 belongs to.
export function selectRoles(profile: Profile): WorkExperienceEntry[] {
  return profile.work_experience
    .filter((role) => role.company.trim().length > 0 || role.title.trim().length > 0)
    .slice(0, MAX_WORK_EXPERIENCE);
}

function toBullets(raw: string[] | undefined, role: WorkExperienceEntry): string[] {
  const bullets = (raw ?? [])
    .map((bullet) => bullet.trim())
    .filter((bullet) => bullet.length > 0)
    .slice(0, MAX_BULLETS_PER_ROLE);

  if (bullets.length > 0) {
    return bullets;
  }

  // The model skipped this role, or returned fewer entries than there are roles.
  // The candidate's own text is a worse bullet than a rewritten one and a far
  // better one than someone else's — misaligned bullets would attribute one
  // employer's work to another.
  const fallback = role.responsibilities.trim();

  return fallback.length > 0 ? [fallback] : [];
}

export async function generateResumeContent(
  profile: Profile,
): Promise<GenerationResult> {
  const roles = selectRoles(profile);
  const openai = getOpenAI();

  if (openai === null) {
    return { success: false, error: UNAVAILABLE };
  }

  const today = new Date().toISOString().slice(0, 10);

  let content: string | null;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      temperature: TEMPERATURE,
      max_completion_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          // Today's date for the same reason extraction needs it: a role with no
          // end date runs to now, and a model left to assume the present anchors
          // on its own training cutoff.
          content:
            `Today's date is ${today}.\n\n${fieldRules(roles.length)}\n\n` +
            `Candidate material:\n\n${describeProfile(profile, roles)}`,
        },
      ],
    });

    content = response.choices[0]?.message.content ?? null;

    if (response.choices[0]?.finish_reason === "length") {
      console.error("[lib/resume-generation] response hit the token ceiling");
    }
  } catch (error) {
    console.error("[lib/resume-generation] model call failed", error);
    return { success: false, error: UNAVAILABLE };
  }

  if (content === null) {
    console.error("[lib/resume-generation] model returned no content");
    return { success: false, error: UNAVAILABLE };
  }

  let json: unknown;

  try {
    json = JSON.parse(content);
  } catch (error) {
    console.error("[lib/resume-generation] response was not JSON", error);
    return { success: false, error: UNAVAILABLE };
  }

  const parsed = ContentSchema.safeParse(json);

  if (!parsed.success) {
    console.error(
      "[lib/resume-generation] unreadable response",
      parsed.error.issues,
    );
    return { success: false, error: UNAVAILABLE };
  }

  const summary = parsed.data.summary.trim();

  // Nothing is uploaded on a failure, so the stored resume survives. Rendering a
  // summary-less document over someone's real resume is worse than not
  // generating: the failure is at least something they can retry.
  if (summary.length === 0) {
    console.error("[lib/resume-generation] model returned no summary");
    return { success: false, error: UNAVAILABLE };
  }

  return {
    success: true,
    content: {
      summary,
      roles: roles.map((role, index) => ({
        ...role,
        bullets: toBullets(parsed.data.roles[index]?.bullets, role),
      })),
    },
  };
}
