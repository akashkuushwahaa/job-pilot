import OpenAI from "openai";

// Every GPT-4o call in the project goes through this model string. Pinned here
// rather than passed in so no caller can quietly swap it — code-standards.md
// makes 'gpt-4o' the only permitted model.
export const OPENAI_MODEL = "gpt-4o";

let client: OpenAI | null = null;

// Built on first use rather than at module scope. `new OpenAI()` throws when the
// key is absent, and at module scope that turns a missing env var into an import
// error — which during `next build` fails the whole route, not the one request
// that needed it. Returning null instead lets the caller answer with something a
// user can read.
export function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("[lib/openai] OPENAI_API_KEY is not set");
    return null;
  }

  client ??= new OpenAI({ apiKey });

  return client;
}
