import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import { createInsforgeServer } from "@/lib/insforge-server";
import { parseProfile } from "@/lib/profile";
import { generateResumeContent } from "@/lib/resume-generation";
import { renderResumePdf } from "@/lib/resume-pdf";

const BUCKET = "resumes";
const FILE_NAME = "resume.pdf";

// Same rule as the upload and extract routes: the key is built from the session
// and never accepted from the caller. A private InsForge bucket means "requires
// authentication", not "requires ownership".
function resumeKey(userId: string): string {
  return `${userId}/${FILE_NAME}`;
}

function failure(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Takes no request body. The resume is written from whatever is saved on the
// caller's own row — the form can be ahead of it, which is why the button is
// disabled until the two agree.
export async function POST(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const insforge = await createInsforgeServer();

    const { data, error: readError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[api/resume/generate] read failed", readError);
      return failure("Could not read your profile. Please retry.", 500);
    }

    const profile = parseProfile(data);

    // The button is disabled below this bar, so reaching it means the route was
    // called directly. Re-checked here because the button is a hint and this is
    // the boundary — and because generating from a thin profile would overwrite
    // a real uploaded resume with a near-empty document.
    if (profile === null || !completeness(profile).isComplete) {
      return failure(
        "Complete your profile before generating a resume from it.",
        422,
      );
    }

    const generated = await generateResumeContent(profile);

    // Nothing has been written yet, and nothing will be. The stored resume is
    // untouched by a failed generation.
    if (!generated.success) {
      return failure(generated.error, 502);
    }

    let pdf: Buffer;

    try {
      pdf = await renderResumePdf(profile, generated.content);
    } catch (renderError) {
      console.error("[api/resume/generate] render failed", renderError);
      return failure("Could not build your resume PDF. Please retry.", 500);
    }

    const key = resumeKey(user.id);

    // upload() takes a File or Blob in the installed SDK — there is no options
    // argument, and no upsert flag: writing the same key replaces the object.
    const file = new File([new Uint8Array(pdf)], FILE_NAME, {
      type: "application/pdf",
    });

    const { error: uploadError } = await insforge.storage
      .from(BUCKET)
      .upload(key, file);

    if (uploadError) {
      console.error("[api/resume/generate] upload failed", uploadError);
      return failure("Could not save your resume. Please retry.", 500);
    }

    // The key never changes, so this is a no-op for anyone who has uploaded
    // before. It matters for the user whose first resume is a generated one.
    // Only resume_path is written — a generate must never clobber the profile.
    const { error: writeError } = await insforge.database
      .from("profiles")
      .upsert([{ id: user.id, email: user.email ?? "", resume_path: key }]);

    if (writeError) {
      console.error("[api/resume/generate] resume_path write failed", writeError);
      return failure("Could not save your resume. Please retry.", 500);
    }

    return NextResponse.json({ success: true, data: { path: key } });
  } catch (error) {
    unstable_rethrow(error);
    console.error("[api/resume/generate] POST", error);
    return failure("Could not generate your resume. Please retry.", 500);
  }
}
