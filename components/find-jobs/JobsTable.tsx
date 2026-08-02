import { Building2, SearchX } from "lucide-react";

import { cn, formatRelativeTime, matchScoreFill } from "@/lib/utils";
import type { JobListItem } from "@/types";

type Props = {
  jobs: JobListItem[];
};

const headCell =
  "px-6 py-4 text-xs font-medium tracking-wider text-text-secondary uppercase";

// Rows are not links yet — /find-jobs/[id] does not exist until feature 12, and
// a row that navigates to a 404 is worse than one that does not navigate. The
// hover state ui-rules.md specifies is kept, so only the href is missing.
export function JobsTable({ jobs }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-secondary text-text-muted">
          <SearchX aria-hidden className="size-5" />
        </span>
        <p className="mt-4 max-w-sm text-sm text-text-muted">
          No jobs yet. Search a job title and location above to discover roles
          scored against your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={headCell}>
              Company
            </th>
            <th scope="col" className={headCell}>
              Role
            </th>
            <th scope="col" className={headCell}>
              Match Score
            </th>
            <th scope="col" className={headCell}>
              Salary Est.
            </th>
            <th scope="col" className={headCell}>
              Date Found
            </th>
          </tr>
        </thead>

        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-secondary"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-secondary text-text-secondary">
                    <Building2 aria-hidden className="size-4" />
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {job.company}
                  </span>
                </div>
              </td>

              <td className="px-6 py-4 text-sm text-text-primary">
                {job.title}
              </td>

              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {/* The number beside it carries this for a screen reader. */}
                  <span
                    aria-hidden
                    className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-border-light lg:w-32"
                  >
                    {/* A percentage is a value, not a token — it cannot be a
                        class, so the width is the one inline style here. */}
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        matchScoreFill(job.match_score),
                      )}
                      style={{ width: `${job.match_score}%` }}
                    />
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {job.match_score}%
                  </span>
                </div>
              </td>

              <td className="px-6 py-4 text-sm text-text-primary">
                {job.salary ?? (
                  <span className="text-text-muted">Not listed</span>
                )}
              </td>

              <td className="px-6 py-4 text-sm text-text-secondary">
                {formatRelativeTime(job.found_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
