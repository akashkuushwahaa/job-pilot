import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";

import { createInsforgeServer } from "@/lib/insforge-server";

type InsforgeServerClient = Awaited<ReturnType<typeof createInsforgeServer>>;

export type SessionUser = NonNullable<
  Awaited<
    ReturnType<InsforgeServerClient["auth"]["getCurrentUser"]>
  >["data"]["user"]
>;

export const OAUTH_PROVIDERS = ["google", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const OAUTH_CODE_VERIFIER_COOKIE = "insforge_code_verifier";

// No try/catch on purpose. The SDK reports transport and auth failures through
// `error` rather than throwing, so the only things that throw here are a missing
// InsForge config — which must fail loudly instead of silently rendering as
// "signed out" — and Next's own control-flow exceptions, which have to reach Next.
//
// Memoised per request: the root layout resolves the session to identify the user
// to PostHog and the page resolves it again to authorize. Without cache() that is
// two InsForge round-trips on every authenticated render.
export const getSessionUser = cache(
  async (): Promise<SessionUser | null> => {
    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.auth.getCurrentUser();

    if (error) {
      return null;
    }

    return data?.user ?? null;
  },
);

// The root layout resolves the session only to identify the user to PostHog, and
// analytics is not worth taking every route down for. Authorization still runs
// through getSessionUser/requireUser inside the page, so a genuine config failure
// still fails loudly there — one route on a styled boundary instead of the whole
// app on the global one.
export async function getSessionUserForAnalytics(): Promise<SessionUser | null> {
  try {
    return await getSessionUser();
  } catch (error) {
    // Next signals control flow by throwing. Swallowing DYNAMIC_SERVER_USAGE here
    // hides the dynamic signal from Next's static probe and spams the build log —
    // only genuine failures should degrade to "not identified".
    unstable_rethrow(error);
    console.error("[lib/auth] session unavailable for analytics", error);
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
