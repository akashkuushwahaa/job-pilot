"use server";

import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signOut(): Promise<never> {
  const auth = createAuthActions({ cookies: await cookies() });
  const { error } = await auth.signOut();

  if (error) {
    console.error("[actions/auth]", error);
  }

  redirect("/login");
}
