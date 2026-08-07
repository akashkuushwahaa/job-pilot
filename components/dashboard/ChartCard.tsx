import { ChartNoAxesColumn } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  ticks: number[];
  labels: string[];
  // "slot" centres each label under its own share of the width, which is where
  // a bar sits. "point" puts them on the plot edges, which is where the line
  // chart's first and last points sit.
  labelPlacement: "slot" | "point";
  // Non-null replaces the whole frame with an empty state. An axis with no
  // marks under it is indistinguishable from a chart that failed to draw.
  emptyMessage: string | null;
  children: ReactNode;
};

// The frame every dashboard chart shares: the card, the title, the dashed grid,
// the value axis and the category labels. The marks themselves are the child, so
// a bar series and a line series cannot drift apart on anything but the marks.
export function ChartCard({
  title,
  ticks,
  labels,
  labelPlacement,
  emptyMessage,
  children,
}: Props) {
  return (
    <figure className="flex h-full flex-col rounded-xl border border-border bg-surface p-6 shadow-sm">
      <figcaption className="text-base font-semibold text-text-primary">
        {title}
      </figcaption>

      {emptyMessage !== null ? (
        <div className="flex min-h-60 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-secondary text-text-muted">
            <ChartNoAxesColumn aria-hidden className="size-5" />
          </span>
          <p className="mt-4 max-w-xs text-sm text-text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-1 flex-col pl-10">
          <div className="relative min-h-60 flex-1">
          {/* Zero-height rows, so justify-between lands them on exactly 0%,
              25%, 50%, 75% and 100% of the plot rather than on the edges of
              boxes that have a line-height. Reversed because the ticks run
              upwards and the array runs from zero. */}
          <div
            aria-hidden
            className="absolute inset-0 flex flex-col-reverse justify-between"
          >
            {ticks.map((tick) => (
              <div key={tick} className="relative h-0">
                <span className="absolute top-1/2 right-full -translate-y-1/2 pr-3 text-xs text-text-muted">
                  {tick}
                </span>
                <span className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
              </div>
            ))}
          </div>

            {children}
          </div>

          {labelPlacement === "slot" ? (
            <div className="mt-3 flex">
              {labels.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className="flex-1 text-center text-xs whitespace-nowrap text-text-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <div className="relative mt-3 h-4">
              {labels.map((label, index) => (
                <span
                  key={label}
                  style={{ left: `${labelOffset(index, labels.length)}%` }}
                  className="absolute -translate-x-1/2 text-xs whitespace-nowrap text-text-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

function labelOffset(index: number, count: number): number {
  if (count <= 1) return 50;

  return (index / (count - 1)) * 100;
}
