import { Stagehand } from "@browserbasehq/stagehand";

import { OPENAI_MODEL } from "@/lib/openai";

// Read off the installed types in
// node_modules/@browserbasehq/stagehand/dist/esm/lib/v3/, not off our own docs.
// Stagehand 3 renamed most of this surface and BOTH context files describe the
// version before it:
//
//   architecture.md   `modelName: "gpt-4o"` + `modelClientOptions` + `stagehand.page`
//   library-docs.md   `extract({ instruction, schema })` + `act({ action })`
//
// In v3 the model is one `model` object, there is no `.page` (it is
// `context.activePage()`), and extract/act take positional arguments:
// `extract(instruction, schema, options)` and `act(instruction, options)`.
// Both files have been corrected; this comment is here because the next person
// to read them will still be tempted to trust their memory over the types.
export type ResearchBrowser = Stagehand;

// Same shape as createResearchSession and getOpenAI: null rather than a throw,
// because a browser that will not start is a thinner dossier, not a failed
// request.
export async function openStagehand(
  sessionId: string,
): Promise<ResearchBrowser | null> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !projectId || !openaiKey) {
    console.error("[lib/stagehand] missing Browserbase or OpenAI credentials");
    return null;
  }

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey,
    projectId,
    browserbaseSessionID: sessionId,
    model: { modelName: OPENAI_MODEL, apiKey: openaiKey },
    // The extraction model is the project's one permitted model, so it obeys
    // the same code-standards.md rule as every other GPT-4o call.
    disablePino: true,
    verbose: 0,
  });

  try {
    await stagehand.init();
    return stagehand;
  } catch (error) {
    console.error("[lib/stagehand] init failed", error);

    // init() can fail after the CDP socket is open. Closing a Stagehand that
    // never finished initialising is itself allowed to fail, and swallowing
    // that is the point: the caller is already on the degraded path.
    await closeStagehand(stagehand);
    return null;
  }
}

// Always in a finally. An unclosed session holds a Browserbase slot for its full
// 120 seconds, and the free plan has exactly one — the next research click would
// find the browser unavailable for a reason nothing in the logs explains.
export async function closeStagehand(
  stagehand: ResearchBrowser,
): Promise<void> {
  try {
    await stagehand.close();
  } catch (error) {
    console.error("[lib/stagehand] close failed", error);
  }
}
