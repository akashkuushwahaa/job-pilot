import { PostHog } from "posthog-node";

// The server half of the event list in code-standards.md. A union rather than a
// bare string is what stops the two lists drifting apart across sessions.
export type ServerEventName =
  | "user_signed_in"
  | "job_found"
  | "profile_completed"
  | "company_researched";

type EventProperties = Record<string, string | number | boolean | null>;

// captureImmediate rather than capture + shutdown: in posthog-node 5 `shutdown()`
// returns void, so the `await posthog.shutdown()` pattern in the PostHog docs no
// longer waits for anything. captureImmediate resolves once the event has actually
// been sent, which is what a request-scoped handler needs before it returns.
export async function captureServerEvent(
  userId: string,
  event: ServerEventName,
  properties: EventProperties = {},
): Promise<void> {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!projectToken || !host) {
    console.error("[lib/posthog-server] not configured, dropped event:", event);
    return;
  }

  const posthog = new PostHog(projectToken, {
    host,
    flushAt: 1,
    flushInterval: 0,
    // Bounded on purpose. The library defaults — 3 retries, 3s apart, 10s timeout
    // each — take ~49s against an endpoint that accepts the connection and never
    // answers, which holds the serverless function open long after the response
    // has gone. Worst case here is ~7s.
    fetchRetryCount: 1,
    fetchRetryDelay: 1000,
    requestTimeout: 3000,
  });

  // captureImmediate resolves even when delivery failed, so the catch below never
  // sees a transport error. This listener is the only place a dropped event surfaces.
  posthog.on("error", (error: unknown) => {
    console.error("[lib/posthog-server] delivery failed:", event, error);
  });

  try {
    await posthog.captureImmediate({
      distinctId: userId,
      event,
      properties: { userId, ...properties },
    });
  } catch (error) {
    // Analytics never takes down the request that triggered it.
    console.error("[lib/posthog-server]", error);
  } finally {
    posthog.shutdown();
  }
}
