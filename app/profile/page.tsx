import { signOut } from "@/actions/auth";
import { AppNavbar } from "@/components/layout/AppNavbar";

export default function ProfilePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] border-x border-border bg-background">
      <AppNavbar />

      <section className="flex justify-center px-6 py-14">
        <div className="w-full max-w-[640px] rounded-xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="text-2xl font-semibold leading-8 text-text-primary">
            Profile
          </h1>
          <p className="mt-4 text-base leading-7 text-text-secondary">
            Profile setup is next after the foundation auth flow is complete.
          </p>

          <form action={signOut} className="mt-8">
            <button className="rounded-md border border-border bg-surface px-6 py-3 text-base font-medium text-text-primary shadow-sm transition hover:bg-surface-secondary">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
