import Image from "next/image";
import { Check } from "lucide-react";

import { DossierPreview } from "@/components/homepage/DossierPreview";

const SCORING_POINTS = [
  "A score out of 100 with the reasoning behind it",
  "Matched and missing skills, listed side by side",
  "Salary estimate and source on every row",
] as const;

const RESEARCH_POINTS = [
  "Grounded in their own pages — never invented",
  "Your edge and your gaps, spelled out for this role",
  "Questions that prove you did the reading",
] as const;

function PointList({ points }: { points: readonly string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {points.map((point) => (
        <li
          key={point}
          className="flex items-start gap-3 text-sm leading-6 text-text-secondary"
        >
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-muted text-accent">
            <Check className="size-3" />
          </span>
          {point}
        </li>
      ))}
    </ul>
  );
}

export function Features() {
  return (
    <section className="bg-surface">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-lg">
            <p className="text-xs font-medium tracking-widest text-accent uppercase">
              Matching
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Every match, scored before you open it
            </h2>
            <p className="mt-4 text-base leading-7 text-text-secondary">
              GPT-4o reads each posting against your actual profile, so you can
              tell in one glance whether a role is worth your evening.
            </p>
            <PointList points={SCORING_POINTS} />
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-xl bg-surface-tertiary"
            />
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <Image
                src="/images/jobs-lists.png"
                alt="Jobs list showing companies with colour coded match score bars and salary estimates"
                width={2364}
                height={1778}
                sizes="(max-width: 1024px) 100vw, 640px"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>

        <div className="mt-28 grid items-center gap-12 lg:grid-cols-2">
          <div className="order-last lg:order-first">
            <DossierPreview />
          </div>

          <div className="max-w-lg lg:justify-self-end">
            <p className="text-xs font-medium tracking-widest text-accent uppercase">
              Research
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Walk in knowing the company
            </h2>
            <p className="mt-4 text-base leading-7 text-text-secondary">
              One click and the agent browses their homepage, about page and
              engineering blog, then turns what it found into a briefing written
              for you and this specific role.
            </p>
            <PointList points={RESEARCH_POINTS} />
          </div>
        </div>
      </div>
    </section>
  );
}
