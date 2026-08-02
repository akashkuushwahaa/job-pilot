import { z } from "zod";

// The four Adzuna markets project-overview.md commits to. Adzuna serves more,
// but each one is a separate host path and an untested category vocabulary.
export const ADZUNA_COUNTRIES = ["us", "gb", "au", "ca"] as const;

export type AdzunaCountry = (typeof ADZUNA_COUNTRIES)[number];

// build-plan.md feature 10 fixes the page size at 10.
const RESULTS_PER_PAGE = 10;

// An architecture.md invariant: never search Adzuna without this filter.
const CATEGORY = "it-jobs";

const CURRENCY: Record<AdzunaCountry, string> = {
  us: "$",
  gb: "£",
  au: "A$",
  ca: "C$",
};

// Country is read only from an explicit country name, never from a city. A
// wrong country is not an error Adzuna reports — it silently returns nothing,
// and there would be no way to tell the user why. Guessing from "Springfield"
// is a coin flip, so anything unrecognised stays on the default.
//
// The bare two-letter codes are deliberately absent apart from "uk". "CA" is
// how half the United States writes California, "AU" and "GB" are rare enough
// in a location field that supporting them is not worth the same class of bug.
const COUNTRY_PATTERNS: ReadonlyArray<[AdzunaCountry, RegExp]> = [
  [
    "gb",
    /\b(united kingdom|great britain|britain|england|scotland|wales|northern ireland|uk)\b/,
  ],
  ["au", /\baustralia\b/],
  ["ca", /\bcanada\b/],
];

const DEFAULT_COUNTRY: AdzunaCountry = "us";

const UNAVAILABLE = "Job search is unavailable right now. Please retry shortly.";

// Adzuna's own response, not ours. Every optional field carries .catch() in the
// same spirit as the GPT-4o schemas — a third party payload is untrusted input
// however well documented it is. The four required fields do NOT catch: title
// and company are NOT NULL columns and external_id is the dedupe key, so a
// result missing any of them is dropped rather than repaired into a bad row.
const ResultSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.object({ display_name: z.string().min(1) }),
  redirect_url: z.string().min(1),
  location: z
    .object({ display_name: z.string().catch("") })
    .nullish()
    .catch(null),
  description: z.string().catch(""),
  salary_min: z.number().nullish().catch(null),
  salary_max: z.number().nullish().catch(null),
  // Verified against the live API: contract_time carries full_time/part_time
  // and is present on 6 of 10 results; contract_type carries permanent/contract
  // and appeared on 1. library-docs.md mapped job_type from contract_type
  // alone, which reads the wrong field for most listings.
  contract_time: z.string().nullish().catch(null),
  contract_type: z.string().nullish().catch(null),
});

const ResponseSchema = z.object({
  results: z.array(z.unknown()).catch([]),
});

// What the rest of the app consumes. Adzuna's wire shape stops here.
export type AdzunaJob = {
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  jobType: string | null;
  description: string;
  redirectUrl: string;
};

export type AdzunaSearchResult =
  | { success: true; jobs: AdzunaJob[] }
  | { success: false; error: string };

export function detectCountry(location: string): AdzunaCountry {
  const haystack = location.toLowerCase();

  for (const [country, pattern] of COUNTRY_PATTERNS) {
    if (pattern.test(haystack)) {
      return country;
    }
  }

  return DEFAULT_COUNTRY;
}

function formatAmount(value: number, symbol: string): string {
  // Below a thousand this is not an annual figure Adzuna has annualised
  // properly, and "$0k" reads as a bug. Show it as given instead.
  if (value < 1000) {
    return `${symbol}${Math.round(value)}`;
  }

  return `${symbol}${Math.round(value / 1000)}k`;
}

// Adzuna very often predicts a salary (salary_is_predicted: "1") and returns the
// same number for min and max. "$70k - $70k" reads as a broken range, so an
// equal pair collapses to a single figure. The column is labelled SALARY EST.
// in the table, which is where the estimate caveat is carried.
function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  country: AdzunaCountry,
): string | null {
  const low = min ?? max ?? null;
  const high = max ?? min ?? null;

  if (low === null || high === null || low <= 0 || high <= 0) {
    return null;
  }

  const symbol = CURRENCY[country];
  const lowText = formatAmount(low, symbol);
  const highText = formatAmount(high, symbol);

  return lowText === highText ? lowText : `${lowText} - ${highText}`;
}

// architecture.md types this column as fulltime / parttime / contract. Anything
// Adzuna does not actually state stays null — defaulting an unknown listing to
// "fulltime" would be inventing a term of employment.
function toJobType(
  contractTime: string | null | undefined,
  contractType: string | null | undefined,
): string | null {
  if (contractTime === "full_time") return "fulltime";
  if (contractTime === "part_time") return "parttime";
  if (contractType === "contract") return "contract";
  if (contractType === "permanent") return "fulltime";

  return null;
}

function toJob(
  result: z.infer<typeof ResultSchema>,
  country: AdzunaCountry,
): AdzunaJob {
  const location = result.location?.display_name.trim() ?? "";

  return {
    externalId: result.id,
    title: result.title.trim(),
    company: result.company.display_name.trim(),
    location: location.length > 0 ? location : null,
    salary: formatSalary(result.salary_min, result.salary_max, country),
    jobType: toJobType(result.contract_time, result.contract_type),
    description: result.description.trim(),
    redirectUrl: result.redirect_url,
  };
}

export async function searchAdzunaJobs(
  jobTitle: string,
  location: string,
  country: AdzunaCountry,
): Promise<AdzunaSearchResult> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  // Missing configuration returns rather than throws, the same call
  // lib/openai.ts makes: at module scope this would fail the whole route at
  // build time instead of the one request that needed it.
  if (!appId || !appKey) {
    console.error("[lib/adzuna] ADZUNA_APP_ID or ADZUNA_APP_KEY is not set");
    return { success: false, error: UNAVAILABLE };
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: jobTitle,
    category: CATEGORY,
    results_per_page: String(RESULTS_PER_PAGE),
    "content-type": "application/json",
  });

  // Omitted entirely when there is no location — an empty `where` is not the
  // same request as no `where` at all.
  if (location.length > 0) {
    params.set("where", location);
  }

  let payload: unknown;

  try {
    const response = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
    );

    if (!response.ok) {
      console.error("[lib/adzuna] search failed", response.status);
      return { success: false, error: UNAVAILABLE };
    }

    payload = await response.json();
  } catch (error) {
    console.error("[lib/adzuna] search threw", error);
    return { success: false, error: UNAVAILABLE };
  }

  const parsed = ResponseSchema.safeParse(payload);

  if (!parsed.success) {
    console.error("[lib/adzuna] unreadable response", parsed.error.issues);
    return { success: false, error: UNAVAILABLE };
  }

  // Per result rather than as an array, so one malformed listing costs that
  // listing and not the whole search.
  const jobs: AdzunaJob[] = [];

  for (const result of parsed.data.results) {
    const job = ResultSchema.safeParse(result);

    if (job.success) {
      jobs.push(toJob(job.data, country));
    } else {
      console.error("[lib/adzuna] dropped a result", job.error.issues);
    }
  }

  return { success: true, jobs };
}
