import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsPagination } from "@/components/find-jobs/JobsPagination";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import { createInsforgeServer } from "@/lib/insforge-server";
import { fetchJobPage, parseJobQuery } from "@/lib/jobs";
import { parseProfile } from "@/lib/profile";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FindJobsPage({ searchParams }: Props) {
  const user = await requireUser();
  const insforge = await createInsforgeServer();
  const query = parseJobQuery(await searchParams);

  const [profileResult, jobPage] = await Promise.all([
    insforge.database.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    // Throws on a read failure, for the reason below.
    fetchJobPage(insforge, user.id, query),
  ]);

  // Both reads are deliberately fatal, following the profile page: degrading a
  // read failure to "you have no jobs" would render the empty state over real
  // saved rows and invite the user to search again for jobs they already have.
  if (profileResult.error) {
    console.error("[find-jobs/page] profile read failed", profileResult.error);
    throw new Error("Find Jobs unavailable");
  }

  const profile = parseProfile(profileResult.data);
  // The page the read actually landed on, which is not always the one asked for
  // — a stale ?page= is clamped. The controls all work from this, so the URL and
  // what is on screen cannot disagree.
  const listQuery = { ...query, page: jobPage.page };
  const isFiltered = query.text.length > 0 || query.match !== "all";

  return (
    <>
      <AppNavbar active="find-jobs" userId={user.id} />

      <main className="flex-1 bg-background">
        <div className="mx-auto w-full max-w-[1440px] space-y-6 px-6 py-8">
          <SearchControls
            userId={user.id}
            blocked={!completeness(profile).isComplete}
          />

          <JobFilters query={listQuery} />

          <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <JobsTable jobs={jobPage.jobs} filtered={isFiltered} />
            {jobPage.total > 0 ? (
              <JobsPagination
                query={listQuery}
                totalResults={jobPage.total}
              />
            ) : null}
          </section>

          <p className="text-xs text-text-muted">Jobs by Adzuna</p>
        </div>
      </main>
    </>
  );
}
