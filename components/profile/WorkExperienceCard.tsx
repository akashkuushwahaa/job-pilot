"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkExperienceEntry } from "@/types";

type Props = {
  index: number;
  value: WorkExperienceEntry;
  onChange: (value: WorkExperienceEntry) => void;
  onRemove: (() => void) | null;
};

export function WorkExperienceCard({
  index,
  value,
  onChange,
  onRemove,
}: Props) {
  const prefix = `work-${index}`;

  function update(patch: Partial<WorkExperienceEntry>): void {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-surface-secondary p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company name" htmlFor={`${prefix}-company`}>
          <Input
            id={`${prefix}-company`}
            value={value.company}
            placeholder="E.g. Vercel"
            className="bg-surface"
            onChange={(event) => update({ company: event.target.value })}
          />
        </Field>

        <Field label="Job title" htmlFor={`${prefix}-title`}>
          <Input
            id={`${prefix}-title`}
            value={value.title}
            placeholder="E.g. Frontend Engineer"
            className="bg-surface"
            onChange={(event) => update({ title: event.target.value })}
          />
        </Field>

        <Field label="Start date" htmlFor={`${prefix}-start`}>
          <Input
            id={`${prefix}-start`}
            type="month"
            value={value.start_date}
            className="bg-surface"
            onChange={(event) => update({ start_date: event.target.value })}
          />
        </Field>

        <Field
          label="End date"
          htmlFor={`${prefix}-end`}
          action={
            <span className="flex items-center gap-2">
              <Checkbox
                id={`${prefix}-current`}
                checked={value.currently_working}
                onChange={(event) =>
                  update({
                    currently_working: event.target.checked,
                    end_date: event.target.checked ? null : "",
                  })
                }
              />
              <label
                htmlFor={`${prefix}-current`}
                className="cursor-pointer text-sm text-text-dark"
              >
                Currently working here
              </label>
            </span>
          }
        >
          <Input
            id={`${prefix}-end`}
            type="month"
            value={value.end_date ?? ""}
            disabled={value.currently_working}
            className="bg-surface"
            onChange={(event) => update({ end_date: event.target.value })}
          />
        </Field>
      </div>

      <Field label="Key responsibilities" htmlFor={`${prefix}-responsibilities`}>
        <Textarea
          id={`${prefix}-responsibilities`}
          rows={3}
          value={value.responsibilities}
          placeholder="What you owned, shipped, or improved."
          className="bg-surface"
          onChange={(event) => update({ responsibilities: event.target.value })}
        />
      </Field>

      {onRemove ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium text-text-secondary transition-colors hover:text-error focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
          >
            Remove role
          </button>
        </div>
      ) : null}
    </div>
  );
}
