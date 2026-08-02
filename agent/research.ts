import { browseCompany, type CompanyResearch } from "@/agent/browsing";
import { logAgent, logAgentError } from "@/agent/logs";
import {
  extractPosting,
  homepageFor,
  resolvePosting,
  type PostingContent,
} from "@/agent/posting";
import { synthesiseDossier } from "@/agent/synthesis";
import type { ResearchResult } from "@/agent/types";
import { createResearchSession } from "@/lib/browserbase";
import { wasBrowsed } from "@/lib/dossier";
import type { InsforgeServerClient } from "@/lib/insforge-server";
import { isTruncatedDescription } from "@/lib/jobs";
import type { CompanyDossier, JobDetail, Profile } from "@/types";

const FAILED = "Could not research this company right now. Please retry shortly.";

// Not the same event as a failure, and it must not read like one. The run did
// everything it was asked to and the model had nothing to say — usually a
// company with no reachable website and a posting too thin to infer from.
const NOTHING_FOUND =
  "The research ran but found too little about this company to write anything useful.";

// Nothing was gathered, so nothing was browsed. The shape browseCompany returns
// when it never opens a browser, repeated here for the branches that skip it.
function noResearch(): CompanyResearch {
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

// The description backfill. build-plan.md folds this into feature 13 rather than
// giving it a feature of its own, because feature 13 already follows the Adzuna
// redirect to reach the employer's site — the posting body is on the page this
// run has to load anyway.
//
// Two rules carry over from feature 10 and are not negotiable here: write no
// field the page did not state, and never touch found_at or company_research.
// Both are honoured by sending only the columns the extraction actually filled.
async function backfillDescription(
  insforge: InsforgeServerClient,
  userId: string,
  job: JobDetail,
  posting: PostingContent,
): Promise<boolean> {
  const update: Record<string, unknown> = {};

  // Strictly additive: a field is only written when what is there now is
  // nothing, or is still Adzuna's truncated snippet. A re-run against a posting
  // that has since been taken down reads a "this job has closed" page, and
  // without this guard that page would replace a full description the first run
  // already recovered. Never trade something for less.
  const roleIsPlaceholder =
    job.about_role === null || isTruncatedDescription(job.about_role);

  if (posting.aboutRole !== null && roleIsPlaceholder) {
    update.about_role = posting.aboutRole;
  }
  if (posting.aboutCompany !== null && job.about_company === null) {
    update.about_company = posting.aboutCompany;
  }
  if (posting.responsibilities.length > 0 && job.responsibilities.length === 0) {
    update.responsibilities = posting.responsibilities;
  }
  if (posting.requirements.length > 0 && job.requirements.length === 0) {
    update.requirements = posting.requirements;
  }
  if (posting.niceToHave.length > 0 && job.nice_to_have.length === 0) {
    update.nice_to_have = posting.niceToHave;
  }
  if (posting.benefits.length > 0 && job.benefits.length === 0) {
    update.benefits = posting.benefits;
  }

  if (Object.keys(update).length === 0) {
    return false;
  }

  const { error } = await insforge.database
    .from("jobs")
    .update(update)
    .eq("id", job.id)
    .eq("user_id", userId);

  if (error) {
    console.error("[agent/research] description backfill failed", error.code);
    return false;
  }

  // The in-memory job takes exactly what was written, so the synthesis step
  // below reads the real posting rather than the snippet it replaced — and
  // reads the untouched field wherever the guard above declined to write.
  if (typeof update.about_role === "string") job.about_role = update.about_role;
  if (typeof update.about_company === "string") {
    job.about_company = update.about_company;
  }
  if (Array.isArray(update.responsibilities)) {
    job.responsibilities = posting.responsibilities;
  }
  if (Array.isArray(update.requirements)) {
    job.requirements = posting.requirements;
  }
  if (Array.isArray(update.nice_to_have)) {
    job.nice_to_have = posting.niceToHave;
  }
  if (Array.isArray(update.benefits)) job.benefits = posting.benefits;

  return true;
}

async function saveDossier(
  insforge: InsforgeServerClient,
  userId: string,
  jobId: string,
  dossier: CompanyDossier,
): Promise<boolean> {
  const { error } = await insforge.database
    .from("jobs")
    .update({ company_research: dossier })
    .eq("id", jobId)
    .eq("user_id", userId);

  if (error) {
    console.error("[agent/research] dossier save failed", error.code, error.message);
    return false;
  }

  return true;
}

// One button click, one job, one Browserbase session. Every phase before the
// synthesis is allowed to fail and none of them ends the run: the deliverable is
// a dossier, and GPT-4o can write one from the job and the profile alone. Only a
// missing dossier, or a dossier that cannot be saved, is a failure the user
// hears about.
export async function researchCompany(
  insforge: InsforgeServerClient,
  userId: string,
  job: JobDetail,
  profile: Profile,
): Promise<ResearchResult> {
  try {
    await logAgent(insforge, {
      runId: null,
      userId,
      jobId: job.id,
      level: "info",
      message: `Researching ${job.company} for "${job.title}"`,
    });

    // One fetch, two purposes: it lands on the employer's real job page, which
    // is where the company's domain comes from, and it returns that page's HTML,
    // which is where the description backfill comes from. Building a second
    // scraper for the description would duplicate this hop.
    const posting =
      job.source_url === null ? null : await resolvePosting(job.source_url);

    let descriptionUpdated = false;

    if (posting !== null && posting.html.length > 0) {
      const extracted = await extractPosting(
        posting.html,
        job.title,
        job.company,
      );

      if (extracted !== null) {
        descriptionUpdated = await backfillDescription(
          insforge,
          userId,
          job,
          extracted,
        );
      }
    }

    if (descriptionUpdated) {
      await logAgent(insforge, {
        runId: null,
        userId,
        jobId: job.id,
        level: "success",
        message: `Replaced the Adzuna snippet with the full posting for "${job.title}"`,
      });
    }

    const homepage = homepageFor(posting?.finalUrl ?? null, job.company);

    let research = noResearch();

    if (homepage === null) {
      await logAgent(insforge, {
        runId: null,
        userId,
        jobId: job.id,
        level: "warning",
        message: `No company website could be derived for ${job.company}`,
      });
    } else {
      const sessionId = await createResearchSession();

      if (sessionId === null) {
        await logAgentError(insforge, {
          runId: null,
          userId,
          jobId: job.id,
          message: `No browser session available — researching ${job.company} from the posting alone`,
        });
      } else {
        research = await browseCompany(homepage, sessionId);

        await logAgent(insforge, {
          runId: null,
          userId,
          jobId: job.id,
          level: research.visited.length > 0 ? "success" : "warning",
          message:
            research.visited.length > 0
              ? `Read ${research.visited.length} page(s) on ${homepage}`
              : `Nothing usable found on ${homepage}`,
        });
      }
    }

    const synthesis = await synthesiseDossier(
      job,
      profile,
      research,
      isTruncatedDescription(job.about_role),
    );

    // The one outcome the user is told about. Everything above degrades; this
    // does not, because a research run that saves no dossier has produced
    // nothing — and the card would still read "No research yet".
    if (!synthesis.ok) {
      await logAgentError(insforge, {
        runId: null,
        userId,
        jobId: job.id,
        message:
          synthesis.reason === "empty"
            ? `Synthesis returned an empty dossier for ${job.company}`
            : `Could not synthesise a dossier for ${job.company}`,
      });

      return {
        success: false,
        error: synthesis.reason === "empty" ? NOTHING_FOUND : FAILED,
      };
    }

    const dossier = synthesis.dossier;

    // A refresh must not cost the user what the first run bought. The existing
    // dossier came off the company's own website; this one did not reach it, so
    // replacing it would trade researched content for inference from the
    // posting. The run still counts as a success — nothing was lost, and the
    // card already shows the better dossier.
    const existing = job.company_research;

    if (existing !== null && wasBrowsed(existing) && !wasBrowsed(dossier)) {
      await logAgent(insforge, {
        runId: null,
        userId,
        jobId: job.id,
        level: "warning",
        message: `Kept the existing dossier for ${job.company} — this run could not reach their site`,
      });

      return {
        success: true,
        dossier: existing,
        browsed: false,
        descriptionUpdated,
      };
    }

    if (!(await saveDossier(insforge, userId, job.id, dossier))) {
      await logAgentError(insforge, {
        runId: null,
        userId,
        jobId: job.id,
        message: `Dossier for ${job.company} could not be saved`,
      });

      return { success: false, error: FAILED };
    }

    await logAgent(insforge, {
      runId: null,
      userId,
      jobId: job.id,
      level: "success",
      message: `Saved a company dossier for ${job.company}`,
    });

    return {
      success: true,
      dossier,
      browsed: research.visited.length > 0,
      descriptionUpdated,
    };
  } catch (error) {
    console.error("[agent/research]", error);

    await logAgentError(insforge, {
      runId: null,
      userId,
      jobId: job.id,
      message: `Research run failed for ${job.company}: ${String(error)}`,
    });

    return { success: false, error: FAILED };
  }
}
