import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

type Props = {
  ctaHref?: string;
  ctaLabel?: string;
};

export function CallToAction({
  ctaHref = "/login",
  ctaLabel = "Get started free",
}: Props = {}) {
  return (
    <section className="bg-background pb-20">
      <div className="mx-auto w-full max-w-[1440px] px-6">
        <div className="relative overflow-hidden rounded-xl bg-overlay px-6 py-16 text-center sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-32 h-72 bg-[radial-gradient(45%_100%_at_50%_50%,var(--color-accent),transparent)] opacity-40 blur-2xl"
          />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-surface sm:text-4xl">
              Your next job search can feel a lot less overwhelming
            </h2>
            <p className="mt-4 text-base leading-7 text-surface/70">
              Set up your profile, upload your resume, and start finding matches
              in minutes.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={ctaHref}
                className={buttonVariants({ variant: "inverse", size: "lg" })}
              >
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href={ctaHref}
                className={buttonVariants({
                  variant: "ghost",
                  size: "lg",
                  className:
                    "border border-surface/20 text-surface hover:bg-surface/10",
                })}
              >
                Find your first match
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
