import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { CompanyResearch } from "@/components/job-details/CompanyResearch";
import { JobActions } from "@/components/job-details/JobActions";
import { JobDescription } from "@/components/job-details/JobDescription";
import { JobInfo } from "@/components/job-details/JobInfo";
import { MatchScore } from "@/components/job-details/MatchScore";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { requireUser } from "@/lib/auth";
import { createInsforgeServer } from "@/lib/insforge-server";
import { fetchJob } from "@/lib/jobs";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailsPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const insforge = await createInsforgeServer();

  // Scoped to the caller's own rows as well as the id, so another user's job is
  // a 404 rather than a 403 — RLS refuses it either way, but this never asks.
  const job = await fetchJob(insforge, user.id, id);

  if (job === null) {
    notFound();
  }

  return (
    <>
      <AppNavbar active="find-jobs" userId={user.id} />

      <main className="flex-1 bg-background">
        {/* max-w-4xl rather than the 1440px page container, following /profile:
            this is a reading column, not a table to be scanned across. */}
        <div className="mx-auto w-full max-w-4xl px-6 py-8">
          <Link
            href="/find-jobs"
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Back to Jobs
          </Link>

          <div className="mt-6 space-y-6">
            <JobInfo job={job} />
            <MatchScore job={job} />
            <JobDescription job={job} />
            <CompanyResearch company={job.company} />
            <JobActions
              company={job.company}
              applyUrl={job.external_apply_url}
            />
          </div>
        </div>
      </main>
    </>
  );
}
