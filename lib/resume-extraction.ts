import { PDFParse } from "pdf-parse";
import { z } from "zod";

import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import { MAX_WORK_EXPERIENCE } from "@/lib/utils";
import {
  DEGREE_OPTIONS,
  EXPERIENCE_LEVELS,
  type EducationEntry,
  type ExtractedFormValues,
  type WorkExperienceEntry,
} from "@/types";

// Below this, the PDF carried no usable text — almost always a scan or an
// image-only export. A real one-page resume runs well past 1,500 characters, so
// this is a floor for "nothing came out", not a judgement about length.
const MIN_TEXT_LENGTH = 200;

// Roughly four pages of text. Everything past this is either an unusually long
// CV whose tail is publications and references, or not a resume at all. Either
// way the model does not need it, and an unbounded prompt is an unbounded bill.
const MAX_TEXT_LENGTH = 15_000;

// library-docs.md: 0.3 for extraction, 800 tokens for this call specifically.
const TEMPERATURE = 0.3;
const MAX_TOKENS = 800;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR_PATTERN = /^\d{4}$/;

export type ExtractionResult =
  | { success: true; values: ExtractedFormValues }
  | { success: false; error: string };

// The two failures a user can act on. Everything else is ours, not theirs, and
// gets the generic retry message.
const UNREADABLE =
  "Could not extract text from this PDF. Please try a different file.";
const UNAVAILABLE =
  "Could not read your resume right now. Please retry in a moment.";

// A month control renders nothing at all for a value it cannot parse, so a date
// in any other shape would look to the user like extraction simply missed it.
const monthString = z.string().regex(MONTH_PATTERN).catch("");

const RoleSchema = z.object({
  company: z.string().catch(""),
  title: z.string().catch(""),
  start_date: monthString,
  end_date: z.string().regex(MONTH_PATTERN).nullable().catch(null),
  currently_working: z.boolean().catch(false),
  responsibilities: z.string().catch(""),
});

// The model is told to send a number, but a model that sends "4" should not cost
// the user the field. Normalised to a form string in toYearsExperience below.
const YearsSchema = z.union([z.number(), z.string()]).nullable().catch(null);

// Same discipline as parseProfile in lib/profile.ts: every field carries a
// .catch() so one drifted value degrades to empty instead of failing the whole
// extraction. A model response is no more trustworthy than a jsonb column.
const ExtractionSchema = z.object({
  full_name: z.string().catch(""),
  phone: z.string().catch(""),
  location: z.string().catch(""),
  linkedin_url: z.string().catch(""),
  portfolio_url: z.string().catch(""),
  current_title: z.string().catch(""),
  experience_level: z.enum(EXPERIENCE_LEVELS).nullable().catch(null),
  years_experience: YearsSchema,
  skills: z.array(z.string()).catch([]),
  industries: z.array(z.string()).catch([]),
  work_experience: z.array(RoleSchema).catch([]),
  education: z
    .object({
      degree: z.enum(DEGREE_OPTIONS).nullable().catch(null),
      field: z.string().catch(""),
      institution: z.string().catch(""),
      graduation_year: z.string().regex(YEAR_PATTERN).catch(""),
    })
    .nullable()
    .catch(null),
});

const SYSTEM_PROMPT =
  "You extract structured data from resumes. You only ever report what the " +
  "document actually states — you never infer, embellish, or fill a gap with " +
  "something plausible. You return one JSON object and nothing else.";

const FIELD_RULES = `Return a JSON object with exactly these keys:

- "full_name": string. The candidate's name. "" if absent.
- "phone": string. As written. "" if absent.
- "location": string. "City, Country" or "City, State". "" if absent.
- "linkedin_url": string. Full URL. "" if absent.
- "portfolio_url": string. Personal site, GitHub, or portfolio. "" if absent.
- "current_title": string. The most recent job title held. "" if absent.
- "experience_level": one of "junior", "mid", "senior", "lead", or null.
  Judge from titles and total years, not from self-description.
- "years_experience": integer total years of professional experience, or null.
  Sum the roles; do not count education. Never guess when dates are missing.
  A role with no end date runs to today's date, given above — not to whenever
  you happen to think the present is.
- "skills": array of short technical skill tags, e.g. ["React", "TypeScript"].
  No sentences, no soft skills, no duplicates. [] if none are listed.
- "industries": array of industries worked in, e.g. ["FinTech"]. [] if unclear.
- "work_experience": array of at most ${MAX_WORK_EXPERIENCE} roles, most recent
  first. Each: { "company", "title", "start_date", "end_date",
  "currently_working", "responsibilities" }.
  - "start_date" and "end_date" must be "YYYY-MM" exactly, or "" when the month
    is not stated. A year alone is not acceptable — use "" instead.
  - "currently_working" is true only for a role with no end date. When it is
    true, "end_date" must be null.
  - "responsibilities": one or two sentences, under 300 characters, drawn from
    the bullets under that role.
  - [] if the resume lists no roles.
- "education": the single highest qualification, or null if none is listed.
  { "degree", "field", "institution", "graduation_year" }.
  - "degree" must be exactly one of: ${DEGREE_OPTIONS.map((degree) => `"${degree}"`).join(", ")}. Use null if none of them fit.
  - "graduation_year" must be "YYYY" exactly, or "" if not stated.

Never include an email address. Never include job preferences, desired salary,
or work authorization — this resume is evidence of the past, not a statement of
what the candidate wants next. Use "", null, or [] for anything the resume does
not state. Do not explain your answer.`;

async function readPdfText(data: Uint8Array): Promise<string | null> {
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    // A corrupt, encrypted, or password-protected PDF lands here. Not an
    // outage — the file itself is the problem, so it reads as unreadable.
    console.error("[lib/resume-extraction] pdf parse failed", error);
    return null;
  } finally {
    // pdfjs holds a worker open per document. Skipping this leaks one per
    // extraction for the life of the server process.
    await parser.destroy();
  }
}

function toYearsExperience(value: number | string | null): string {
  if (value === null) {
    return "";
  }

  const years = typeof value === "number" ? value : Number.parseInt(value, 10);

  // The column carries CHECK (years_experience >= 0) and the input is capped at
  // 60. Anything outside that is a misread, and an empty field reads better than
  // a wrong one the user has to notice before it reaches Postgres.
  if (!Number.isSafeInteger(years) || years < 0 || years > 60) {
    return "";
  }

  return String(years);
}

// A bare "linkedin.com/in/you" is what resumes usually print, but the field is
// type="url" and the value is eventually rendered as a link.
function toUrl(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0 || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function toRole(role: z.infer<typeof RoleSchema>): WorkExperienceEntry {
  return {
    company: role.company.trim(),
    title: role.title.trim(),
    start_date: role.start_date,
    // The checkbox and the end date are one control in the UI: ticked disables
    // the input and nulls it. A response claiming both is normalised, not shown.
    end_date: role.currently_working ? null : (role.end_date ?? ""),
    currently_working: role.currently_working,
    responsibilities: role.responsibilities.trim(),
  };
}

function hasContent(role: WorkExperienceEntry): boolean {
  return role.company.length > 0 || role.title.length > 0;
}

// Only keys the resume actually spoke to are returned. An omitted key is the
// signal that the field must keep whatever the user already typed — an empty
// string here would read as "the resume says you have no phone number".
function toFormValues(parsed: z.infer<typeof ExtractionSchema>): ExtractedFormValues {
  const values: ExtractedFormValues = {};

  const text: Array<[keyof ExtractedFormValues, string]> = [
    ["full_name", parsed.full_name.trim()],
    ["phone", parsed.phone.trim()],
    ["location", parsed.location.trim()],
    ["current_title", parsed.current_title.trim()],
    ["linkedin_url", toUrl(parsed.linkedin_url)],
    ["portfolio_url", toUrl(parsed.portfolio_url)],
  ];

  for (const [key, value] of text) {
    if (value.length > 0) {
      Object.assign(values, { [key]: value });
    }
  }

  if (parsed.experience_level !== null) {
    values.experience_level = parsed.experience_level;
  }

  const years = toYearsExperience(parsed.years_experience);

  if (years.length > 0) {
    values.years_experience = years;
  }

  const skills = parsed.skills.map((skill) => skill.trim()).filter(Boolean);

  if (skills.length > 0) {
    values.skills = skills;
  }

  const industries = parsed.industries
    .map((industry) => industry.trim())
    .filter(Boolean);

  if (industries.length > 0) {
    values.industries = industries;
  }

  // Roles replace the list wholesale rather than merging position by position —
  // there is no correspondence between "the second role you typed" and "the
  // second role on the resume", so a merge would interleave two histories.
  const roles = parsed.work_experience
    .map(toRole)
    .filter(hasContent)
    .slice(0, MAX_WORK_EXPERIENCE);

  if (roles.length > 0) {
    values.work_experience = roles;
  }

  if (parsed.education !== null) {
    const education: Partial<EducationEntry> = {};

    if (parsed.education.degree !== null) {
      education.degree = parsed.education.degree;
    }

    const rest: Array<[keyof EducationEntry, string]> = [
      ["field", parsed.education.field.trim()],
      ["institution", parsed.education.institution.trim()],
      ["graduation_year", parsed.education.graduation_year],
    ];

    for (const [key, value] of rest) {
      if (value.length > 0) {
        Object.assign(education, { [key]: value });
      }
    }

    if (Object.keys(education).length > 0) {
      values.education = education;
    }
  }

  return values;
}

export async function extractProfileFromResume(
  pdf: ArrayBuffer,
): Promise<ExtractionResult> {
  const raw = await readPdfText(new Uint8Array(pdf));

  if (raw === null || raw.trim().length < MIN_TEXT_LENGTH) {
    return { success: false, error: UNREADABLE };
  }

  const openai = getOpenAI();

  if (openai === null) {
    return { success: false, error: UNAVAILABLE };
  }

  const text = raw.trim().slice(0, MAX_TEXT_LENGTH);
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
          // The date is not decoration. "March 2022 — Present" is unresolvable
          // without it, and a model left to assume the present lands on its own
          // training cutoff — which read seven years of experience as four.
          content: `Today's date is ${today}.\n\n${FIELD_RULES}\n\nResume text:\n\n${text}`,
        },
      ],
    });

    content = response.choices[0]?.message.content ?? null;

    // Hitting the token ceiling truncates mid-JSON, which would fail below as an
    // unparseable response. Named here so the log says which of the two it was.
    if (response.choices[0]?.finish_reason === "length") {
      console.error("[lib/resume-extraction] response hit the token ceiling");
    }
  } catch (error) {
    console.error("[lib/resume-extraction] model call failed", error);
    return { success: false, error: UNAVAILABLE };
  }

  if (content === null) {
    console.error("[lib/resume-extraction] model returned no content");
    return { success: false, error: UNAVAILABLE };
  }

  // json_object guarantees valid JSON only when the response completed. Parsed
  // inside try/catch because a truncated one is still a string.
  let json: unknown;

  try {
    json = JSON.parse(content);
  } catch (error) {
    console.error("[lib/resume-extraction] response was not JSON", error);
    return { success: false, error: UNAVAILABLE };
  }

  const parsed = ExtractionSchema.safeParse(json);

  // Every field catches, so reaching here means the response was not an object
  // at all — a bare array or string. Nothing to salvage.
  if (!parsed.success) {
    console.error(
      "[lib/resume-extraction] unreadable response",
      parsed.error.issues,
    );
    return { success: false, error: UNAVAILABLE };
  }

  const values = toFormValues(parsed.data);

  // A structurally valid response that found nothing. Reads to the user exactly
  // like a PDF with no text, because from where they sit it is the same thing.
  if (Object.keys(values).length === 0) {
    return { success: false, error: UNREADABLE };
  }

  return { success: true, values };
}
