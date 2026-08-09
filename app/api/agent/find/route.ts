import { NextResponse, after, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { discoverJobs } from "@/agent/adzuna";
import { ADZUNA_COUNTRIES } from "@/lib/adzuna";
import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import { createInsforgeServer } from "@/lib/insforge-server";
import { discoveryMessage } from "@/lib/jobs";
import { captureServerEvent } from "@/lib/posthog-server";
import { parseProfile } from "@/lib/profile";

const MAX_FIELD_LENGTH = 120;

const RequestSchema = z.object({
  jobTitle: z.string().trim().min(1).max(MAX_FIELD_LENGTH),
  location: z.string().trim().max(MAX_FIELD_LENGTH).default(""),
  // Validated against the real market list rather than defaulted. A country the
  // server does not serve is a broken client, and answering it with a US search
  // is the exact failure this field was added to remove — so an unknown value
  // is refused, not quietly substituted.
  country: z.enum(ADZUNA_COUNTRIES),
});

const INCOMPLETE =
  "Complete your profile before searching. Jobs are scored against it, so a partial profile cannot produce a meaningful match.";

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
      return failure("Enter a job title to search.", 400);
    }

    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Enter a job title and choose a country to search.", 400);
    }

    const { data: row, error: readError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[agent/find] profile read failed", readError);
      return failure("Could not read your profile. Please retry.", 500);
    }

    const profile = parseProfile(row);

    // The same gate feature 08 puts on Generate, re-checked here rather than
    // trusted from the client: the button's disabled state shapes the UI, it is
    // not the defence. Scoring against a near-empty profile returns a number
    // that means nothing, and the score is the whole product.
    if (profile === null || !completeness(profile).isComplete) {
      return failure(INCOMPLETE, 422);
    }

    const result = await discoverJobs(
      insforge,
      user.id,
      parsed.data.jobTitle,
      parsed.data.location,
      parsed.data.country,
      profile,
    );

    if (!result.success) {
      return failure(result.error, 502);
    }

    const { savedScores, country } = result;

    // One event per saved job — job_found powers the Jobs Found Over Time and
    // Match Score Distribution charts in feature 17. Inside after() and never
    // awaited on the request path: captureImmediate resolves only once the
    // event has been sent, so awaiting ten of them would put PostHog's
    // availability in front of the user's.
    after(async () => {
      await Promise.all(
        savedScores.map((matchScore) =>
          captureServerEvent(user.id, "job_found", {
            source: "search",
            matchScore,
          }),
        ),
      );
    });

    return NextResponse.json({
      success: true,
      data: {
        found: savedScores.length,
        message: discoveryMessage(savedScores, country),
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("[agent/find] POST", error);
    return failure("Could not search for jobs. Please retry.", 500);
  }
}
