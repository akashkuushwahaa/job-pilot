import {
  Building2,
  Compass,
  Layers,
  Lightbulb,
  Link2,
  MessageCircleQuestion,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import {
  DossierSection,
  type DossierSectionProps,
} from "@/components/job-details/DossierSection";
import { ResearchButton } from "@/components/job-details/ResearchButton";
import type { CompanyDossier } from "@/types";

type Props = {
  jobId: string;
  company: string;
  dossier: CompanyDossier | null;
};

// Same eyebrow geometry MatchScore uses for its card labels — these are labels
// over blocks of content inside one card, not headings for cards of their own.
const eyebrow =
  "text-xs font-medium tracking-wider text-text-secondary uppercase";

const chip =
  "inline-flex items-center rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium text-text-secondary";

type BulletSection = DossierSectionProps & { key: string };

// The dossier, or the empty state that invites one. Every section is conditional
// on its own content, exactly as JobDescription is: a run whose browser found a
// parked domain still writes a dossier, but a thin one, and laying out eight
// headings over four filled fields advertises data that is not there.
export function CompanyResearch({ jobId, company, dossier }: Props) {
  const sections: BulletSection[] = [
    {
      key: "yourEdge",
      title: "Your edge",
      icon: Sparkles,
      items: dossier?.yourEdge ?? [],
      highlight: true,
    },
    {
      key: "gapsToAddress",
      title: "Gaps to address",
      icon: Target,
      items: dossier?.gapsToAddress ?? [],
    },
    {
      key: "culture",
      title: "Culture",
      icon: Users,
      items: dossier?.culture ?? [],
    },
    {
      key: "smartQuestions",
      title: "Smart questions to ask",
      icon: MessageCircleQuestion,
      items: dossier?.smartQuestions ?? [],
    },
    {
      key: "interviewPrep",
      title: "Interview prep",
      icon: Lightbulb,
      items: dossier?.interviewPrep ?? [],
    },
  ].filter((section) => section.items.length > 0);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-muted text-accent-dark">
            <Building2 aria-hidden className="size-4" />
          </span>
          <h2 className="text-base font-semibold text-text-primary">
            Company Research
          </h2>
        </div>

        <ResearchButton
          jobId={jobId}
          company={company}
          hasDossier={dossier !== null}
        />
      </div>

      {dossier === null ? (
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
      ) : (
        <div className="border-t border-border px-6 pt-6 pb-6">
          {dossier.companyOverview.length > 0 ? (
            <p className="text-sm leading-7 text-text-primary">
              {dossier.companyOverview}
            </p>
          ) : null}

          {dossier.techStack.length > 0 ? (
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <Layers aria-hidden className="size-4 text-text-muted" />
                <h3 className={eyebrow}>Tech stack</h3>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {dossier.techStack.map((technology) => (
                  <li key={technology} className={chip}>
                    {technology}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {dossier.whyThisRole.length > 0 ? (
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <Compass aria-hidden className="size-4 text-text-muted" />
                <h3 className={eyebrow}>Why this role</h3>
              </div>
              <p className="mt-3 text-sm leading-7 text-text-primary">
                {dossier.whyThisRole}
              </p>
            </div>
          ) : null}

          {sections.map(({ key, ...section }) => (
            <DossierSection key={key} {...section} />
          ))}

          {/* The pages the browser actually visited, not pages the model named.
              A dossier written without a browser has none, and says so by not
              rendering this at all. */}
          {dossier.sources.length > 0 ? (
            <div className="mt-6 border-t border-border pt-6">
              <div className="flex items-center gap-2">
                <Link2 aria-hidden className="size-4 text-text-muted" />
                <h3 className={eyebrow}>Sources</h3>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {dossier.sources.map((source) => (
                  <li key={source}>
                    <a
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm text-xs break-all text-text-secondary underline underline-offset-2 transition-colors hover:text-text-primary focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
                    >
                      {source}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
