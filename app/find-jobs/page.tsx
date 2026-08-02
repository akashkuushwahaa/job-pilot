import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsPagination } from "@/components/find-jobs/JobsPagination";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import { createInsforgeServer } from "@/lib/insforge-server";
import { parseJobList } from "@/lib/jobs";
import { parseProfile } from "@/lib/profile";

// build-plan.md feature 11 specifies 20 per page. The controls that would move
// off page 1 — the filter bar, both sorts, the pagination buttons — are still
// inert; feature 11 wires them to this same read.
const PAGE_SIZE = 20;

export default async function FindJobsPage() {
  const user = await requireUser();
  const insforge = await createInsforgeServer();

  const [profileResult, jobsResult] = await Promise.all([
    insforge.database.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    insforge.database
      .from("jobs")
      .select("id, company, title, match_score, salary, found_at")
      .eq("user_id", user.id)
      .order("found_at", { ascending: false }),
  ]);

  // Both reads are deliberately fatal, following the profile page: degrading a
  // read failure to "you have no jobs" would render the empty state over real
  // saved rows and invite the user to search again for jobs they already have.
  if (profileResult.error) {
    console.error("[find-jobs/page] profile read failed", profileResult.error);
    throw new Error("Find Jobs unavailable");
  }

  if (jobsResult.error) {
    console.error("[find-jobs/page] jobs read failed", jobsResult.error);
    throw new Error("Find Jobs unavailable");
  }

  const profile = parseProfile(profileResult.data);
  const jobs = parseJobList(jobsResult.data);

  return (
    <>
      <AppNavbar active="find-jobs" userId={user.id} />

      <main className="flex-1 bg-background">
        <div className="mx-auto w-full max-w-[1440px] space-y-6 px-6 py-8">
          <SearchControls
            userId={user.id}
            blocked={!completeness(profile).isComplete}
          />

          <JobFilters />

          <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <JobsTable jobs={jobs} />
            {jobs.length > 0 ? (
              <JobsPagination
                page={1}
                pageSize={PAGE_SIZE}
                totalResults={jobs.length}
              />
            ) : null}
          </section>

          <p className="text-xs text-text-muted">Jobs by Adzuna</p>
        </div>
      </main>
    </>
  );
}
