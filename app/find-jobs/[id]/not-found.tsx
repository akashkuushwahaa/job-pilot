import Link from "next/link";
import { SearchX } from "lucide-react";

import { AppNavbar } from "@/components/layout/AppNavbar";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";

// Rendered when the page calls notFound() — a job id that is not a uuid, or one
// that does not belong to this user. Without this file Next serves its bare
// default 404, which carries no AppNavbar, and architecture.md makes that an
// invariant: a protected page with no navigation is a dead end. /dashboard
// shipped that way once and stranded signed-in users.
//
// not-found.tsx takes no props, so the session is read here rather than passed.
// getSessionUser is wrapped in React cache(), so on the request that rendered
// the page this costs no extra round trip.
export default async function JobNotFound() {
  const user = await getSessionUser();

  return (
    <>
      {user === null ? null : <AppNavbar active="find-jobs" userId={user.id} />}

      <main className="flex-1 bg-background">
        <div className="mx-auto w-full max-w-4xl px-6 py-16">
          <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-6 py-16 text-center shadow-sm">
            <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-secondary text-text-muted">
              <SearchX aria-hidden className="size-5" />
            </span>

            <h1 className="mt-4 text-base font-semibold text-text-primary">
              Job not found
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
              This job is not in your list. It may have been removed, or the
              link may be wrong.
            </p>

            <Link
              href="/find-jobs"
              className={buttonVariants({
                variant: "secondary",
                size: "lg",
                className: "mt-6",
              })}
            >
              Back to Jobs
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
