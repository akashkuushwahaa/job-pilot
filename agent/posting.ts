import { z } from "zod";

import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import { safeFetchExternal } from "@/lib/safe-fetch";

// The Adzuna redirect and the employer page behind it are both third party, and
// this fetch happens on the request path. Every bound here exists so that one
// slow or enormous page cannot hold the research run open.
const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 800_000;

// What GPT-4o is given of the posting. A job page runs 2-6k characters of real
// text; the rest is nav, cookie banners and footer links, and paying to send
// them changes nothing about the answer.
const MAX_POSTING_CHARS = 12_000;

// Below this there is no posting on the page — a JS-rendered board that served
// an empty shell, a consent interstitial, or a 404 the server answered 200 to.
// The same floor lib/resume-extraction.ts puts on a parsed PDF, and for the
// same reason: structuring nothing produces invention.
const MIN_POSTING_CHARS = 400;

const TEMPERATURE = 0.3;
const MAX_TOKENS = 1_200;

const MAX_BULLETS = 12;
const MAX_BULLET_LENGTH = 300;
const MAX_PARAGRAPH_LENGTH = 4_000;

export type ResolvedPosting = {
  finalUrl: string;
  html: string;
};

export type PostingContent = {
  aboutRole: string | null;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  aboutCompany: string | null;
};

// Applicant tracking systems and aggregators. The redirect almost always lands
// on one of these rather than on the employer's own site, and stripping
// "boards.greenhouse.io" to its root domain yields Greenhouse — so the browser
// would then spend a Browserbase session researching the ATS vendor and report
// its culture as the employer's. The company-name fallback is wrong less often
// than that is.
const NOT_THE_EMPLOYER = new Set([
  "adzuna.com",
  "adzuna.co.uk",
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "workable.com",
  "smartrecruiters.com",
  "myworkdayjobs.com",
  "myworkdaysite.com",
  "workday.com",
  "icims.com",
  "taleo.net",
  "oraclecloud.com",
  "jobvite.com",
  "bamboohr.com",
  "recruitee.com",
  "teamtailor.com",
  "personio.de",
  "jazzhr.com",
  "breezy.hr",
  "indeed.com",
  "linkedin.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "totaljobs.com",
  "reed.co.uk",
  "seek.com.au",
  "google.com",
  "bit.ly",
]);

// "co" in example.co.uk, "com" in example.com.au. Without this, the last two
// labels of a .co.uk host are "co.uk" — every British employer would collapse
// onto the same non-existent homepage.
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "ac", "gov", "edu"]);

export function rootDomain(hostname: string): string | null {
  const labels = hostname.toLowerCase().replace(/^www\./, "").split(".");

  if (labels.length < 2) {
    return null;
  }

  const last = labels[labels.length - 1];
  const secondLast = labels[labels.length - 2];

  // A two-letter TLD preceded by a known second-level label needs three.
  if (last.length === 2 && SECOND_LEVEL.has(secondLast) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }

  return labels.slice(-2).join(".");
}

// Trailing legal suffixes only, and only as whole trailing words.
//
// This was written as `/\s*(inc\.?|...|co\.?|...)\b.*$/` — unanchored, with a
// `\s*` that happily matches nothing. `co\.?\b` therefore matched *inside* a
// name and took everything after it: "Cisco Systems" became "Cis", "Costco
// Wholesale" became "Cost", "Tesco PLC" became "Tes". Every one of those
// produces a real, wrong domain, which the browser then researches and reports
// as the employer — the same failure NOT_THE_EMPLOYER exists to prevent, from
// the other direction. Verified across the list in the review.
//
// The separator is required and the match is anchored to the end, so a suffix
// is only ever stripped when it is genuinely the last word.
const LEGAL_SUFFIX =
  /[\s,]+(inc|llc|l\.l\.c|ltd|limited|corp|corporation|co|company|gmbh|plc|pty|pvt|ag|nv|bv|srl|oy|ab|as|sa|s\.a)\.?$/i;

function stripLegalSuffix(name: string): string {
  let current = name.trim().replace(/[.,\s]+$/, "");
  let previous = "";

  // Looped, because "Acme Holdings Pty Ltd" carries two of them.
  while (current !== previous && current.length > 0) {
    previous = current;
    current = current.replace(LEGAL_SUFFIX, "").trim();
  }

  return current;
}

// build-plan.md's clean-up: strip the legal suffix, drop everything that is not
// a letter or a digit, and hope the result is the domain. It is a guess, and it
// is only reached when the redirect landed somewhere that is not the employer —
// the homepage extraction failing on a parked domain is an outcome the run
// already handles.
function homepageFromName(company: string): string | null {
  const slug = stripLegalSuffix(company)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (slug.length < 2) {
    return null;
  }

  return `https://www.${slug}.com`;
}

// The employer's homepage, from the page the redirect actually landed on where
// that is possible and from the company name where it is not.
export function homepageFor(
  finalUrl: string | null,
  company: string,
): string | null {
  if (finalUrl !== null) {
    try {
      const domain = rootDomain(new URL(finalUrl).hostname);

      if (domain !== null && !NOT_THE_EMPLOYER.has(domain)) {
        return `https://${domain}`;
      }
    } catch {
      console.error("[agent/posting] could not read the landed URL");
    }
  }

  return homepageFromName(company);
}

// Follows the Adzuna redirect to the employer's own job page.
//
// Through safeFetchExternal rather than fetch: `source_url` is a column any
// authenticated user can write under the jobs_owner RLS policy, and this runs
// server-side, so a crafted row would otherwise turn the research button into a
// request against the app's own network or the cloud metadata endpoint — whose
// response GPT-4o would then structure into about_role and render back. Each
// redirect hop is re-checked there, because passing the first host check says
// nothing about where a 302 points.
export async function resolvePosting(
  sourceUrl: string,
): Promise<ResolvedPosting | null> {
  const result = await safeFetchExternal(sourceUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      // Some boards answer a bare fetch with a consent wall and nothing else.
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en",
    },
  });

  if (result === null) {
    return null;
  }

  const { response, finalUrl } = result;

  try {
    if (!response.ok) {
      console.error("[agent/posting] posting fetch failed", response.status);
      return { finalUrl, html: "" };
    }

    const contentType = response.headers.get("content-type") ?? "";

    // A PDF or an image behind the redirect still tells us the employer's
    // domain, which is the half of this call that matters most.
    if (!contentType.includes("html")) {
      return { finalUrl, html: "" };
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);

    return { finalUrl, html };
  } catch (error) {
    console.error("[agent/posting] could not read the posting", error);
    return { finalUrl, html: "" };
  }
}

// Enough of an HTML stripper for prose. Script and style go first with their
// contents — otherwise a page's inline JSON-LD lands in the model's input as
// noise that looks like structure.
export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    // The class holds an escaped U+00A0, not a literal one. A job page is
    // full of non-breaking spaces, and a raw one inside a character class is
    // invisible to whoever reads this line next.
    .replace(/[ \t\u00a0]+/g, " ")
    // Every line loses its own leading and trailing space before blank runs are
    // collapsed. Closing a </p> emits a newline while the tags either side of it
    // have already become spaces, so without this each paragraph starts indented.
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const bullet = z
  .string()
  .catch("")
  .transform((value) => value.trim().slice(0, MAX_BULLET_LENGTH));

const bullets = z
  .array(bullet)
  .catch([])
  .transform((values) =>
    values.filter((value) => value.length > 0).slice(0, MAX_BULLETS),
  );

// nullish rather than optional-with-a-default, because "the posting does not say"
// is the answer this schema most needs to be able to carry.
const paragraph = z
  .string()
  .nullish()
  .catch(null)
  .transform((value) => {
    const trimmed = (value ?? "").trim().slice(0, MAX_PARAGRAPH_LENGTH);

    return trimmed.length > 0 ? trimmed : null;
  });

const PostingSchema = z.object({
  aboutRole: paragraph,
  responsibilities: bullets,
  requirements: bullets,
  niceToHave: bullets,
  benefits: bullets,
  aboutCompany: paragraph,
});

const SYSTEM_PROMPT =
  "You transcribe a job posting into structured fields. You copy and lightly " +
  "condense what the page states — you never write a requirement, a benefit or " +
  "a responsibility the page does not state, and you never fill a section the " +
  "posting does not have. An empty array is the correct answer for a section " +
  "that is absent. You return one JSON object and nothing else.";

const RULES = `Return a JSON object with exactly these keys:

- "aboutRole": the posting's description of the role, as prose, in the
  posting's own terms. 2-5 sentences. null if the page has no role description.
- "responsibilities": array of what the person will do. [] if not stated.
- "requirements": array of what the posting requires. [] if not stated.
- "niceToHave": array of preferred-but-optional items. [] if not stated.
- "benefits": array of what is offered — compensation, leave, equipment,
  working arrangements. [] if not stated.
- "aboutCompany": what the posting says about the employer. 1-3 sentences.
  null if the page does not describe the company.

The text below is a whole web page, including navigation, cookie notices and
footer links. Ignore everything that is not the posting itself. If the page
does not appear to contain a job posting at all, return every field empty.

Do not explain your answer outside the JSON.`;

// Structures the posting body that resolvePosting already fetched. No second
// request and no browser: the HTML is in hand, and a job page that renders
// server-side is the common case for the ATS hosts the redirect lands on.
//
// Null means "there was nothing here to structure", which leaves the Adzuna
// snippet and its truncation note in place — the honest render when the real
// posting could not be read.
export async function extractPosting(
  html: string,
  jobTitle: string,
  company: string,
): Promise<PostingContent | null> {
  const text = htmlToText(html);

  if (text.length < MIN_POSTING_CHARS) {
    return null;
  }

  const openai = getOpenAI();

  if (openai === null) {
    return null;
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
          content: `${RULES}\n\nThe posting is for "${jobTitle}" at ${company}.\n\nPAGE TEXT:\n${text.slice(0, MAX_POSTING_CHARS)}`,
        },
      ],
    });

    const choice = response.choices[0];

    // json_object guarantees valid JSON only for a response that completed.
    if (choice?.finish_reason === "length") {
      console.error("[agent/posting] extraction hit the token ceiling");
      return null;
    }

    const content = choice?.message.content;

    if (!content) {
      return null;
    }

    const parsed = PostingSchema.safeParse(JSON.parse(content));

    if (!parsed.success) {
      console.error("[agent/posting] extraction was not an object");
      return null;
    }

    const posting = parsed.data;

    // A page the model read but found no posting in. Writing this would blank
    // about_role — which currently holds the snippet — and trade partial truth
    // for nothing at all.
    const isEmpty =
      posting.aboutRole === null &&
      posting.aboutCompany === null &&
      posting.responsibilities.length === 0 &&
      posting.requirements.length === 0 &&
      posting.niceToHave.length === 0 &&
      posting.benefits.length === 0;

    return isEmpty ? null : posting;
  } catch (error) {
    console.error("[agent/posting] extraction failed", error);
    return null;
  }
}
