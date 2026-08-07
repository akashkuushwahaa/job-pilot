import type { ActivityEntry, ChartPoint, DashboardStat } from "@/types";

// Mock data for the dashboard, exactly as context/designs/dashboard.png draws
// it. Feature 14 is the full UI on mock data — the same split features 09 and 12
// made — and features 15, 16 and 17 replace these four functions one at a time
// with real reads. Nothing else on the page has to change when they do.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function mockStats(): DashboardStat[] {
  return [
    {
      label: "Total Jobs Found",
      value: "284",
      trend: 12,
      caption: "vs last week",
    },
    {
      label: "Avg. Match Rate",
      value: "82%",
      trend: 3,
      caption: "vs last week",
    },
    {
      label: "Companies Researched",
      value: "35",
      trend: null,
      caption: "Total researched",
    },
    {
      label: "Jobs This Week",
      value: "28",
      trend: null,
      caption: "New this week",
    },
  ];
}

// Timestamps are real ISO instants offset from now, not the rendered strings the
// design shows. formatRelativeTime() produces "10 minutes ago" / "Yesterday" at
// render time, so feature 16 swaps the source and touches no formatting.
export function mockActivity(): ActivityEntry[] {
  const minutesAgo = (minutes: number): string =>
    new Date(Date.now() - minutes * 60_000).toISOString();

  return [
    {
      id: "activity-1",
      kind: "search",
      message: "Found 8 jobs for Frontend Engineer",
      at: minutesAgo(10),
    },
    {
      id: "activity-2",
      kind: "research",
      message: "Researched Stripe",
      at: minutesAgo(60),
    },
    {
      id: "activity-3",
      kind: "search",
      message: "Found 12 jobs for React Developer",
      at: minutesAgo(2 * 60),
    },
    {
      id: "activity-4",
      kind: "research",
      message: "Researched Vercel",
      at: minutesAgo(26 * 60),
    },
    {
      id: "activity-5",
      kind: "search",
      message: "Found 10 jobs for Full Stack Engineer",
      at: minutesAgo(30 * 60),
    },
  ];
}

export function mockResearchActivity(): ChartPoint[] {
  return toSeries(DAYS, [2, 5, 3, 8, 12, 4, 1]);
}

export function mockJobsFound(): ChartPoint[] {
  return toSeries(DAYS, [12, 46, 38, 64, 85, 52, 14]);
}

// The buckets build-plan.md feature 17 names, so the labels the chart renders
// now are the ones the PostHog grouping will fill later.
export function mockScoreDistribution(): ChartPoint[] {
  return toSeries(
    ["50-60%", "60-70%", "70-80%", "80-90%", "90-100%"],
    [5, 15, 45, 85, 36],
  );
}

function toSeries(labels: string[], values: number[]): ChartPoint[] {
  return labels.map((label, index) => ({ label, value: values[index] ?? 0 }));
}
