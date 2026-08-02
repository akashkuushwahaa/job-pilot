import { z } from "zod";

import { releaseSession } from "@/lib/browserbase";
import { closeStagehand, openStagehand } from "@/lib/stagehand";
import { safeExternalUrl } from "@/lib/utils";

// architecture.md and library-docs.md both fix this at three. The Browserbase
// free plan allows one session at a time and the session itself expires after
// 120 seconds, so this is a budget rather than a preference.
const MAX_SUB_PAGES = 3;

const NAVIGATION_TIMEOUT_MS = 20_000;
const EXTRACT_TIMEOUT_MS = 45_000;

// The whole browser phase, not one page. Four visits at the per-step limits
// above would run past two minutes — longer than the Browserbase session itself
// and longer than some platform request ceilings, which would kill the request
// mid-run and leave the user with a spinner and no dossier. Sub-page visits stop
// once this is spent; whatever was gathered still goes to synthesis.
const BROWSE_BUDGET_MS = 90_000;

export type CompanyResearch = {
  oneLiner: string;
  productSummary: string;
  signals: string[];
  keyPoints: string[];
  technologies: string[];
  valuesOrCulture: string[];
  notable: string[];
  visited: string[];
};

// Sub-pages, best first. "careers" is last on purpose: it is the page most
// likely to exist and the one that says least about what the company actually
// does — it is mostly a job list, which we already have.
const PAGE_KINDS = [
  "about",
  "engineering",
  "product",
  "blog",
  "team",
  "careers",
  "other",
] as const;

const HomepageSchema = z.object({
  oneLiner: z.string().describe("What the company does in one sentence"),
  productSummary: z.string().describe("What they build/sell and who it's for"),
  signals: z
    .array(z.string())
    .describe("Funding, notable customers, scale, mission, recent news"),
  pageLinks: z
    .array(
      z.object({
        url: z.string(),
        kind: z.enum(PAGE_KINDS),
      }),
    )
    .describe("Internal links worth visiting"),
});

const SubPageSchema = z.object({
  keyPoints: z.array(z.string()),
  technologies: z
    .array(z.string())
    .describe("Specific languages, frameworks, tools, platforms"),
  valuesOrCulture: z
    .array(z.string())
    .describe("Stated values, working style, team norms"),
  notable: z
    .array(z.string())
    .describe("Customers, funding, scale, projects, awards"),
});

const HOMEPAGE_INSTRUCTION =
  "This is a company's homepage. Capture what the company actually does, who " +
  "it's for, and any concrete signals (funding, customers, scale, mission, " +
  "recent launches). Then find the internal links most worth visiting to " +
  "research them as an employer.";

const SUB_PAGE_INSTRUCTION =
  "Extract substance that helps a candidate understand this company before " +
  "applying: what they do, their values and how they work, the specific " +
  "technologies and tools they use, notable projects or customers, and how the " +
  "team operates. Ignore nav, footers, cookie banners, and generic marketing " +
  "copy.";

function emptyResearch(): CompanyResearch {
  return {
    oneLiner: "",
    productSummary: "",
    signals: [],
    keyPoints: [],
    technologies: [],
    valuesOrCulture: [],
    notable: [],
    visited: [],
  };
}

// True when the homepage extraction found nothing worth researching — a parked
// domain, a holding page, or the company-name guess landing on someone else's
// site. build-plan.md makes this the bail-out point: close the browser and let
// GPT-4o synthesise from the job and the profile alone.
function foundNothing(oneLiner: string, productSummary: string): boolean {
  return oneLiner.trim().length === 0 && productSummary.trim().length === 0;
}

// Ranked by PAGE_KINDS, deduplicated, capped, and restricted to the company's
// own root domain. Without that last check a "blog" link to Medium or a "team"
// link to LinkedIn would spend one of three page visits researching a platform
// rather than the employer.
function chooseSubPages(
  links: ReadonlyArray<{ url: string; kind: string }>,
  homepage: string,
): string[] {
  let homeHost: string;

  try {
    homeHost = new URL(homepage).hostname.replace(/^www\./, "");
  } catch {
    return [];
  }

  const ranked = [...links].sort(
    (a, b) =>
      PAGE_KINDS.indexOf(a.kind as (typeof PAGE_KINDS)[number]) -
      PAGE_KINDS.indexOf(b.kind as (typeof PAGE_KINDS)[number]),
  );

  const chosen: string[] = [];

  for (const link of ranked) {
    if (chosen.length >= MAX_SUB_PAGES) break;

    // The model is asked for internal links and mostly returns absolute ones,
    // but a relative href resolves against the homepage rather than being lost.
    let resolved: URL;

    try {
      resolved = new URL(link.url, homepage);
    } catch {
      continue;
    }

    const safe = safeExternalUrl(resolved.toString());

    if (safe === null) continue;

    const host = resolved.hostname.replace(/^www\./, "");

    if (host !== homeHost && !host.endsWith(`.${homeHost}`)) continue;

    // The homepage has already been read; a link back to it is a wasted visit.
    const isHomepage =
      resolved.pathname === "/" || resolved.pathname.length === 0;

    if (isHomepage) continue;
    if (chosen.includes(safe)) continue;

    chosen.push(safe);
  }

  return chosen;
}

function mergeSubPage(
  research: CompanyResearch,
  page: z.infer<typeof SubPageSchema>,
): void {
  research.keyPoints.push(...page.keyPoints);
  research.technologies.push(...page.technologies);
  research.valuesOrCulture.push(...page.valuesOrCulture);
  research.notable.push(...page.notable);
}

// Everything the browser contributes, or an empty result. This never throws and
// never propagates a Stagehand failure: a research run whose browser phase fails
// still owes the user a dossier, so every branch here returns something the
// synthesis step can read.
export async function browseCompany(
  homepage: string,
  sessionId: string,
): Promise<CompanyResearch> {
  const research = emptyResearch();
  const startedAt = Date.now();
  const stagehand = await openStagehand(sessionId);

  // Nothing took ownership of the session, so nothing will close it. Released
  // by hand or it holds the free plan's single slot for its full timeout.
  if (stagehand === null) {
    await releaseSession(sessionId);
    return research;
  }

  try {
    const page = stagehand.context.activePage();

    if (page === undefined) {
      console.error("[agent/browsing] the session has no page");
      return research;
    }

    // domcontentloaded rather than networkidle: a marketing homepage with a
    // chat widget or an analytics beacon on a timer may never go idle, and the
    // copy we are reading is in the document long before that.
    await page.goto(homepage, {
      waitUntil: "domcontentloaded",
      timeoutMs: NAVIGATION_TIMEOUT_MS,
    });

    const homepageData = await stagehand.extract(
      HOMEPAGE_INSTRUCTION,
      HomepageSchema,
      { timeout: EXTRACT_TIMEOUT_MS },
    );

    if (foundNothing(homepageData.oneLiner, homepageData.productSummary)) {
      return research;
    }

    research.oneLiner = homepageData.oneLiner.trim();
    research.productSummary = homepageData.productSummary.trim();
    research.signals.push(...homepageData.signals);
    research.visited.push(homepage);

    const subPages = chooseSubPages(homepageData.pageLinks, homepage);

    // Sequential, not concurrent: one session has one browser, and the pages
    // share it. Each visit is independently guarded so that a sub-page that
    // 404s or hangs costs that page rather than the two after it.
    for (const url of subPages) {
      if (Date.now() - startedAt > BROWSE_BUDGET_MS) {
        console.error("[agent/browsing] browse budget spent, skipping the rest");
        break;
      }

      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeoutMs: NAVIGATION_TIMEOUT_MS,
        });

        const pageData = await stagehand.extract(
          SUB_PAGE_INSTRUCTION,
          SubPageSchema,
          { timeout: EXTRACT_TIMEOUT_MS },
        );

        mergeSubPage(research, pageData);
        research.visited.push(url);
      } catch (error) {
        console.error("[agent/browsing] sub-page failed", url, error);
      }
    }

    return research;
  } catch (error) {
    console.error("[agent/browsing] research failed", error);

    // Whatever was gathered before the failure still goes to synthesis. A
    // homepage that read cleanly and a sub-page that timed out is a thinner
    // dossier, not a lost one.
    return research;
  } finally {
    await closeStagehand(stagehand);
  }
}
