import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export async function createInsforgeServer(): Promise<
  ReturnType<typeof createServerClient>
> {
  return createServerClient({
    cookies: await cookies(),
  });
}
