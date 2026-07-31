import { redirect } from "next/navigation";

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
export async function getSessionUser(): Promise<SessionUser | null> {
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.auth.getCurrentUser();

  if (error) {
    return null;
  }

  return data?.user ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
