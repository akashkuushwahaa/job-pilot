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
            className="flex h-full flex-1 items-end justify-center"
          >
            <span
              style={{ height: `${plotPercent(point.value, ceiling)}%` }}
              className={cn("w-[46%]", BAR_FILL[tone])}
            />
          </div>
        ))}
      </div>

      <ul className="sr-only">
        {data.map((point, index) => (
          <li
            key={`${point.label}-${index}`}
          >{`${point.label}: ${point.value}`}</li>
        ))}
      </ul>
    </ChartCard>
  );
}
