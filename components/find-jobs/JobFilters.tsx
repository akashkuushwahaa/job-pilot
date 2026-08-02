import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

// Uncontrolled on purpose — feature 11 wires all three onto the query that reads
// the jobs table. The option values are the filter and sort keys that feature
// will use, so the markup does not change when the logic lands.
export function JobFilters() {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
        />
        <Input
          aria-label="Filter by company or role"
          placeholder="Filter by company or role..."
          className="border-transparent pl-9"
        />
      </div>

      <div aria-hidden className="hidden h-8 w-px shrink-0 bg-border sm:block" />

      <div className="flex gap-3">
        <Select
          aria-label="Filter by match"
          defaultValue="all"
          className="w-auto font-medium"
        >
          <option value="all">All Matches</option>
          <option value="high">High Match</option>
          <option value="low">Low Match</option>
        </Select>

        <Select
          aria-label="Sort jobs"
          defaultValue="score"
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
