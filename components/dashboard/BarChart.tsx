import { ChartCard } from "@/components/dashboard/ChartCard";
import { chartScale, hasPlottableData, plotPercent } from "@/lib/charts";
import { cn } from "@/lib/utils";
import type { ChartPoint } from "@/types";

// ui-tokens.md's Dashboard Chart Colors table: blue for the research bars, green
// for the score distribution.
const BAR_FILL = {
  info: "bg-info",
  success: "bg-success",
} as const;

type Props = {
  title: string;
  data: ChartPoint[];
  tone: keyof typeof BAR_FILL;
  emptyMessage: string;
};

export function BarChart({ title, data, tone, emptyMessage }: Props) {
  const values = data.map((point) => point.value);
  const { ceiling, ticks } = chartScale(values);

  return (
    <ChartCard
      title={title}
      ticks={ticks}
      labels={data.map((point) => point.label)}
      labelPlacement="slot"
      emptyMessage={hasPlottableData(values) ? null : emptyMessage}
    >
      {/* Each slot is h-full so the bar's percentage height has a definite box
          to resolve against — sizing the slots to their content instead would
          make that percentage circular, and every bar would collapse to zero. */}
      <div aria-hidden className="absolute inset-0 flex">
        {data.map((point, index) => (
          <div
            key={`${point.label}-${index}`}
            className="group flex h-full flex-1 items-end justify-center"
          >
            {/* The hover target is the whole column, not the bar. A zero or
                near-zero bar is a few pixels tall and effectively unhoverable,
                and a reader pointing at an empty column is asking the same
                question as one pointing at a tall one. */}
            <div
              style={{ height: `${plotPercent(point.value, ceiling)}%` }}
              className="relative w-[46%]"
            >
              <span className={cn("absolute inset-0", BAR_FILL[tone])} />

              {/* Anchored to the bar's own top edge, so it tracks the value
                  rather than floating at a fixed height. On a zero bar that
                  edge is the baseline, which is where the tooltip belongs. */}
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-overlay px-2 py-1 text-xs whitespace-nowrap text-surface opacity-0 transition-opacity group-hover:opacity-100">
                {`${point.srLabel ?? point.label}: ${point.value}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <ul className="sr-only">
        {data.map((point, index) => (
          <li
            key={`${point.label}-${index}`}
          >{`${point.srLabel ?? point.label}: ${point.value}`}</li>
        ))}
      </ul>
    </ChartCard>
  );
}
