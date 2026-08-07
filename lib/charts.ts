// The maths behind the three dashboard charts. Kept out of the components so a
// tick ceiling or a curve is a value that can be checked by running it, rather
// than something only a screenshot can disprove.
//
// There is no charting library on this project. build-plan.md feature 17 names
// recharts, but the three charts are static — no tooltips, no legends, no
// brushing — and every one of recharts' defaults (axis lines, tick styling, bar
// radius, grid stroke) would have to be overridden to reach the design anyway.
// code-standards.md asks "is there a simpler native solution" before any
// dependency; here it is markup. It also keeps all three on the server.

const TICK_COUNT = 4;

// Every series here arrives from PostHog or the database, so a value can turn up
// as NaN or Infinity. Left alone, one of them takes the whole chart down without
// a sound: the ceiling goes NaN, all five ticks render the string "NaN", a bar's
// height becomes the invalid CSS "NaN%", and the line's `d` attribute stops
// parsing so the curve disappears entirely. Nothing throws. Same rule the rest of
// the project applies to model responses and database rows — narrow at the
// boundary rather than trusting the type.
function finiteSeries(values: number[], caller: string): number[] {
  if (values.every((value) => Number.isFinite(value))) return values;

  console.error(`[lib/charts] ${caller} received a non-finite value`);

  return values.map((value) => (Number.isFinite(value) ? value : 0));
}

// Whether there is anything to draw. A series of zeroes is a real answer — no
// jobs found this week — but it is an empty state, not a chart.
export function hasPlottableData(values: number[]): boolean {
  return values.some((value) => Number.isFinite(value) && value > 0);
}

// The usual 1 / 2 / 2.5 / 5 / 10 set rounds a maximum of 12 up to a ceiling of
// 20. The design draws the Company Research chart topping out at exactly 12 with
// ticks of 3, so 3 and 4 are in the set.
//
// The rest of the ladder is here to bound headroom. With only four steps a
// sparse set overshoots badly — 4321 lands on a ceiling of 8000 without 1.25,
// and 284 on 400 without 7.5, so the tallest bar fills barely half the plot and
// the chart reads as flatter than the data is. Worst case across this set is
// about 20%.
const TICK_MANTISSAS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];

export type ChartScale = {
  ceiling: number;
  ticks: number[];
};

// A ceiling that is a round number, reached in exactly four steps, and never
// below the largest value. 12 → ticks of 3; 85 → ticks of 25, both as drawn.
export function chartScale(input: number[]): ChartScale {
  const values = finiteSeries(input, "chartScale");
  const max = Math.max(0, ...values);

  // An all-zero series still gets a drawable axis. The card renders its empty
  // state rather than this, but a caller that plots it anyway gets 0-4 instead
  // of a division by zero.
  if (max <= 0) {
    return ticksFrom(1);
  }

  // Every series on this dashboard counts things — jobs, companies, days — and
  // a count axis labelled 0 / 0.75 / 1.5 / 2.25 / 3 offers the reader ticks
  // that cannot occur. Whole-number data therefore only gets whole-number
  // steps, at the cost of some headroom above the tallest bar. A series that is
  // genuinely fractional keeps the full ladder.
  const wholeNumbers = values.every((value) => Number.isInteger(value));
  const rough = max / TICK_COUNT;
  const magnitude = 10 ** Math.floor(Math.log10(rough));

  // Two decades of candidates, because the whole-number filter can empty the
  // lower one — a maximum of 3 has no integer step below 1.
  const step =
    [
      ...TICK_MANTISSAS.map((mantissa) => round(mantissa * magnitude)),
      ...TICK_MANTISSAS.map((mantissa) => round(mantissa * magnitude * 10)),
    ].find(
      (candidate) =>
        candidate >= rough && (!wholeNumbers || Number.isInteger(candidate)),
    ) ?? Math.ceil(rough);

  return ticksFrom(step);
}

// The ceiling and the ticks are derived from one step so they cannot disagree,
// and both track TICK_COUNT. The all-zero branch used to hardcode [0,1,2,3,4]
// beside a ceiling that happened to equal TICK_COUNT — changing the tick count
// would have left an axis whose last tick was not its ceiling.
function ticksFrom(step: number): ChartScale {
  return {
    ceiling: round(step * TICK_COUNT),
    ticks: Array.from({ length: TICK_COUNT + 1 }, (_, index) =>
      round(step * index),
    ),
  };
}

// A value's height as a percentage of the plot box. Bars and grid offsets are
// percentages of a box whose pixel height is decided by the grid row, so they
// cannot be Tailwind classes — see the note in ui-registry.md.
export function plotPercent(value: number, ceiling: number): number {
  if (!Number.isFinite(ceiling) || ceiling <= 0) return 0;
  if (!Number.isFinite(value)) return 0;

  return round((Math.max(0, value) / ceiling) * 100);
}

export type LinePath = {
  line: string;
  area: string;
};

// A smooth curve through every point, as the design draws it: Catmull-Rom
// converted to cubic Béziers.
//
// Coordinates are in a 0-100 viewBox that the SVG stretches to whatever width
// the card gets — the stroke stays even under that stretch because the path
// carries vector-effect="non-scaling-stroke".
export function smoothLinePath(
  input: number[],
  ceiling: number,
): LinePath | null {
  const values = finiteSeries(input, "smoothLinePath");

  if (values.length === 0 || !Number.isFinite(ceiling) || ceiling <= 0) {
    return null;
  }

  const points = values.map((value, index) => ({
    x: values.length === 1 ? 50 : round((index / (values.length - 1)) * 100),
    y: round(100 - plotPercent(value, ceiling)),
  }));

  const first = points[0];

  if (points.length === 1) {
    const line = `M 0 ${first.y} L 100 ${first.y}`;

    return { line, area: `${line} L 100 100 L 0 100 Z` };
  }

  let line = `M ${first.x} ${first.y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = index === 0 ? points[index] : points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const following =
      index + 2 < points.length ? points[index + 2] : points[index + 1];

    // Clamped into the plot box on purpose. A spline through a sharp peak
    // overshoots, and an overshoot here does not curve out of frame — it clips
    // flat against the viewBox edge, which reads as a rendering fault.
    const control1 = {
      x: round(current.x + (next.x - previous.x) / 6),
      y: clamp(current.y + (next.y - previous.y) / 6),
    };
    const control2 = {
      x: round(next.x - (following.x - current.x) / 6),
      y: clamp(next.y - (following.y - current.y) / 6),
    };

    line += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${next.x} ${next.y}`;
  }

  return { line, area: `${line} L 100 100 L 0 100 Z` };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number): number {
  return round(Math.min(100, Math.max(0, value)));
}
