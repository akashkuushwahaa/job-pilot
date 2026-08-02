import { ExternalLink, FileText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { isTruncatedDescription } from "@/lib/jobs";
import type { JobDetail } from "@/types";

type Props = {
  job: JobDetail;
};

type Section = {
  key: string;
  title: string;
  items: string[];
};

// Only the sections that have content, and today that is one. Adzuna returns a
// 500-character snippet that truncates mid-sentence, so feature 10 stores it in
// about_role verbatim and writes nothing to the four bullet columns — a details
// page that laid out four empty headings would be advertising data that does not
// exist. See build-plan.md, feature 10.
export function JobDescription({ job }: Props) {
  const sections: Section[] = [
    { key: "responsibilities", title: "Responsibilities", items: job.responsibilities },
    { key: "requirements", title: "Requirements", items: job.requirements },
    { key: "nice_to_have", title: "Nice to have", items: job.nice_to_have },
    { key: "benefits", title: "Benefits", items: job.benefits },
  ].filter((section) => section.items.length > 0);

  const isEmpty =
    job.about_role === null &&
    job.about_company === null &&
    sections.length === 0;

  if (isEmpty) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-secondary text-text-secondary">
          <FileText aria-hidden className="size-4" />
        </span>
        <h2 className="text-base font-semibold text-text-primary">
          Job Description
        </h2>
      </div>

      {job.about_role === null ? null : (
        <p className="mt-5 text-sm leading-7 text-text-primary">
          {job.about_role}
        </p>
      )}

      {sections.map((section) => (
        <div key={section.key} className="mt-6">
          <h3 className="text-sm font-semibold text-text-primary">
            {section.title}
          </h3>
          <ul className="mt-3 space-y-2">
            {section.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm leading-6 text-text-primary"
              >
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-text-muted"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {job.about_company === null ? null : (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text-primary">
            About the company
          </h3>
          <p className="mt-3 text-sm leading-7 text-text-primary">
            {job.about_company}
          </p>
        </div>
      )}

      {/* The paragraph above stops mid-word on every job Adzuna has ever
          returned, and an unexplained ellipsis under a heading that says "Job
          Description" is indistinguishable from a broken renderer — it was
          reported as one. Nothing here truncates: the note says who did, and the
          link is the only place the rest of the text actually exists.

          ResumeUpload's footer-row recipe, which the registry reserves for
          exactly this ("here is an action related to this card"). */}
      {isTruncatedDescription(job.about_role) ? (
        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-secondary">
              Adzuna returns only the first 500 characters of a listing. The rest
              is on the original posting.
            </p>

            {job.source_url === null ? null : (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: "secondary",
                  className: "sm:shrink-0",
                })}
              >
                <ExternalLink aria-hidden className="size-4" />
                Read full description
              </a>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
