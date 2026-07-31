import { Building2, LayoutDashboard, Radar } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: Radar,
    title: "Find jobs that actually fit",
    description:
      "Enter a title and a location. JobPilot pulls live tech roles from Adzuna and scores every one from 0 to 100 against your real skills.",
  },
  {
    step: "02",
    icon: Building2,
    title: "Know the company before you apply",
    description:
      "The agent browses their public pages and builds a dossier — tech stack, culture, why the role exists, and the questions worth asking.",
  },
  {
    step: "03",
    icon: LayoutDashboard,
    title: "Keep every application in one place",
    description:
      "Match scores, research and activity all land on one dashboard, so you always know where a search left off.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto w-full max-w-[1440px] px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-widest text-accent uppercase">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Three steps from search to interview-ready
          </h2>
          <p className="mt-4 text-base leading-7 text-text-secondary">
            No spreadsheets, no forty open tabs. The agent does the reading so
            you can spend your time on the applications worth sending.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ step, icon: Icon, title, description }) => (
            <article
              key={step}
              className="rounded-xl border border-border bg-surface p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-accent-muted text-accent">
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-medium text-text-muted">
                  {step}
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
