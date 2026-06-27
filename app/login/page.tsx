import Image from "next/image";
import Link from "next/link";
import { initiateOAuth } from "@/actions/auth";

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
  exchange_failed: "We could not finish sign in. Please try again.",
  missing_verifier: "Your sign in session expired. Please start again.",
  oauth_failed: "The provider could not complete sign in. Please try again.",
  oauth_init: "We could not start sign in. Please try again.",
  provider: "That sign in provider is not available.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = errorKey ? errorMessages[errorKey] : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center justify-center border-x border-border bg-surface-muted px-6 py-12">
      <section className="w-full max-w-[440px] rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex justify-center">
          <Link href="/" aria-label="JobPilot home">
            <Image
              src="/logo.png"
              alt="JobPilot"
              width={124}
              height={40}
              priority
              className="h-9 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-2xl font-semibold leading-8 text-text-primary">
            Sign in to JobPilot
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Use your Google or GitHub account to continue.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-md border border-error bg-surface px-3 py-2 text-sm leading-5 text-error">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {oauthProviders.map((provider) => (
            <form action={initiateOAuth} key={provider.id}>
              <input type="hidden" name="provider" value={provider.id} />
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary shadow-sm transition hover:bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <span className="flex h-7 min-w-7 items-center justify-center rounded-sm border border-border bg-surface-secondary text-xs font-semibold text-text-dark">
                  {provider.mark}
                </span>
                {provider.label}
              </button>
            </form>
          ))}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-text-muted">
          Protected pages open after your session is created.
        </p>
      </section>
    </main>
  );
}
