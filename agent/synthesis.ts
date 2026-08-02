import type { CompanyResearch } from "@/agent/browsing";
import { readDossier } from "@/lib/dossier";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import type { CompanyDossier, JobDetail, Profile } from "@/types";

// library-docs.md fixes the temperature at 0.4 for synthesis specifically:
// grounded, but loose enough to connect this candidate to this company rather
// than restating the inputs.
const TEMPERATURE = 0.4;

// library-docs.md's table says 800, and 800 does not fit this answer. Nine
// fields, six of them arrays, each item one to two sentences: a complete dossier
// measures 1,100-1,400 tokens, and the ceiling is what decides whether the
// response completes. Hitting it truncates mid-object, JSON.parse throws, and
// the run loses a dossier a Browserbase session was already spent producing —
// the exact failure library-docs.md's own finish_reason rule warns about.
// The prompt caps each array at four items to keep the answer well inside this.
const MAX_TOKENS = 1_600;

const MAX_ITEMS_PER_FIELD = 4;

// How much of the browser's haul reaches the prompt. Four sub-page extractions
// can return long lists with heavy overlap, and the model is being asked to
// synthesise, not to read everything twice.
const MAX_RESEARCH_ITEMS = 12;

const SYSTEM_PROMPT = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON.`;

const RULES = `Return a JSON object with exactly these keys:

- "companyOverview": string. What the company does, in 2-4 sentences.
- "techStack": array of technologies they use. Names, not sentences.
- "culture": array. Stated values and how the team works.
- "whyThisRole": string. Why this role exists and what it is for, 2-3 sentences.
- "yourEdge": array. Specific links between THIS candidate's experience and
  this company's stack, product or values.
- "gapsToAddress": array. Each missing skill reframed as a strategy — how to
  frame the gap honestly and what adjacent experience to lean on.
- "smartQuestions": array. Questions to ask in the interview that reference
  real details from the research.
- "interviewPrep": array. Topics this candidate should prepare for this role.

Every array holds at most ${MAX_ITEMS_PER_FIELD} items. Use [] or "" for
anything the inputs genuinely do not support — an empty field is better than an
invented one. Do not include a "sources" key; the pages visited are recorded
separately.

Do not explain your answer outside the JSON.`;

function list(values: string[]): string {
  const unique = [...new Set(values.map((value) => value.trim()))].filter(
    (value) => value.length > 0,
  );

  return unique.slice(0, MAX_RESEARCH_ITEMS).join("; ") || "none found";
}

function describeResearch(research: CompanyResearch): string {
  if (research.visited.length === 0) {
    return "No company website research was available for this run. Infer carefully from the job posting alone and say what is inferred.";
  }

  return [
    `One-liner: ${research.oneLiner || "not stated"}`,
    `Product: ${research.productSummary || "not stated"}`,
    `Signals: ${list(research.signals)}`,
    `Key points: ${list(research.keyPoints)}`,
    `Technologies mentioned: ${list(research.technologies)}`,
    `Values and culture: ${list(research.valuesOrCulture)}`,
    `Notable: ${list(research.notable)}`,
    `Pages read: ${research.visited.join(", ")}`,
  ].join("\n");
}

// The job description as it stands at synthesis time. When the backfill reached
// the real posting this is the whole thing; when it did not, it is Adzuna's
// snippet — which stops mid-sentence, so the model is told, exactly as
// agent/matcher.ts tells it.
function describeJob(job: JobDetail, isSnippet: boolean): string {
  const sections = [
    job.about_role === null ? null : `Description: ${job.about_role}`,
    job.responsibilities.length > 0
      ? `Responsibilities: ${job.responsibilities.join("; ")}`
      : null,
    job.requirements.length > 0
      ? `Requirements: ${job.requirements.join("; ")}`
      : null,
    job.benefits.length > 0 ? `Benefits: ${job.benefits.join("; ")}` : null,
    job.about_company === null ? null : `About the company: ${job.about_company}`,
  ].filter((section): section is string => section !== null);

  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location ?? "not stated"}`,
    ...sections,
    isSnippet
      ? "(The description above is a 500-character snippet that cuts off mid-sentence. Never treat something's absence from it as evidence the job does not involve it.)"
      : "",
    `Matched skills (already computed): ${job.matched_skills.join(", ") || "none"}`,
    `Missing skills (already computed): ${job.missing_skills.join(", ") || "none"}`,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
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
    `Skills: ${profile.skills.join(", ") || "none listed"}`,
    `Industries: ${profile.industries.join(", ") || "none listed"}`,
    `Work history:\n${roles || "- none listed"}`,
  ].join("\n");
}

// "unavailable" is the model call failing; "empty" is the model answering with
// a dossier that says nothing. They read identically to a `null` return and they
// are not the same event — one is a failure worth retrying, the other is an
// honest "there was nothing to say about this company", and the user deserves to
// be told which.
export type SynthesisResult =
  | { ok: true; dossier: CompanyDossier }
  | { ok: false; reason: "unavailable" | "empty" };

// build-plan.md's rule is that research never fails silently: a run whose
// browser found nothing still synthesises from the job and the profile, and that
// dossier is worth writing.
//
// `sources` is set here rather than asked of the model. The pages the browser
// actually visited are known; a model asked to name its sources will produce
// plausible URLs, and these become links on the page.
export async function synthesiseDossier(
  job: JobDetail,
  profile: Profile,
  research: CompanyResearch,
  isSnippet: boolean,
): Promise<SynthesisResult> {
  const openai = getOpenAI();

  if (openai === null) {
    return { ok: false, reason: "unavailable" };
  }

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
          content: [
            RULES,
            `\nCOMPANY RESEARCH (from their website):\n${describeResearch(research)}`,
            `\nJOB POSTING:\n${describeJob(job, isSnippet)}`,
            `\nCANDIDATE PROFILE:\n${describeProfile(profile)}`,
          ].join("\n"),
        },
      ],
    });

    const choice = response.choices[0];

    if (choice?.finish_reason === "length") {
      console.error("[agent/synthesis] response hit the token ceiling");
      return { ok: false, reason: "unavailable" };
    }

    const content = choice?.message.content;

    if (!content) {
      console.error("[agent/synthesis] response was empty");
      return { ok: false, reason: "unavailable" };
    }

    const parsed = readDossier({
      ...JSON.parse(content),
      sources: research.visited,
    });

    if (parsed.kind === "dossier") {
      return { ok: true, dossier: parsed.dossier };
    }

    // An all-empty answer and a non-object answer are both "nothing usable came
    // back", but only the second is a malfunction worth a retry.
    console.error("[agent/synthesis] no usable dossier", parsed.kind);

    return {
      ok: false,
      reason: parsed.kind === "empty" ? "empty" : "unavailable",
    };
  } catch (error) {
    console.error("[agent/synthesis] synthesis failed", error);
    return { ok: false, reason: "unavailable" };
  }
}
