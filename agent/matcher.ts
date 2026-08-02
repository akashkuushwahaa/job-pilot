import { z } from "zod";

import type { AdzunaJob } from "@/lib/adzuna";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import type { Profile } from "@/types";
import type { JobScore } from "@/agent/types";

// library-docs.md fixes both values for matching specifically.
const TEMPERATURE = 0.3;
const MAX_TOKENS = 300;

const MAX_REASON_LENGTH = 600;

const ScoreSchema = z.object({
  matchScore: z.number().catch(0),
  matchReason: z.string().catch(""),
  matchedSkills: z.array(z.string()).catch([]),
  missingSkills: z.array(z.string()).catch([]),
});

const SYSTEM_PROMPT =
  "You score how well one job fits one candidate. You judge only from the " +
  "profile and the listing you are given — you never assume experience the " +
  "profile does not state, and you never invent a requirement the listing " +
  "does not mention. You return one JSON object and nothing else.";

// Skills are compared on letters and digits alone so that "Node.js" matches
// "nodejs" and "React " matches "React". Anything looser starts matching
// substrings — "Java" inside "JavaScript" — which is exactly the wrong error.
function normaliseSkill(skill: string): string {
  return skill.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// matched_skills is a claim about the candidate, and it is rendered on the job
// details page as though the candidate made it. So the model's answer is
// filtered back down to skills the profile actually lists rather than trusted:
// the same rule feature 08 applied to the resume, where the model writes prose
// and every fact is rendered from the row. missingSkills is a claim about the
// *job*, so there is nothing to check it against and it passes through.
function keepRealSkills(claimed: string[], profileSkills: string[]): string[] {
  const owned = new Map(
    profileSkills.map((skill) => [normaliseSkill(skill), skill]),
  );

  const kept: string[] = [];

  for (const skill of claimed) {
    const match = owned.get(normaliseSkill(skill));

    // The profile's own spelling wins — it is the candidate's to present.
    if (match !== undefined && !kept.includes(match)) {
      kept.push(match);
    }
  }

  return kept;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  // The column carries CHECK (match_score BETWEEN 0 AND 100); a model that
  // answers 9.5 or 150 must not fail the whole row's insert.
  return Math.min(100, Math.max(0, Math.round(value)));
}

function describeProfile(profile: Profile): string {
  const roles = profile.work_experience
    .filter((role) => role.company.length > 0 || role.title.length > 0)
    .map(
      (role) =>
        `- ${role.title || "Unspecified role"} at ${role.company || "unspecified company"}` +
        (role.responsibilities.length > 0 ? `: ${role.responsibilities}` : ""),
    )
    .join("\n");

  return [
    `Current title: ${profile.current_title ?? "not stated"}`,
    `Experience level: ${profile.experience_level ?? "not stated"}`,
    `Years of experience: ${profile.years_experience ?? "not stated"}`,
    `Location: ${profile.location ?? "not stated"}`,
    `Skills: ${profile.skills.join(", ") || "none listed"}`,
    `Industries: ${profile.industries.join(", ") || "none listed"}`,
    `Work history:\n${roles || "- none listed"}`,
  ].join("\n");
}

function describeJob(job: AdzunaJob): string {
  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location ?? "not stated"}`,
    `Salary: ${job.salary ?? "not stated"}`,
    `Type: ${job.jobType ?? "not stated"}`,
    // Attached to the description itself rather than stated once in the shared
    // rules above. Feature 08 learned this the hard way: a rule sitting at the
    // top of the prompt is weaker than the same rule attached to the item it
    // governs, which is why the model kept writing the current role in past
    // tense until the role itself carried the instruction.
    `Description (TRUNCATED — this is a 500-character snippet that cuts off mid-sentence. Score on what is here. Never treat a requirement's absence from this snippet as evidence the job does not have it, and never penalise the candidate for it):\n${job.description || "not provided"}`,
  ].join("\n");
}

const RULES = `Return a JSON object with exactly these keys:

- "matchScore": integer 0-100. How well this candidate fits this job.
  90+ means they clearly meet the bar and the role is a step they are ready for.
  70-89 means a solid fit with some gaps. Below 50 means a different discipline
  or a level they are not close to. Judge the whole picture — seniority, domain
  and skills together — not the count of overlapping keywords.
- "matchReason": one paragraph, under 100 words, addressed to the candidate as
  "you". Say concretely why this score, naming their actual experience and the
  job's actual requirements. No hedging, no generic career advice.
- "matchedSkills": array of skills the candidate lists that this job calls for.
  Use their exact spelling from the profile. [] if none overlap.
- "missingSkills": array of skills the job calls for that the profile does not
  list. Short tags, not sentences. [] if nothing is missing.

Do not explain your answer outside the JSON.`;

export async function scoreJob(
  job: AdzunaJob,
  profile: Profile,
): Promise<JobScore> {
  const openai = getOpenAI();

  // Thrown rather than returned: agent/adzuna.ts runs these through
  // Promise.allSettled, so a rejection is how one job drops out of the run
  // without taking the other nine with it.
  if (openai === null) {
    throw new Error("OpenAI is not configured");
  }

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: TEMPERATURE,
    max_completion_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${RULES}\n\nCANDIDATE PROFILE:\n${describeProfile(profile)}\n\nJOB:\n${describeJob(job)}`,
      },
    ],
  });

  const choice = response.choices[0];

  // json_object guarantees valid JSON only for a response that completed. Named
  // separately so the log distinguishes a truncation from a malformed answer.
  if (choice?.finish_reason === "length") {
    throw new Error("scoring response hit the token ceiling");
  }

  const content = choice?.message.content;

  if (!content) {
    throw new Error("scoring response was empty");
  }

  const parsed = ScoreSchema.safeParse(JSON.parse(content));

  // Every field catches, so failing here means the response was not an object
  // at all — a bare array or string. Nothing to salvage.
  if (!parsed.success) {
    throw new Error("scoring response was not an object");
  }

  return {
    matchScore: clampScore(parsed.data.matchScore),
    matchReason: parsed.data.matchReason.trim().slice(0, MAX_REASON_LENGTH),
    matchedSkills: keepRealSkills(parsed.data.matchedSkills, profile.skills),
    missingSkills: parsed.data.missingSkills
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0),
  };
}
