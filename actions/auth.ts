"use server";

import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const enabledOAuthProviders = ["google", "github"] as const;

type OAuthProvider = (typeof enabledOAuthProviders)[number];

function isOAuthProvider(value: FormDataEntryValue | null): value is OAuthProvider {
  return (
    typeof value === "string" &&
    enabledOAuthProviders.some((provider) => provider === value)
  );
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function initiateOAuth(formData: FormData): Promise<never> {
  const provider = formData.get("provider");

  if (!isOAuthProvider(provider)) {
    redirect("/login?error=provider");
  }

  const cookieStore = await cookies();
  const auth = createAuthActions({ cookies: cookieStore });
  let oauthUrl: string | null = null;

  try {
    const { data, error } = await auth.signInWithOAuth(provider, {
      redirectTo: new URL("/api/auth/callback", getAppUrl()).toString(),
      skipBrowserRedirect: true,
    });

    if (error || !data?.url || !data?.codeVerifier) {
      redirect("/login?error=oauth_init");
    }

    cookieStore.set("insforge_code_verifier", data.codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    oauthUrl = data.url;
  } catch (error) {
    console.error("[actions/auth]", error);
    redirect("/login?error=oauth_init");
  }

  redirect(oauthUrl);
}

export async function signOut(): Promise<never> {
  const auth = createAuthActions({ cookies: await cookies() });
  const { error } = await auth.signOut();

  if (error) {
    console.error("[actions/auth]", error);
  }

  redirect("/login");
}
