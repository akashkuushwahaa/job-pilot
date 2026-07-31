import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

type InsforgeServerClient = ReturnType<typeof createServerClient>;

export async function createInsforgeServer(): Promise<InsforgeServerClient> {
  return createServerClient({ cookies: await cookies() });
}
