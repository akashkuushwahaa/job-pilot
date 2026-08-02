import { FileText } from "lucide-react";

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
    </section>
  );
}
