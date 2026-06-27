import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] border-x border-border bg-background px-6 py-8">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-xs font-medium uppercase text-accent">Profile</p>
        <h1 className="mt-2 text-2xl font-semibold leading-8 text-text-primary">
          Profile is protected
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          The complete profile UI is scheduled for Phase 2.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-sm transition hover:bg-surface-secondary"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
