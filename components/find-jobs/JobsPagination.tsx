import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pageSize: number;
  totalResults: number;
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

// Page count is derived from the totals rather than passed in, so "showing 1 to
// 6 of 24" and the page buttons can never disagree. Every control is inert until
// feature 11 — Previous is disabled on the first page because there is nowhere
// to go, not because the logic is missing.
export function JobsPagination({ page, pageSize, totalResults }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalResults);

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
        <Button type="button" variant="secondary" disabled={page === 1}>
          Previous
        </Button>

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
            <Button
              key={item}
              type="button"
              variant="secondary"
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "w-9 px-0",
                item === page &&
                  "border-accent/30 bg-accent-muted text-accent hover:bg-accent-light",
              )}
            >
              {item}
            </Button>
          ),
        )}

        <Button type="button" variant="secondary" disabled={page === totalPages}>
          Next
        </Button>
      </nav>
    </div>
  );
}
