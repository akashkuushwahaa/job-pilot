import { ChartCard } from "@/components/dashboard/ChartCard";
import { chartScale, hasPlottableData, smoothLinePath } from "@/lib/charts";
import type { ChartPoint } from "@/types";

// A fixed id rather than useId(): hooks are not available in a Server Component
// and there is one line chart on the dashboard. Give it a prop the day a second
// one appears — two gradients sharing an id would silently take the first.
const FILL_ID = "jobs-found-over-time-fill";

type Props = {
  title: string;
  data: ChartPoint[];
  emptyMessage: string;
};

export function LineChart({ title, data, emptyMessage }: Props) {
  const values = data.map((point) => point.value);
  const { ceiling, ticks } = chartScale(values);
  const path = smoothLinePath(values, ceiling);

  return (
    <ChartCard
      title={title}
      ticks={ticks}
      labels={data.map((point) => point.label)}
      labelPlacement="point"
      emptyMessage={hasPlottableData(values) ? null : emptyMessage}
    >
      {path === null ? null : (
        // preserveAspectRatio="none" is what makes a fixed 0-100 viewBox
        // responsive: the curve stretches to whatever width the card gets.
        // vector-effect keeps the stroke an even 3px through that stretch, and
        // overflow-visible stops the round caps clipping at the plot edges.
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id={FILL_ID} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-accent)"
                stopOpacity="0.2"
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          <path d={path.area} fill={`url(#${FILL_ID})`} />
          <path
            d={path.line}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-accent"
          />
        </svg>
      )}

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
