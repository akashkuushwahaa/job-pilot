import { NextResponse, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createInsforgeServer } from "@/lib/insforge-server";
import { MAX_RESUME_BYTES } from "@/lib/utils";

const BUCKET = "resumes";
const SIGNED_URL_SECONDS = 60;

// The object key is always derived from the session, never taken from the request.
// A private InsForge bucket means "requires authentication", not "requires
// ownership" — there are no per-path storage policies — so this route is the only
// thing standing between one user's session and another user's resume. Nothing
// here may ever accept a caller-supplied key.
function resumeKey(userId: string): string {
  return `${userId}/resume.pdf`;
}

function failure(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireUser();

    const formData = await request.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return failure("No file was received. Please choose a PDF.", 400);
    }

    // Re-validated here on purpose. ResumeUpload's checks are cosmetic — they
    // shape the UI, they do not defend the bucket.
    if (file.type !== "application/pdf") {
      return failure("That file is not a PDF. Upload your resume as a PDF.", 400);
    }

    if (file.size > MAX_RESUME_BYTES) {
      return failure("That file is larger than 5MB. Upload a smaller PDF.", 400);
    }

    const insforge = await createInsforgeServer();
    const key = resumeKey(user.id);

    const { error: uploadError } = await insforge.storage
      .from(BUCKET)
      .upload(key, file);

    if (uploadError) {
      console.error("[api/resume] upload failed", uploadError);
      return failure("Could not upload that resume. Please retry.", 500);
    }

    // Only resume_path is written — a profile save must never clobber the resume,
    // and this must never clobber the profile.
    const { error: writeError } = await insforge.database
      .from("profiles")
      .upsert([{ id: user.id, email: user.email ?? "", resume_path: key }]);

    if (writeError) {
      console.error("[api/resume] resume_path write failed", writeError);
      return failure("Could not save that resume. Please retry.", 500);
    }

    return NextResponse.json({ success: true, data: { path: key } });
  } catch (error) {
    unstable_rethrow(error);
    console.error("[api/resume] POST", error);
    return failure("Could not upload that resume. Please retry.", 500);
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const insforge = await createInsforgeServer();

    const { data: profile, error: readError } = await insforge.database
      .from("profiles")
      .select("resume_path")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[api/resume] read failed", readError);
      return failure("Could not open that resume. Please retry.", 500);
    }

    const path: string | null = profile?.resume_path ?? null;

    if (!path) {
      return failure("No resume has been uploaded yet.", 404);
    }

    // Signed server-side, short-lived, and handed straight to the browser as a
    // redirect. It is never persisted and never rendered into the page.
    const { data, error: signError } = await insforge.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);

    if (signError || !data?.signedUrl) {
      console.error("[api/resume] signing failed", signError);
      return failure("Could not open that resume. Please retry.", 500);
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[api/resume] GET", error);
    return failure("Could not open that resume. Please retry.", 500);
  }
}
