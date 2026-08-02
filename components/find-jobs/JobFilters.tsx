"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { jobsHref, toJobSort, toMatchFilter } from "@/lib/jobs";
import type { JobQuery } from "@/types";

// Long enough that a typed word is one request rather than five, short enough
// that the list still feels attached to the keyboard.
const DEBOUNCE_MS = 300;

type Props = {
  query: JobQuery;
};

export function JobFilters({ query }: Props) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // replace, not push: a filter bar that stacks a history entry per keystroke
  // makes the back button a way to un-type. Pagination pushes, because moving
  // between pages is a step a user expects to be able to walk back.
  function apply(next: Partial<JobQuery>): void {
    router.replace(jobsHref({ ...query, ...next, page: 1 }));
  }

  function filterByText(value: string): void {
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => apply({ text: value.trim() }), DEBOUNCE_MS);
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
        />
        {/* The one uncontrolled control left on the page. Seeded from the URL on
            mount and never re-seeded: the debounced replace lands while the user
            is still typing, so a value prop fed back from the server would race
            the keyboard and drop characters. */}
        <Input
          aria-label="Filter by company or role"
          placeholder="Filter by company or role..."
          className="border-transparent pl-9"
          defaultValue={query.text}
          onChange={(event) => filterByText(event.target.value)}
        />
      </div>

      <div aria-hidden className="hidden h-8 w-px shrink-0 bg-border sm:block" />

      <div className="flex gap-3">
        <Select
          aria-label="Filter by match"
          value={query.match}
          onChange={(event) => apply({ match: toMatchFilter(event.target.value) })}
          className="w-auto font-medium"
        >
          <option value="all">All Matches</option>
          <option value="high">High Match</option>
          <option value="low">Low Match</option>
        </Select>

        <Select
          aria-label="Sort jobs"
          value={query.sort}
          onChange={(event) => apply({ sort: toJobSort(event.target.value) })}
          className="w-auto font-medium"
        >
          <option value="score">Match Score</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </Select>
      </div>
    </section>
  );
}
