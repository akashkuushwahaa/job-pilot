import { NextResponse, after, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { researchCompany } from "@/agent/research";
import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import { createInsforgeServer } from "@/lib/insforge-server";
import { fetchJob } from "@/lib/jobs";
import { captureServerEvent } from "@/lib/posthog-server";
import { parseProfile } from "@/lib/profile";

// This route awaits the browser. library-docs.md says not to configure a
// duration because "Browserbase runs independently from your Next.js server" —
// that is true of the Browserbase *session*, and false of this request: the run
// reads the extraction results and cannot answer until they arrive. A redirect
// fetch, a description extraction, up to four page visits and two GPT-4o calls
// do not fit in a platform default, and a request killed mid-run leaves the user
// with a spinner and no dossier. library-docs.md has been corrected.
//
// This is a ceiling the host may not honour — Vercel's Hobby tier caps a
// function at 60s regardless of what is exported here. agent/browsing.ts bounds
// its own phase at BROWSE_BUDGET_MS so a run degrades to fewer pages rather than
// being killed, but a full four-page run does not fit in 60s. On a tier that
// caps below ~120s, the browser phase has to go: leave BROWSERBASE_* unset and
// every run synthesises from the posting and profile alone, which is a supported
// path rather than a broken one.
export const maxDuration = 300;

// z.uuid(), not z.string().uuid() — the method form is deprecated in Zod 4.
const RequestSchema = z.object({
  jobId: z.uuid(),
});

const INCOMPLETE =
  "Complete your profile before researching. The dossier is written against it, so a partial profile cannot produce advice specific to you.";

function failure(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const insforge = await createInsforgeServer();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return failure("Could not read the request.", 400);
    }

    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Could not read the request.", 400);
    }

    // Scoped to the caller's own rows, so another user's job is "not found"
    // rather than "forbidden" — the same call the details page makes.
    const job = await fetchJob(insforge, user.id, parsed.data.jobId);

    if (job === null) {
      return failure("That job is no longer available.", 404);
    }

    const { data: row, error: readError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[agent/research] profile read failed", readError);
      return failure("Could not read your profile. Please retry.", 500);
    }

    const profile = parseProfile(row);

    // The same gate /api/agent/find applies, and for the same reason: yourEdge
    // and gapsToAddress are claims about this candidate, and a near-empty
    // profile can only produce the generic advice the prompt forbids. In
    // practice it never fires — a job exists only because a search ran, and that
    // search required a complete profile.
    if (profile === null || !completeness(profile).isComplete) {
      return failure(INCOMPLETE, 422);
    }

    const result = await researchCompany(insforge, user.id, job, profile);

    if (!result.success) {
      return failure(result.error, 502);
    }

    after(() =>
      captureServerEvent(user.id, "company_researched", {
        jobId: job.id,
        company: job.company,
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        browsed: result.browsed,
        descriptionUpdated: result.descriptionUpdated,
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("[agent/research] POST", error);
    return failure("Could not research this company. Please retry.", 500);
  }
}
