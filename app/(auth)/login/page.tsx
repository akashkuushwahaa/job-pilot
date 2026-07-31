import type { ComponentType } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signInWithProvider } from "@/actions/auth";
import { OAuthButton } from "@/components/auth/OAuthButton";
import { OAUTH_PROVIDERS, getSessionUser, type OAuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in — JobPilot",
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const PROVIDER_META: Record<
  OAuthProvider,
  { label: string; Icon: ComponentType }
> = {
  google: { label: "Google", Icon: GoogleMark },
  github: { label: "GitHub", Icon: GithubMark },
};

const ERROR_MESSAGES: Record<string, string> = {
  oauth_unavailable: "We couldn't start that sign-in. Please try again.",
  oauth_failed: "That sign-in didn't complete. Please try again.",
  session_expired: "That sign-in took too long. Please start again.",
  unsupported_provider: "That sign-in method isn't available.",
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  // The authoritative check, deliberately here rather than in proxy.ts — see the
  // comment there. A stale-but-unexpired cookie resolves to null and renders the
  // form instead of bouncing back to /dashboard.
  if (await getSessionUser()) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.")
    : null;

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="JobPilot"
            width={496}
            height={168}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <div className="mt-8 rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-center text-base font-semibold text-text-primary">
            Welcome to JobPilot
          </h1>
          <p className="mt-2 text-center text-sm leading-6 text-text-secondary">
            Sign in to set up your profile and start finding matches.
          </p>

          {errorMessage ? (
            <p
              role="alert"
              className="mt-6 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-text-primary"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            {OAUTH_PROVIDERS.map((provider) => {
              const { label, Icon } = PROVIDER_META[provider];

              return (
                <form
                  key={provider}
                  action={signInWithProvider.bind(null, provider)}
                >
                  <OAuthButton label={label} icon={<Icon />} />
                </form>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-text-muted">
          By continuing you agree to let JobPilot store your profile and resume
          so it can score jobs against your skills.
        </p>
      </div>
    </main>
  );
}
