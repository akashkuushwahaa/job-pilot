import { Building2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  company: string;
};

// Empty state only, exactly as build-plan.md scopes feature 12. The dossier and
// the button's handler both land in feature 13, which is why company_research is
// not even selected by the read — a card that renders "No research yet" over a
// dossier that exists would be worse than one that cannot render a dossier at
// all.
//
// The button is inert until then. Same call feature 09 made on the whole Find
// Jobs page: the full-UI feature draws the control, the next feature wires it.
export function CompanyResearch({ company }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-muted text-accent">
            <Building2 aria-hidden className="size-4" />
          </span>
          <h2 className="text-base font-semibold text-text-primary">
            Company Research
          </h2>
        </div>

        <Button type="button" className="rounded-full sm:shrink-0">
          <Search aria-hidden className="size-4" />
          Research Company
        </Button>
      </div>

      <div className="flex flex-col items-center border-t border-border px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-secondary text-text-muted">
          <Building2 aria-hidden className="size-5" />
        </span>
        <p className="mt-4 text-sm font-medium text-text-primary">
          No research yet
        </p>
        <p className="mt-1 max-w-sm text-sm text-text-muted">
          Click &ldquo;Research Company&rdquo; to let the AI browse{" "}
          {`${company}'s`} public pages and build a dossier.
        </p>
      </div>
    </section>
  );
}
