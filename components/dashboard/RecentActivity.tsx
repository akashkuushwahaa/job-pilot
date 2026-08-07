import { Activity } from "lucide-react";

import { cn, formatRelativeTime } from "@/lib/utils";
import type { ActivityEntry, ActivityKind } from "@/types";

// ui-tokens.md gives each activity type a tinted outer ring and a solid inner
// dot. The design draws purple dots too, but purple is the Resume tailored
// colour and resume tailoring is out of scope in project-overview.md — so the
// two live entry types get the two live colours, which is also what
// build-plan.md feature 16 specifies ("info blue, success green").
const DOT_COLOURS: Record<ActivityKind, { ring: string; dot: string }> = {
  search: { ring: "bg-success-light", dot: "bg-success-alt" },
  research: { ring: "bg-info-light", dot: "bg-info" },
};

type Props = {
  entries: ActivityEntry[];
};

export function RecentActivity({ entries }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <h2 className="p-6 text-base font-semibold text-text-primary">
        Recent Activity
      </h2>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center border-t border-border px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-secondary text-text-muted">
            <Activity aria-hidden className="size-5" />
          </span>
          <p className="mt-4 max-w-sm text-sm text-text-muted">
            Nothing has happened yet. Search for jobs or research a company and
            it will show up here.
          </p>
        </div>
      ) : (
        <ol className="space-y-6 border-t border-border p-6">
          {entries.map((entry, index) => {
            const colours = DOT_COLOURS[entry.kind];

            return (
              <li key={entry.id} className="relative flex gap-4">
                {/* Stops one gap short of the next dot rather than running
                    behind it — the timeline reads as connecting the entries,
                    not as a rule the dots sit on. */}
                {index < entries.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute top-6 -bottom-6 left-2 w-px -translate-x-1/2 bg-border"
                  />
                ) : null}

                <span
                  aria-hidden
                  className={cn(
                    "mt-1 grid size-4 shrink-0 place-items-center rounded-full",
                    colours.ring,
                  )}
                >
                  <span className={cn("size-2 rounded-full", colours.dot)} />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {entry.message}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {formatRelativeTime(entry.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
