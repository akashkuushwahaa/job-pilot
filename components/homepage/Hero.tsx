import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

const TRUST_POINTS = [
  "Jobs by Adzuna",
  "Scored by GPT-4o",
  "No credit card needed",
] as const;

type Props = {
  ctaHref?: string;
  ctaLabel?: string;
};

export function Hero({
  ctaHref = "/login",
  ctaLabel = "Get started free",
}: Props = {}) {
  return (
    <section className="relative overflow-hidden bg-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border-muted)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(60%_55%_at_50%_30%,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(55%_100%_at_50%_0%,var(--color-accent-light),transparent)]"
      />

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-6 pt-20 pb-14 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent shadow-sm">
          <Sparkles className="size-3.5" />
          Your AI job hunting agent
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.08] font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          Job hunting is hard.
          <br />
          <span className="text-accent">Your tools shouldn&rsquo;t be.</span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-7 text-text-secondary">
          Stop applying blind. JobPilot finds the jobs, scores every one against
          your real skills, and researches the company — so you show up ready.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href={ctaHref} className={buttonVariants({ size: "lg" })}>
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={ctaHref}
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Find your first match
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-text-muted">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2">
              <span className="size-1 rounded-full bg-text-muted" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
