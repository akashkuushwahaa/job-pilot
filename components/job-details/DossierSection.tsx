import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type DossierSectionProps = {
  title: string;
  icon: LucideIcon;
  items: string[];
  // Your Edge is the field build-plan.md calls the most valuable one — the only
  // section written about the candidate rather than about the company — so it
  // gets the accent treatment that marks it as the thing to read first. It is
  // the only section that ever sets this.
  highlight?: boolean;
};

// One bulleted section of the dossier card. Its own file rather than a second
// component inside CompanyResearch.tsx, per code-standards.md's one-component-
// per-file rule.
export function DossierSection({
  title,
  icon: Icon,
  items,
  highlight = false,
}: DossierSectionProps) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden
          className={cn("size-4", highlight ? "text-accent-dark" : "text-text-muted")}
        />
        {/* MatchScore's eyebrow — a label over a block inside a card, not a
            heading for a card of its own. */}
        <h3 className="text-xs font-medium tracking-wider text-text-secondary uppercase">
          {title}
        </h3>
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 text-sm leading-6 text-text-primary"
          >
            <span
              aria-hidden
              className={cn(
                "mt-2 size-1.5 shrink-0 rounded-full",
                highlight ? "bg-accent" : "bg-text-muted",
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
