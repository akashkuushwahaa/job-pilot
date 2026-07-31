import { Check, Building2 } from "lucide-react";

const TECH_STACK = ["TypeScript", "React", "Go", "Kubernetes"] as const;

const YOUR_EDGE = [
  "You have shipped the same payments-adjacent work their team is hiring for.",
  "Your Kubernetes experience maps directly to the platform they describe.",
] as const;

const SMART_QUESTIONS = [
  "How is the platform team split between product and infrastructure work?",
] as const;

export function DossierPreview() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-surface-secondary text-text-secondary">
            <Building2 className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Company research
            </p>
            <p className="text-xs text-text-muted">4 pages read</p>
          </div>
        </div>
        <span className="rounded-full bg-success-lightest px-2 py-0.5 text-xs font-medium text-success-foreground">
          Complete
        </span>
      </div>

      <dl className="mt-5 space-y-5">
        <div>
          <dt className="text-xs font-medium tracking-wider text-text-muted uppercase">
            Tech stack
          </dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-text-dark"
              >
                {tech}
              </span>
            ))}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium tracking-wider text-text-muted uppercase">
            Your edge
          </dt>
          <dd className="mt-2 space-y-2">
            {YOUR_EDGE.map((item) => (
              <p
                key={item}
                className="flex gap-2 text-sm leading-6 text-text-secondary"
              >
                <Check className="mt-1 size-3.5 shrink-0 text-success" />
                {item}
              </p>
            ))}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium tracking-wider text-text-muted uppercase">
            Smart questions
          </dt>
          <dd className="mt-2 space-y-2">
            {SMART_QUESTIONS.map((item) => (
              <p
                key={item}
                className="rounded-lg bg-accent-muted px-3 py-2 text-sm leading-6 text-accent"
              >
                {item}
              </p>
            ))}
          </dd>
        </div>
      </dl>
    </div>
  );
}
