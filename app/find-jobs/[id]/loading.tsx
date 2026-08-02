// Shown the moment a row is clicked. The rows carry prefetch={false} — twenty
// of them prefetching would be twenty auth checks and twenty job reads just from
// scrolling the list — so without this the click has no feedback at all until
// the server answers.
//
// It costs the route its hard 404: a streamed response has already sent its
// headers, so notFound() becomes a 200 carrying `robots: noindex`. That is the
// documented trade, and it is free here — /find-jobs/[id] is behind auth and
// nothing crawls it.
//
// No AppNavbar: this renders inside the page slot, and the navbar belongs to the
// page and to not-found.tsx. A skeleton navbar would flash a second header.
export default function Loading() {
  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="h-5 w-28 animate-pulse rounded-md bg-border-light" />

        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="size-14 shrink-0 animate-pulse rounded-xl bg-border-light" />
              <div className="w-full space-y-3">
                <div className="h-7 w-2/3 animate-pulse rounded-md bg-border-light" />
                <div className="h-4 w-1/3 animate-pulse rounded-md bg-border-light" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((card) => (
              <div
                key={card}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="size-9 shrink-0 animate-pulse rounded-lg bg-border-light" />
                <div className="w-full space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded-md bg-border-light" />
                  <div className="h-3 w-1/2 animate-pulse rounded-md bg-border-light" />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="h-3 w-40 animate-pulse rounded-md bg-border-light" />
            <div className="h-4 w-full animate-pulse rounded-md bg-border-light" />
            <div className="h-4 w-full animate-pulse rounded-md bg-border-light" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-border-light" />
          </div>
        </div>
      </div>
    </main>
  );
}
