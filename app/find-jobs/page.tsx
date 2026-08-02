import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsPagination } from "@/components/find-jobs/JobsPagination";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { requireUser } from "@/lib/auth";
import type { JobListItem } from "@/types";

const MOCK_PAGE_SIZE = 6;

const MOCK_TOTAL_RESULTS = 48;

const HOUR_MS = 60 * 60 * 1000;

const DAY_MS = 24 * HOUR_MS;

// Mock data — feature 11 replaces this with a scoped read of the jobs table.
// The six rows are the design's own, so the page can be diffed against
// context/designs/find-jobs.png. found_at is relative to now because the DATE
// FOUND column formats a real timestamp.
function mockJobs(): JobListItem[] {
  const now = Date.now();

  return [
    {
      id: "vercel-senior-frontend-engineer",
      company: "Vercel",
      title: "Senior Frontend Engineer",
      match_score: 94,
      salary: "$160k - $200k",
      found_at: new Date(now - 2 * HOUR_MS).toISOString(),
    },
    {
      id: "stripe-staff-ui-engineer",
      company: "Stripe",
      title: "Staff UI Engineer",
      match_score: 88,
      salary: "$180k - $240k",
      found_at: new Date(now - DAY_MS).toISOString(),
    },
    {
      id: "linear-product-engineer",
      company: "Linear",
      title: "Product Engineer",
      match_score: 96,
      salary: "$150k - $190k",
      found_at: new Date(now - 1.2 * DAY_MS).toISOString(),
    },
    {
      id: "notion-frontend-developer",
      company: "Notion",
      title: "Frontend Developer",
      match_score: 72,
      salary: "$130k - $170k",
      found_at: new Date(now - 2 * DAY_MS).toISOString(),
    },
    {
      id: "openai-design-engineer",
      company: "OpenAI",
      title: "Design Engineer",
      match_score: 91,
      salary: "$200k - $280k",
      found_at: new Date(now - 3 * DAY_MS).toISOString(),
    },
    {
      id: "figma-software-engineer-editor",
      company: "Figma",
      title: "Software Engineer, Editor",
      match_score: 85,
      salary: "$170k - $220k",
      found_at: new Date(now - 4 * DAY_MS).toISOString(),
    },
  ];
}

export default async function FindJobsPage() {
  const user = await requireUser();
  const jobs = mockJobs();

  return (
    <>
      <AppNavbar active="find-jobs" userId={user.id} />

      <main className="flex-1 bg-background">
        <div className="mx-auto w-full max-w-[1440px] space-y-6 px-6 py-8">
          <SearchControls message="Found 8 jobs and saved 4 strong matches." />

          <JobFilters />

          <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <JobsTable jobs={jobs} />
            {jobs.length > 0 ? (
              <JobsPagination
                page={1}
                pageSize={MOCK_PAGE_SIZE}
                totalResults={MOCK_TOTAL_RESULTS}
              />
            ) : null}
          </section>

          <p className="text-xs text-text-muted">Jobs by Adzuna</p>
        </div>
      </main>
    </>
  );
}
