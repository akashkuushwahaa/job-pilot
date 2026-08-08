import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createInsforgeServer } from "@/lib/insforge-server";
import { extractProfileFromResume } from "@/lib/resume-extraction";

const BUCKET = "resumes";

function failure(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Takes no request body at all. The resume being read is whichever one this
// session's own row points at — the same rule as the upload route, for the same
// reason: a private InsForge bucket means "requires authentication", not
// "requires ownership", so accepting a caller-supplied key would hand any signed
// -in user every other user's resume.
export async function POST(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const insforge = await createInsforgeServer();

    const { data: profile, error: readError } = await insforge.database
      .from("profiles")
      .select("resume_path")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[api/resume/extract] read failed", readError);
      return failure("Could not read your resume. Please retry.", 500);
    }

    const stored: unknown = profile?.resume_path;
    const path = typeof stored === "string" && stored.length > 0 ? stored : null;

    // Reachable only by calling the route directly — the button renders on the
    // same `resume_path` this is checking.
    if (!path) {
      return failure("Upload a resume before extracting from it.", 400);
    }

    const { data: file, error: downloadError } = await insforge.storage
      .from(BUCKET)
      .download(path);

    if (downloadError || !file) {
      console.error("[api/resume/extract] download failed", downloadError);
      return failure("Could not read your resume. Please retry.", 500);
    }

    const result = await extractProfileFromResume(await file.arrayBuffer());

    // Both failure messages are already written for the user — one names the PDF
    // as the problem, the other asks for a retry. Neither carries internals.
    if (!result.success) {
      return failure(result.error, 422);
    }

    // Deliberately no revalidatePath and no write. Extraction proposes values;
    // the profile row changes only when the user reviews them and presses Save.
    return NextResponse.json({ success: true, data: result.values });
  } catch (error) {
    unstable_rethrow(error);
    console.error("[api/resume/extract] POST", error);
    return failure("Could not read your resume. Please retry.", 500);
  }
}
