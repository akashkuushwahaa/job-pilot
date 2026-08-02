import Browserbase from "@browserbasehq/sdk";

// Seconds, not milliseconds — Browserbase's own unit. architecture.md fixes it
// at 120: the research run visits a homepage plus at most three sub-pages, and
// a session that outlives its work is billed for the difference.
const SESSION_TIMEOUT_SECONDS = 120;

// Never throws and never returns a half-built client. A missing key, a rejected
// project id and a Browserbase outage are all the same thing to the caller —
// there will be no browser this run — and agent/research.ts answers that by
// synthesising the dossier from the job and the profile alone. The user still
// gets a dossier, which is the rule the whole feature is built around.
export async function createResearchSession(): Promise<string | null> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    console.error("[lib/browserbase] BROWSERBASE_* env vars are not set");
    return null;
  }

  try {
    const browserbase = new Browserbase({ apiKey });

    const session = await browserbase.sessions.create({
      projectId,
      timeout: SESSION_TIMEOUT_SECONDS,
    });

    return session.id;
  } catch (error) {
    console.error("[lib/browserbase] could not create a session", error);
    return null;
  }
}

// Ends a session that no Stagehand client ever took ownership of.
//
// `stagehand.close()` releases the session it is attached to — but when init
// fails there is no client to close, and the session sits open for its full 120
// seconds holding the free plan's only slot. The next research click then finds
// the browser unavailable for a reason nothing in the logs explains. Only for
// that path: a session Stagehand owns is closed by Stagehand.
export async function releaseSession(sessionId: string): Promise<void> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    return;
  }

  try {
    const browserbase = new Browserbase({ apiKey });

    await browserbase.sessions.update(sessionId, {
      projectId,
      status: "REQUEST_RELEASE",
    });
  } catch (error) {
    console.error("[lib/browserbase] could not release the session", error);
  }
}
