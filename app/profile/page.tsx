import { AppNavbar } from "@/components/layout/AppNavbar";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { ProfileWorkspace } from "@/components/profile/ProfileWorkspace";
import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import { createInsforgeServer } from "@/lib/insforge-server";
import { fetchProfile } from "@/lib/profile";

export default async function ProfilePage() {
  const user = await requireUser();
  const insforge = await createInsforgeServer();

  // Null until the first save, and fatal on a read failure — both decided in
  // fetchProfile, which /dashboard shares.
  const profile = await fetchProfile(insforge, user.id, "profile/page");
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
          {/* Deliberately unkeyed. A key on updated_at remounts the workspace on
              any write to the row — including a resume upload, which bumps the
              same column via the updated_at trigger and would discard whatever
              the user was part way through typing, or a set of fields just
              extracted. saveProfile returns the normalised values instead, and
              the form adopts them itself. */}
          <ProfileWorkspace profile={profile} email={user.email ?? ""} />
        </div>
      </main>
    </>
  );
}
