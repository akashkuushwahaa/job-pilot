import { logAgent, logAgentError } from "@/agent/logs";
import { scoreJob } from "@/agent/matcher";
import type { DiscoveryResult, JobScore } from "@/agent/types";
import {
  searchAdzunaJobs,
  type AdzunaCountry,
  type AdzunaJob,
} from "@/lib/adzuna";
import type { InsforgeServerClient } from "@/lib/insforge-server";
import type { Profile } from "@/types";

const FAILED = "Could not search for jobs right now. Please retry shortly.";

type Scored = { job: AdzunaJob; score: JobScore };

// The upsert payload. Three columns are absent on purpose and their absence is
// the whole dedupe design:
//
//   found_at         — PostgREST builds its ON CONFLICT DO UPDATE SET list from
//                      the payload's own keys, so a column that is never sent is
//                      neither written on insert (the DEFAULT NOW() applies) nor
//                      touched on update. found_at therefore means "first
//                      discovered", which is what the Date Found column says.
//   company_research — a dossier costs the user a Browserbase session; a later
//                      re-discovery must never overwrite it.
//   researched_at    — travels with company_research for the same reason. It is
//                      what the dashboard's activity feed sorts on, and a
//                      re-discovery resetting it would move a research entry to
//                      the moment the job was re-found.
//   the four description arrays and about_company — Adzuna returns a 500
//                      character snippet that cuts off mid-sentence, and
//                      structuring it into "Requirements" would mean inventing
//                      the part that was truncated.
//
// run_id IS sent, so it moves to whichever run most recently surfaced the job.
function toRow(
  userId: string,
  runId: string,
  { job, score }: Scored,
): Record<string, unknown> {
  return {
    user_id: userId,
    run_id: runId,
    source: "search",
    external_id: job.externalId,
    source_url: job.redirectUrl,
    external_apply_url: job.redirectUrl,
    title: job.title,
    company: job.company,
    location: job.location,
    salary: job.salary,
    job_type: job.jobType,
    about_role: job.description,
    match_score: score.matchScore,
    match_reason: score.matchReason,
    matched_skills: score.matchedSkills,
    missing_skills: score.missingSkills,
  };
}

async function finishRun(
  insforge: InsforgeServerClient,
  runId: string,
  status: "completed" | "failed",
  jobsFound: number,
): Promise<void> {
  const { error } = await insforge.database
    .from("agent_runs")
    .update({
      status,
      jobs_found: jobsFound,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    console.error("[agent/adzuna] could not close the run", error);
  }
}

// `country` is passed in, never inferred here. It used to be derived from the
// free-text location with detectCountry(), and an unrecognised country fell
// through to `us` — which is how a search for "India" returned ten Indianapolis
// listings. The market is now an explicit field on the form and travels the
// whole way down.
export async function discoverJobs(
  insforge: InsforgeServerClient,
  userId: string,
  jobTitle: string,
  location: string,
  country: AdzunaCountry,
  profile: Profile,
): Promise<DiscoveryResult> {
  let runId: string | null = null;

  try {
    // Opened before the Adzuna call so that a crash leaves a visible record
    // rather than no trace that the user ever pressed the button.
    const { data: run, error: runError } = await insforge.database
      .from("agent_runs")
      .insert([
        {
          user_id: userId,
          status: "running",
          job_title_searched: jobTitle,
          location_searched: location.length > 0 ? location : null,
        },
      ])
      .select("id")
      .single();

    const openedId: unknown = run?.id;

    if (runError || typeof openedId !== "string") {
      console.error("[agent/adzuna] could not open a run", runError);
      return { success: false, error: FAILED };
    }

    runId = openedId;

    const search = await searchAdzunaJobs(jobTitle, location, country);

    if (!search.success) {
      await logAgentError(insforge, {
        runId,
        userId,
        message: `Adzuna search failed for "${jobTitle}" in ${country}`,
      });
      await finishRun(insforge, runId, "failed", 0);
      return { success: false, error: search.error };
    }

    await logAgent(insforge, {
      runId,
      userId,
      level: "info",
      message: `Adzuna returned ${search.jobs.length} ${country} listings for "${jobTitle}"`,
    });

    // Zero results is a completed run, not a failure — the user searched for
    // something real and Adzuna simply has nothing in that market today.
    if (search.jobs.length === 0) {
      await finishRun(insforge, runId, "completed", 0);
      return { success: true, savedScores: [], country };
    }

    // Concurrent rather than sequential: ten sequential model calls is 30-40
    // seconds of the user watching a spinner and a real risk of a platform
    // request timeout. allSettled rather than all, so one job that fails
    // scoring drops out of the run instead of taking the other nine with it.
    const settled = await Promise.allSettled(
      search.jobs.map((job) => scoreJob(job, profile)),
    );

    const scored: Scored[] = [];

    for (const [index, outcome] of settled.entries()) {
      const job = search.jobs[index];

      if (outcome.status === "fulfilled") {
        scored.push({ job, score: outcome.value });
        continue;
      }

      // An unscored job cannot be ranked or rendered — the table's match score
      // is a number — so it is dropped rather than saved half-formed. The run
      // still completes and reports what it actually saved.
      console.error("[agent/adzuna] scoring failed", outcome.reason);
      await logAgent(insforge, {
        runId,
        userId,
        level: "warning",
        message: `Could not score "${job.title}" at ${job.company} — job skipped`,
      });
    }

    if (scored.length === 0) {
      await finishRun(insforge, runId, "completed", 0);
      return { success: true, savedScores: [], country };
    }

    const { error: upsertError } = await insforge.database
      .from("jobs")
      .upsert(
        scored.map((entry) => toRow(userId, openedId, entry)),
        {
          onConflict: "user_id,source,external_id",
          // Any column absent from the payload takes its database default
          // instead of NULL. found_at depends on this.
          defaultToNull: false,
        },
      );

    if (upsertError) {
      console.error("[agent/adzuna] upsert failed", upsertError);
      await logAgentError(insforge, {
        runId,
        userId,
        message: `Saving ${scored.length} jobs failed`,
      });
      await finishRun(insforge, runId, "failed", 0);
      return { success: false, error: FAILED };
    }

    await finishRun(insforge, runId, "completed", scored.length);
    await logAgent(insforge, {
      runId,
      userId,
      level: "success",
      message: `Saved ${scored.length} jobs for "${jobTitle}"`,
    });

    return {
      success: true,
      savedScores: scored.map((entry) => entry.score.matchScore),
      country,
    };
  } catch (error) {
    console.error("[agent/adzuna]", error);

    if (runId !== null) {
      await logAgentError(insforge, {
        runId,
        userId,
        message: `Discovery run failed: ${String(error)}`,
      });
      await finishRun(insforge, runId, "failed", 0);
    }

    return { success: false, error: FAILED };
  }
}
