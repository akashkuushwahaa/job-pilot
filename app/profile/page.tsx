import { AppNavbar } from "@/components/layout/AppNavbar";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import { createInsforgeServer } from "@/lib/insforge-server";
import { parseProfile } from "@/lib/profile";

export default async function ProfilePage() {
  const user = await requireUser();
  const insforge = await createInsforgeServer();

  // There is no row until the first save — maybeSingle() returns null rather than
  // erroring, and completeness() takes null directly.
  const { data, error } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Deliberately fatal. Degrading a read failure to "no profile" would render an
  // empty form over real saved data, and the next save would overwrite it.
  if (error) {
    console.error("[profile/page] read failed", error);
    throw new Error("Profile unavailable");
  }

  const profile = parseProfile(data);
  const { percent, missing, isComplete } = completeness(profile);

  return (
    <>
      <AppNavbar active="profile" userId={user.id} />

      <main className="flex-1 bg-background">
        <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
          <CompletionIndicator
            percent={percent}
            missing={missing}
            isComplete={isComplete}
          />
          <ResumeUpload resumePath={profile?.resume_path ?? null} />
          {/* Deliberately unkeyed. A key on updated_at remounts the form on any
              write to the row — including a resume upload, which bumps the same
              column via the updated_at trigger and would discard whatever the
              user was part way through typing. saveProfile returns the
              normalised values instead, and the form adopts them itself. */}
          <ProfileForm profile={profile} email={user.email ?? ""} />
        </div>
      </main>
    </>
  );
}
