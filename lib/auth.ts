import type { UserSchema } from "@insforge/shared-schemas";
import { createServerClient } from "@insforge/sdk/ssr";
import { redirect } from "next/navigation";

import { createInsforgeServer } from "@/lib/insforge-server";

type ProfileCompletionRow = {
  is_complete: boolean | null;
};

export async function getCurrentUser(): Promise<UserSchema | null> {
  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.auth.getCurrentUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireUser(): Promise<UserSchema> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getPostLoginRedirectPath(
  userId: string,
  accessToken?: string,
): Promise<string> {
  const insforge = accessToken
    ? createServerClient({ accessToken })
    : await createInsforgeServer();
  const { data, error } = await insforge.database
    .from("profiles")
    .select("is_complete")
    .eq("id", userId)
    .maybeSingle<ProfileCompletionRow>();

  if (error || !data?.is_complete) {
    return "/profile";
  }

  return "/dashboard";
}
