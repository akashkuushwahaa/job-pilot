import { AppNavbar } from "@/components/layout/AppNavbar";
import { getCurrentUser, getPostLoginRedirectPath } from "@/lib/auth";
import { redirect } from "next/navigation";

const oauthProviders = [
  {
    id: "google",
    label: "Continue with Google",
    mark: "G",
  },
  {
    id: "github",
    label: "Continue with GitHub",
    mark: "GH",
  },
] as const;

const errorMessages: Record<string, string> = {
  callback: "We could not finish sign in. Please try again.",
  oauth: "We could not start that sign-in method. Please try again.",
  provider: "That sign in provider is not available.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect(await getPostLoginRedirectPath(user.id));
  }

  const params = await searchParams;
  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = errorKey ? errorMessages[errorKey] : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] overflow-hidden border-x border-border bg-surface-muted">
      <AppNavbar />

      <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-[760px] overflow-hidden rounded-xl border border-border bg-surface shadow-sm md:grid-cols-[1.15fr_1fr]">
          <div className="border-b border-border bg-[radial-gradient(circle_at_22%_22%,var(--color-hero-pink)_0,transparent_35%),radial-gradient(circle_at_78%_28%,var(--color-hero-blue)_0,transparent_36%),linear-gradient(180deg,var(--color-surface)_0%,var(--color-hero-pink)_100%)] p-8 md:border-b-0 md:border-r md:p-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary shadow-sm">
              <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-accent text-[10px] font-semibold leading-none text-accent">
                O
              </span>
              OAuth secured by InsForge
            </span>

            <h1 className="mt-8 max-w-[360px] text-[42px] font-bold leading-[1.05] text-text-slate md:text-[48px]">
              Sign in and let the agent prep your next application.
            </h1>
            <p className="mt-6 max-w-[360px] text-base leading-7 text-text-secondary">
              Connect with Google or GitHub to start building your profile,
              matching jobs, and creating tailored application materials.
            </p>
            <p className="mt-10 text-xs font-medium leading-5 text-text-secondary">
              After sign-in, your dashboard opens with the next steps.
            </p>
          </div>

          <div className="flex flex-col justify-center p-8 md:p-10">
            <p className="text-sm leading-5 text-text-secondary">Welcome to</p>
            <h2 className="mt-2 text-2xl font-semibold leading-8 text-text-primary">
              JobPilot
            </h2>
            <p className="mt-3 text-sm leading-5 text-text-secondary">
              Choose your preferred provider to continue.
            </p>

            {error ? (
              <div className="mt-6 rounded-md border border-error bg-surface px-3 py-2 text-sm leading-5 text-error">
                {error}
              </div>
            ) : null}

            <div className="mt-7 space-y-3">
              {oauthProviders.map((provider) => (
                <form
                  action={`/api/auth/oauth/${provider.id}`}
                  key={provider.id}
                  method="get"
                >
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary transition hover:bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <span className="flex min-w-6 items-center justify-center text-xs font-semibold text-accent">
                      {provider.mark}
                    </span>
                    {provider.label}
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>

  );
}
