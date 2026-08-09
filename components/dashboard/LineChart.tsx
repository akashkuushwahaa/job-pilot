import type { CSSProperties } from "react";

import { ChartCard } from "@/components/dashboard/ChartCard";
import {
  chartScale,
  hasPlottableData,
  plotPercent,
  smoothLinePath,
} from "@/lib/charts";
import { cn } from "@/lib/utils";
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

      {/* Hover targets, one per point. The curve is a single SVG path with no
          per-point elements to hang a tooltip on, so these are DOM siblings
          placed at the coordinates the path already uses — i / (n - 1) across,
          and the value's own height up. They draw nothing until hovered, so the
          chart at rest is byte-identical to what feature 14 built.

          The dots cannot live inside the SVG: it is preserveAspectRatio="none",
          so a circle drawn there would stretch into an ellipse as the card
          widens. Same reason the line itself carries vector-effect. */}
      {path === null ? null : (
        <div aria-hidden className="absolute inset-0">
          {data.map((point, index) => {
            const anchor: CSSProperties = {
              top: `${100 - plotPercent(point.value, ceiling)}%`,
              left: pointOffset(index, data.length),
            };

            return (
              <div
                key={`${point.label}-${index}`}
                style={zoneStyle(index, data.length)}
                className={cn(
                  "group absolute inset-y-0",
                  isEdge(index, data.length) ? null : "-translate-x-1/2",
                )}
              >
                <span
                  style={anchor}
                  className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent opacity-0 ring-2 ring-surface transition-opacity group-hover:opacity-100"
                />

                <span
                  style={anchor}
                  className={cn(
                    "pointer-events-none absolute z-10 -translate-y-[calc(100%+0.75rem)] rounded-md bg-overlay px-2 py-1 text-xs whitespace-nowrap text-surface opacity-0 transition-opacity group-hover:opacity-100",
                    tooltipShift(index, data.length),
                  )}
                >
                  {`${point.srLabel ?? point.label}: ${point.value}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

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

// The first and last points sit on the plot edges, so a zone centred on them
// would hang half outside the card and swallow hovers over the axis gutter.
// Those two get half a zone, flush to their own edge.
function isEdge(index: number, count: number): boolean {
  return count <= 1 || index === 0 || index === count - 1;
}

function zoneStyle(index: number, count: number): CSSProperties {
  if (count <= 1) return { left: 0, right: 0 };

  const last = count - 1;

  if (index === 0) return { left: 0, width: `${50 / last}%` };
  if (index === last) return { right: 0, width: `${50 / last}%` };

  return { left: `${(index / last) * 100}%`, width: `${100 / last}%` };
}

// The dot is centred on its point, but the tooltip cannot be: the first and
// last points sit exactly on the plot edges, so a centred tooltip there hangs
// half outside the card. Measured — "Sun: 4" cleared the card's right edge by
// 2px. Those two align an edge to the point and grow inwards instead.
function tooltipShift(index: number, count: number): string {
  if (count > 1 && index === 0) return "translate-x-0";
  if (count > 1 && index === count - 1) return "-translate-x-full";

  return "-translate-x-1/2";
}

// Where the point sits inside its own zone: the outer edge for the two edge
// zones, the centre for every zone in between.
function pointOffset(index: number, count: number): string {
  if (count > 1 && index === 0) return "0%";
  if (count > 1 && index === count - 1) return "100%";

  return "50%";
}
