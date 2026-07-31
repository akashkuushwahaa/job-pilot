"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";

import {
  OAUTH_CODE_VERIFIER_COOKIE,
  OAUTH_PROVIDERS,
  type OAuthProvider,
} from "@/lib/auth";

function isOAuthProvider(value: string): value is OAuthProvider {
  return OAUTH_PROVIDERS.some((provider) => provider === value);
}

// Returns a destination rather than redirecting: redirect() signals by throwing,
// so calling it inside the try block below would be swallowed by the catch.
async function startOAuth(provider: string): Promise<string> {
  if (!isOAuthProvider(provider)) {
    console.error("[actions/auth] unsupported provider:", provider);
    return "/login?error=unsupported_provider";
  }

  try {
    const cookieStore = await cookies();
    const auth = createAuthActions({ cookies: cookieStore });

    const { data, error } = await auth.signInWithOAuth(provider, {
      redirectTo: new URL(
        "/api/auth/callback",
        process.env.NEXT_PUBLIC_APP_URL,
      ).toString(),
      skipBrowserRedirect: true,
    });

    if (error || !data.url || !data.codeVerifier) {
      console.error("[actions/auth] startOAuth", error);
      return "/login?error=oauth_unavailable";
    }

    cookieStore.set(OAUTH_CODE_VERIFIER_COOKIE, data.codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return data.url;
  } catch (error) {
    console.error("[actions/auth] startOAuth", error);
    return "/login?error=oauth_unavailable";
  }
}

async function clearSession(): Promise<void> {
  try {
    const auth = createAuthActions({ cookies: await cookies() });
    await auth.signOut();
  } catch (error) {
    console.error("[actions/auth] clearSession", error);
  }
}

export async function signInWithProvider(provider: string): Promise<void> {
  const destination = await startOAuth(provider);
  redirect(destination);
}

export async function signOut(): Promise<void> {
  await clearSession();
  redirect("/");
}
