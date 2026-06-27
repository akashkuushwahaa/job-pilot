import Link from "next/link";
import { signOut } from "@/actions/auth";

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] border-x border-border bg-background px-6 py-8">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-accent">
              Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-8 text-text-primary">
              Your JobPilot dashboard is protected
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Full dashboard UI comes later in the build plan.
            </p>
          </div>
          <form action={signOut}>
            <button className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-sm transition hover:bg-surface-secondary">
              Sign out
            </button>
          </form>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm transition hover:bg-accent-dark"
          >
            Profile
          </Link>
          <Link
            href="/find-jobs"
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-sm transition hover:bg-surface-secondary"
          >
            Find Jobs
          </Link>
        </div>
      </section>
    </main>
  );
}
