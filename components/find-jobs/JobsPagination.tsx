import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { JOBS_PAGE_SIZE, jobsHref } from "@/lib/jobs";
import { cn } from "@/lib/utils";
import type { JobQuery } from "@/types";

type Props = {
  query: JobQuery;
  totalResults: number;
};

type ControlProps = {
  href: string | null;
  label: string;
  ariaLabel: string;
  current?: boolean;
  className?: string;
};

// First page, last page, and a three-wide window around the current one. The
// design draws 1 2 3 … 8 on page one, which is this at page=1, totalPages=8.
function pageItems(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(2, Math.min(page - 1, totalPages - 3));
  const end = Math.min(totalPages - 1, Math.max(page + 1, 3));
  const items: (number | "gap")[] = [1];

  if (start > 2) items.push("gap");
  for (let current = start; current <= end; current += 1) items.push(current);
  if (end < totalPages - 1) items.push("gap");

  items.push(totalPages);

  return items;
}

// A control that navigates is a Link carrying buttonVariants; a control with
// nowhere to go is a disabled Button. Previous on page one has no href because
// there is no such page — that is a real state, not a missing one, and an <a>
// cannot express it.
function PageControl({
  href,
  label,
  ariaLabel,
  current,
  className,
}: ControlProps) {
  const classes = cn(
    className,
    current &&
      "border-accent/30 bg-accent-muted text-accent hover:bg-accent-light",
  );

  if (href === null) {
    return (
      <Button
        type="button"
        variant="secondary"
        disabled
        aria-label={ariaLabel}
        className={classes}
      >
        {label}
      </Button>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={current ? "page" : undefined}
      className={buttonVariants({ variant: "secondary", className: classes })}
    >
      {label}
    </Link>
  );
}

// Page count is derived from the totals rather than passed in, so "showing 1 to
// 6 of 24" and the page buttons can never disagree. Every href carries the whole
// query, so paging never silently drops the filter that produced the list.
export function JobsPagination({ query, totalResults }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalResults / JOBS_PAGE_SIZE));
  const page = query.page;
  const from = (page - 1) * JOBS_PAGE_SIZE + 1;
  const to = Math.min(page * JOBS_PAGE_SIZE, totalResults);

  return (
    <div className="flex flex-col gap-4 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-text-secondary">
        Showing{" "}
        <span className="font-semibold text-text-primary">{from}</span> to{" "}
        <span className="font-semibold text-text-primary">{to}</span> of{" "}
        <span className="font-semibold text-text-primary">{totalResults}</span>{" "}
        results
      </p>

      <nav aria-label="Jobs pagination" className="flex items-center gap-2">
        <PageControl
          href={page > 1 ? jobsHref({ ...query, page: page - 1 }) : null}
          label="Previous"
          ariaLabel="Previous page"
        />

        {pageItems(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden
              className="px-1 text-sm text-text-muted"
            >
              …
            </span>
          ) : (
            <PageControl
              key={item}
              href={jobsHref({ ...query, page: item })}
              label={String(item)}
              ariaLabel={`Page ${item}`}
              current={item === page}
              className="w-9 px-0"
            />
          ),
        )}

        <PageControl
          href={page < totalPages ? jobsHref({ ...query, page: page + 1 }) : null}
          label="Next"
          ariaLabel="Next page"
        />
      </nav>
    </div>
  );
}
