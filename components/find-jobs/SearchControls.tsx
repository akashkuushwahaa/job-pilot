import { Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = {
  message?: string | null;
};

// Feature 09 is UI only: both inputs are uncontrolled and the button carries no
// handler, so nothing here needs a client boundary. Feature 10 wires the button
// to POST /api/agent/find and replaces `message` with the run's real result.
export function SearchControls({ message }: Props) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Job title" htmlFor="job-title">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
            />
            <Input
              id="job-title"
              name="job-title"
              placeholder="Frontend Engineer"
              className="pl-9"
            />
          </div>
        </Field>

        <Field label="Location" htmlFor="location">
          <Input
            id="location"
            name="location"
            placeholder="Remote, New York..."
          />
        </Field>

        {/* Button `md` is h-9 while every form control is h-10, so a button on a
            field row states its own height. */}
        <Button type="button" className="h-10 px-5">
          <Search aria-hidden className="size-4" />
          Find Jobs
        </Button>
      </div>

      {message ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-lightest px-4 py-3 text-sm text-success-foreground"
        >
          <Sparkles aria-hidden className="size-4 shrink-0 text-success" />
          {message}
        </p>
      ) : null}
    </section>
  );
}
