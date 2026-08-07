import { BarChart } from "@/components/dashboard/BarChart";
import { LineChart } from "@/components/dashboard/LineChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import {
  mockActivity,
  mockJobsFound,
  mockResearchActivity,
  mockScoreDistribution,
  mockStats,
} from "@/lib/dashboard";
import { createInsforgeServer } from "@/lib/insforge-server";
import { fetchProfile } from "@/lib/profile";

export default async function DashboardPage() {
  const user = await requireUser();
  const insforge = await createInsforgeServer();

  const profile = await fetchProfile(insforge, user.id, "dashboard/page");
  const { percent, missing, isComplete } = completeness(profile);

  return (
    <>
      <AppNavbar active="dashboard" userId={user.id} />

      <main className="flex-1 bg-background">
        <div className="mx-auto w-full max-w-[1440px] space-y-6 px-6 py-8">
          {/* Only when there is something to act on. build-plan.md asks for the
              banner "if profile not complete"; a permanent "all good" card at
              the top of the dashboard is chrome, not information. */}
          {isComplete ? null : (
            <CompletionIndicator
              percent={percent}
              missing={missing}
              isComplete={isComplete}
            />
          )}

          <StatsBar stats={mockStats()} />

          <div className="grid gap-6 lg:grid-cols-2">
            <RecentActivity entries={mockActivity()} />
            <BarChart
              title="Company Research Activity"
              data={mockResearchActivity()}
              tone="info"
              emptyMessage="No companies researched yet. Open a job and research its company to start building this."
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LineChart
                title="Jobs Found Over Time"
                data={mockJobsFound()}
                emptyMessage="No jobs found yet. Run a search and this will fill in."
              />
            </div>
            <BarChart
              title="Match Score Distribution"
              data={mockScoreDistribution()}
              tone="success"
              emptyMessage="No scored jobs yet. Run a search and this will fill in."
            />
          </div>
        </div>
      </main>
    </>
  );
}
