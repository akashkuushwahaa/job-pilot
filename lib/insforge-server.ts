import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

// Exported so agent functions can take the client as a parameter rather than
// building a second one — createInsforgeServer() reads cookies, and one run
// makes several writes that all belong to the same request.
export type InsforgeServerClient = ReturnType<typeof createServerClient>;

export async function createInsforgeServer(): Promise<InsforgeServerClient> {
  return createServerClient({ cookies: await cookies() });
}
