import type { InsforgeServerClient } from "@/lib/insforge-server";

export type AgentLogLevel = "info" | "success" | "warning" | "error";

type LogEntry = {
  runId: string | null;
  userId: string;
  message: string;
  level: AgentLogLevel;
  jobId?: string | null;
};

// The one place agent_logs is written. Deliberately never throws and never
// returns a result: a run that fails to record what went wrong has still done
// its real work, and code-standards.md's rule that one failure must not crash
// the run applies to the logger itself first of all.
export async function logAgent(
  insforge: InsforgeServerClient,
  entry: LogEntry,
): Promise<void> {
  try {
    const { error } = await insforge.database.from("agent_logs").insert([
      {
        run_id: entry.runId,
        user_id: entry.userId,
        message: entry.message,
        level: entry.level,
        job_id: entry.jobId ?? null,
      },
    ]);

    if (error) {
      console.error("[agent/logs] write failed", error);
    }
  } catch (error) {
    console.error("[agent/logs]", error);
  }
}

// Agent errors go to agent_logs, never to the user — code-standards.md. The
// caller decides what the user sees; this only records what actually happened.
export async function logAgentError(
  insforge: InsforgeServerClient,
  entry: Omit<LogEntry, "level" | "message"> & { message: string },
): Promise<void> {
  await logAgent(insforge, { ...entry, level: "error" });
}
