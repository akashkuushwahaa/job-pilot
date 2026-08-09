import { z } from "zod";

// Every market Adzuna actually serves. This list used to be four — us, gb, au,
// ca — with a comment claiming the others were "a separate host path and an
// untested category vocabulary". Neither is true: the path differs only in the
// country segment, and all nineteen were verified against the live API with
// `category=it-jobs` before this list was widened. `ie` and `ae` answer 404 and
// are not Adzuna markets.
//
// **The short list was the defect.** A market missing from it did not fail — it
// fell through to the `us` default and returned confident nonsense: a search for
// "India" produced ten Indianapolis listings. Adding a market is cheap; omitting
// one is silent. India alone carries 86k IT listings, second only to the US.
export const ADZUNA_COUNTRIES = [
  "at",
  "au",
  "be",
  "br",
  "ca",
  "ch",
  "de",
  "es",
  "fr",
  "gb",
  "in",
  "it",
  "mx",
  "nl",
  "nz",
  "pl",
  "sg",
  "us",
  "za",
] as const;

export type AdzunaCountry = (typeof ADZUNA_COUNTRIES)[number];

// What the country select renders. Ordered by display name rather than by job
// volume: a country picker is scanned alphabetically, and the field is seeded
// from the profile anyway so most searches never open it.
export const ADZUNA_MARKETS: ReadonlyArray<{
  code: AdzunaCountry;
  name: string;
}> = [
  // Australia before Austria: they diverge at the fifth letter, where "a" sorts
  // before "i". Ordering them the other way round is the same one-letter trap
  // that COUNTRY_PATTERNS has to watch for.
  { code: "au", name: "Australia" },
  { code: "at", name: "Austria" },
  { code: "be", name: "Belgium" },
  { code: "br", name: "Brazil" },
  { code: "ca", name: "Canada" },
  { code: "fr", name: "France" },
  { code: "de", name: "Germany" },
  { code: "in", name: "India" },
  { code: "it", name: "Italy" },
  { code: "mx", name: "Mexico" },
  { code: "nl", name: "Netherlands" },
  { code: "nz", name: "New Zealand" },
  { code: "pl", name: "Poland" },
  { code: "sg", name: "Singapore" },
  { code: "za", name: "South Africa" },
  { code: "es", name: "Spain" },
  { code: "ch", name: "Switzerland" },
  { code: "gb", name: "United Kingdom" },
  { code: "us", name: "United States" },
];

export function isAdzunaCountry(value: unknown): value is AdzunaCountry {
  return (
    typeof value === "string" &&
    (ADZUNA_COUNTRIES as readonly string[]).includes(value)
  );
}

export function marketName(country: AdzunaCountry): string {
  return (
    ADZUNA_MARKETS.find((market) => market.code === country)?.name ?? country
  );
}

// build-plan.md feature 10 fixes the page size at 10.
const RESULTS_PER_PAGE = 10;

// An architecture.md invariant: never search Adzuna without this filter.
const CATEGORY = "it-jobs";

// Adzuna quotes each market in its own currency. The symbols used to be a
// hand-written map of four; at nineteen that is a table to maintain and get
// wrong, so only the ISO code is stated and Intl derives the rest.
const CURRENCY_CODES: Record<AdzunaCountry, string> = {
  at: "EUR",
  au: "AUD",
  be: "EUR",
  br: "BRL",
  ca: "CAD",
  ch: "CHF",
  de: "EUR",
  es: "EUR",
  fr: "EUR",
  gb: "GBP",
  in: "INR",
  it: "EUR",
  mx: "MXN",
  nl: "EUR",
  nz: "NZD",
  pl: "PLN",
  sg: "SGD",
  us: "USD",
  za: "ZAR",
};

// Country names only, never a city, and never a bare two-letter code apart from
// "uk". "CA" is how half the United States writes California, and the rest are
// rare enough in a location field that supporting them buys the same class of
// bug this whole change exists to remove.
//
// **This no longer decides what gets searched.** It used to read the search
// box, and an unrecognised country silently became `us` — which is how "India"
// returned Indianapolis. The market is now an explicit field on the form; this
// only *seeds* that field from the profile's saved location, where a wrong guess
// is visible in the select and one click from being corrected.
const COUNTRY_PATTERNS: ReadonlyArray<[AdzunaCountry, RegExp]> = [
  [
    "gb",
    /\b(united kingdom|great britain|britain|england|scotland|wales|northern ireland|uk)\b/,
  ],
  ["us", /\b(united states|u\.?s\.?a\.?)\b/],
  // Before "au": \baustria\b cannot match "australia", but keeping the pair
  // adjacent is a reminder that the two names are one letter apart.
  ["au", /\baustralia\b/],
  ["at", /\b(austria|österreich|osterreich)\b/],
  ["ca", /\bcanada\b/],
  // \bindia\b does not match "indiana" — the word boundary fails on the
  // trailing "na". That is the whole reason this is a word-boundary match and
  // not a substring one.
  ["in", /\bindia\b/],
  ["za", /\bsouth africa\b/],
  ["sg", /\bsingapore\b/],
  ["fr", /\bfrance\b/],
  ["pl", /\b(poland|polska)\b/],
  ["de", /\b(germany|deutschland)\b/],
  ["es", /\b(spain|españa|espana)\b/],
  ["br", /\b(brazil|brasil)\b/],
  ["mx", /\b(mexico|méxico)\b/],
  ["nl", /\b(netherlands|holland)\b/],
  ["it", /\b(italy|italia)\b/],
  ["nz", /\bnew zealand\b/],
  ["be", /\b(belgium|belgique|belgië|belgie)\b/],
  ["ch", /\b(switzerland|suisse|schweiz|svizzera)\b/],
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

// Seeds the country select from a saved profile location. Never called on the
// search box — see the note on COUNTRY_PATTERNS.
export function detectCountry(location: string | null): AdzunaCountry {
  const haystack = (location ?? "").toLowerCase();

  for (const [country, pattern] of COUNTRY_PATTERNS) {
    if (pattern.test(haystack)) {
      return country;
    }
  }

  return DEFAULT_COUNTRY;
}

// One formatter per market, cached: constructing an Intl.NumberFormat is not
// free and a single search formats twenty figures.
const formatters = new Map<AdzunaCountry, Intl.NumberFormat>();

// `currencyDisplay` is left at its default of "symbol", not "narrowSymbol".
// Narrow collapses AUD, CAD, SGD, MXN and NZD all to a bare "$", so a Singapore
// salary would read as US dollars; the default keeps A$, CA$, SGD, ZAR and PLN
// distinguishable. Compact notation also handles the sub-1000 case on its own —
// 950 formats as "$950", not "$1K" — which is the rule the old formatAmount
// carried by hand.
function money(country: AdzunaCountry): Intl.NumberFormat {
  const cached = formatters.get(country);

  if (cached !== undefined) return cached;

  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: CURRENCY_CODES[country],
    notation: "compact",
    maximumFractionDigits: 0,
  });

  formatters.set(country, formatter);

  return formatter;
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

  const format = money(country);
  const lowText = format.format(low);
  const highText = format.format(high);

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
