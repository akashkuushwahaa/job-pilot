"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ADZUNA_MARKETS, type AdzunaCountry } from "@/lib/adzuna";
import { cn } from "@/lib/utils";

const SEARCH_ERROR = "Could not search for jobs. Please retry.";

const BLOCKED_MESSAGE =
  "Complete your profile before searching — the Profile page lists what is still missing. Jobs are scored against it.";

type Banner = { kind: "error" | "success"; message: string } | null;

type Props = {
  userId: string;
  blocked: boolean;
  // Seeded from the saved profile location by the page. Only the initial value —
  // once the user touches the select, this stops mattering.
  defaultCountry: AdzunaCountry;
};

export function SearchControls({ userId, blocked, defaultCountry }: Props) {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState<AdzunaCountry>(defaultCountry);
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<Banner>(null);

  async function findJobs(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const title = jobTitle.trim();

    if (title.length === 0 || blocked || isSearching) {
      return;
    }

    setStatus(null);
    setIsSearching(true);

    // Client side per code-standards.md. No send_instantly here, unlike the auth
    // captures — nothing navigates away, the page stays put while the run works.
    posthog.capture("job_search_started", {
      userId,
      jobTitle: title,
      location: location.trim(),
    });

    try {
      const response = await fetch("/api/agent/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: title,
          location: location.trim(),
          country,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setStatus({ kind: "error", message: result.error ?? SEARCH_ERROR });
        return;
      }

      setStatus({ kind: "success", message: result.data.message });
      // The table is server-rendered from the jobs table, so the new rows only
      // appear once the page data is refetched — the same pattern ResumeUpload
      // uses after an upload or a generate.
      router.refresh();
    } catch (error) {
      console.error("[find-jobs/SearchControls]", error);
      setStatus({ kind: "error", message: SEARCH_ERROR });
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <form
        onSubmit={(event) => void findJobs(event)}
        className="grid gap-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[1fr_1fr_auto_auto]"
      >
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
              value={jobTitle}
              disabled={isSearching}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </div>
        </Field>

        {/* The placeholder no longer invites a country. Location is a place
            *within* the selected market now, and typing "India" here is exactly
            what used to produce Indianapolis. */}
        <Field label="Location" htmlFor="location">
          <Input
            id="location"
            name="location"
            placeholder="Remote, Bengaluru, New York..."
            value={location}
            disabled={isSearching}
            onChange={(event) => setLocation(event.target.value)}
          />
        </Field>

        <Field label="Country" htmlFor="country">
          <Select
            id="country"
            name="country"
            value={country}
            disabled={isSearching}
            onChange={(event) =>
              setCountry(event.target.value as AdzunaCountry)
            }
          >
            {ADZUNA_MARKETS.map((market) => (
              <option key={market.code} value={market.code}>
                {market.name}
              </option>
            ))}
          </Select>
        </Field>

        {/* Button `md` is h-9 while every form control is h-10, so a button on a
            field row states its own height. */}
        <Button
          type="submit"
          disabled={blocked || isSearching || jobTitle.trim().length === 0}
          className="h-10 px-5"
        >
          <Search aria-hidden className="size-4" />
          {isSearching ? "Searching…" : "Find Jobs"}
        </Button>
      </form>

      {/* A disabled control that does not say why reads as broken — the same
          call feature 08 made on the Generate button. */}
      {blocked ? (
        <p className="mt-3 text-xs text-text-muted">{BLOCKED_MESSAGE}</p>
      ) : null}

      {isSearching ? (
        <p role="status" className="mt-4 text-sm text-text-secondary">
          Searching Adzuna and scoring each role against your profile — this
          takes a few seconds.
        </p>
      ) : null}

      {status && !isSearching ? (
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
            status.kind === "error"
              ? "border-error/30 bg-error/10 text-text-primary"
              : "border-success/30 bg-success-lightest text-success-foreground",
          )}
        >
          {status.kind === "success" ? (
            <Sparkles aria-hidden className="size-4 shrink-0 text-success" />
          ) : null}
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
