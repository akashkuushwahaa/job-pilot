import { Check, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { JobDetail } from "@/types";

type Props = {
  job: JobDetail;
};

// Card eyebrow. Same geometry as the table column header in JobsTable — this is
// a label over a block of content, not a title for it, so it is not the
// text-base font-semibold heading JobDescription uses.
const eyebrow =
  "text-xs font-medium tracking-wider text-text-secondary uppercase";

const skillChip =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";

// GPT-4o's reasoning, then the two skill lists it produced. Every section is
// conditional: feature 10 skips a job whose scoring failed, so match_reason is
// present on every row saved so far — but a row written before that rule, or one
// scored against a thin profile, can carry empty skill arrays.
export function MatchScore({ job }: Props) {
  const hasSkills =
    job.matched_skills.length > 0 || job.missing_skills.length > 0;

  return (
    <>
      {job.match_reason === null ? null : (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-lightest text-success">
              <Sparkles aria-hidden className="size-4" />
            </span>
            <h2 className={eyebrow}>AI Match Reasoning</h2>
          </div>

          <p className="mt-5 text-sm leading-7 text-text-primary">
            {job.match_reason}
          </p>
        </section>
      )}

      {hasSkills ? (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className={eyebrow}>Required skills vs your profile</h2>

          {job.matched_skills.length > 0 ? (
            <>
              <p className="mt-5 text-sm text-text-secondary">You have</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {job.matched_skills.map((skill) => (
                  <li
                    key={skill}
                    className={cn(
                      skillChip,
                      "bg-success-lightest text-success-foreground",
                    )}
                  >
                    <Check aria-hidden className="size-3.5" />
                    {skill}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {job.missing_skills.length > 0 ? (
            <>
              <p className="mt-5 text-sm text-text-secondary">Gap skills</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {job.missing_skills.map((skill) => (
                  <li
                    key={skill}
                    className={cn(skillChip, "bg-accent-muted text-accent")}
                  >
                    <X aria-hidden className="size-3.5" />
                    {skill}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
