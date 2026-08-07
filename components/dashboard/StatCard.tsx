import { cn } from "@/lib/utils";
import type { DashboardStat } from "@/types";

// A trend is a direction, so it has to be able to say "down". The design only
// ever draws a rise and the first cut hardcoded the green — which would have
// rendered a week where jobs found fell as "-8%" in success colours the moment
// feature 15 computed these from real counts.
//
// The red pair is `bg-error/10` + `text-error-dark`, the same one
// CompletionIndicator's missing-field tags use: --color-error itself measures
// 3.3:1 on its own tint, under the AA floor. A fill colour is not the colour
// that goes on top of it.
function trendTone(trend: number): string {
  if (trend > 0) return "bg-success-lightest text-success-darker";
  if (trend < 0) return "bg-error/10 text-error-dark";

  return "bg-surface-secondary text-text-secondary";
}

type Props = {
  stat: DashboardStat;
};

// One of the four cards in the stats bar. The trend badge is the one badge on
// this project that is not a pill — ui-rules.md gives it rounded-sm on purpose,
// so it reads as a delta rather than as a status.
export function StatCard({ stat }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <p className="text-sm font-medium text-text-secondary">{stat.label}</p>

      <p className="mt-2 text-3xl leading-9 font-semibold text-text-primary">
        {stat.value === null ? (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">Not available yet</span>
          </>
        ) : (
          stat.value
        )}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {stat.trend === null ? null : (
          <span
            className={cn(
              "rounded-sm px-2 py-0.5 text-xs font-medium",
              trendTone(stat.trend),
            )}
          >
            {stat.trend > 0 ? "+" : ""}
            {stat.trend}%
          </span>
        )}
        <span className="text-xs text-text-muted">{stat.caption}</span>
      </div>
    </div>
  );
}
