import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const RING_SIZE = 120;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type Props = {
  percent: number;
  missing: string[];
  isComplete: boolean;
};

export function CompletionIndicator({ percent, missing, isComplete }: Props) {
  const StatusIcon = isComplete ? CircleCheck : CircleAlert;
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(percent, 100) / 100);

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
          <StatusIcon
            aria-hidden
            className={cn(
              "size-5",
              isComplete ? "text-success" : "text-error",
            )}
          />
          {isComplete ? "Profile complete" : "Profile needs attention"}
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
          {isComplete
            ? "Every field the matching agent reads is filled in. Keep it current as your experience changes."
            : "Complete the missing fields to improve your chance of getting accurate matches and a quality generated resume."}
        </p>

        {missing.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {missing.map((field) => (
              <li
                key={field}
                className="rounded-md bg-error/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-error-dark uppercase"
              >
                {field}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="relative shrink-0 self-start sm:self-center">
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={`Profile ${percent}% complete`}
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            className={cn(
              isComplete ? "stroke-success/15" : "stroke-error/15",
            )}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={cn(isComplete ? "stroke-success" : "stroke-error")}
          />
        </svg>
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center text-2xl font-bold tracking-tight text-text-primary"
        >
          {percent}%
        </span>
      </div>
    </section>
  );
}
