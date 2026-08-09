# Code Standards

Implementation rules and conventions for the entire project. The AI agent must follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against architecture.md and project-overview.md
- **Scope is sacred** — only build what the current feature requires. Never go beyond scope even if it seems helpful
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Failures are expected** — wrap agent operations in try/catch, log failures, never let one failure crash everything

---

## TypeScript

- Strict mode enabled in tsconfig.json — no exceptions
- Never use `any` — use `unknown` and narrow the type
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why
- All function parameters and return types must be explicitly typed
- Use `type` for object shapes and unions — use `interface` only for extendable component props
- All async functions must have proper error handling — never let promises float unhandled
- Use `const` by default — only use `let` when reassignment is necessary

---

## Next.js 16 Conventions

- App Router only — no Pages Router
- React 19 — use React 19 APIs throughout
- All components are Server Components by default
- Only add `"use client"` when the component requires:
  - useState or useReducer
  - useEffect
  - Browser APIs
  - Event listeners
  - Third party client-only libraries (PostHog browser side)
- Never add `"use client"` to layout files unless absolutely required
- Data fetching happens in Server Components — never fetch in Client Components directly
- Route handlers live in `app/api/` — never put business logic directly in route handlers
- Server Actions live in `actions/` — never define Server Actions inline in components
- Caching is uncached by default — all dynamic code runs at request time
- Always read Next.js documentation before implementing any Next.js specific feature — APIs may differ from training data

---

## File and Folder Naming

- Folders: kebab-case — `job-details`, `agent-controls`
- Component files: PascalCase — `StatsBar.tsx`, `RecentActivity.tsx`
- Utility files: camelCase — `browserbase.ts`, `posthog-client.ts`
- Type files: camelCase — `index.ts`
- API route files: always `route.ts`
- Server Action files: camelCase — `profile.ts`, `jobs.ts`
- One component per file — never export multiple components from one file
- Index files only in `components/ui/` — never barrel export from other folders

---

## Component Structure

Every component follows this exact order:

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { StatsCard } from "@/components/dashboard/StatsCard";

// 3. Type definitions
type Props = {
  jobId: string;
  matchScore: number;
};

// 4. Component
export function ComponentName({ jobId, matchScore }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Never use default exports for components — always named exports
- Props type defined directly above the component — not in a separate types file unless shared
- No inline styles — all styling via Tailwind classes using CSS variables from ui-tokens.md

---

## API Route Handlers

```typescript
// app/api/agent/find/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // validate body
    // call agent function
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[agent/find]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch
- Every route handler validates the request body before processing
- Errors are logged with the route path as prefix: `[agent/find]`
- Always return `{ success: boolean, data?: T, error?: string }`
- Never return raw data without the success wrapper

---

## Server Actions

```typescript
// actions/profile.ts

"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function saveProfile(formData: ProfileFormData) {
  try {
    const insforge = await createInsforgeServer();
    // validate
    // write to DB
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("[actions/profile]", error);
    return { success: false, error: "Failed to save profile" };
  }
}
```

- Every Server Action has a try/catch
- Every Server Action returns `{ success: boolean, error?: string }`
- Always call `revalidatePath` after mutations that affect page data
- Never throw from Server Actions — always return the error

---

## Agent Code

```typescript
// agent/adzuna.ts

export async function discoverJobs(
  jobTitle: string,
  location: string,
  profile: Profile,
  runId: string,
): Promise<{ success: boolean; jobs?: Job[]; error?: string }> {
  try {
    // implementation
    return { success: true, jobs };
  } catch (error) {
    await logAgentError(runId, null, error);
    return { success: false, error: String(error) };
  }
}
```

- Every agent function returns `{ success: boolean, error?: string }`
- Every agent function has a try/catch — never let one failure crash the run
- Errors are always logged to agent_logs table before returning
- Agent functions never import from `components/` or `actions/`
- Agent functions never use React hooks or browser APIs

---

## InsForge Client Usage

```typescript
// Browser context — Client Components only
import { insforge } from "@/lib/insforge-client";

// Server context — Server Components, Route Handlers, Server Actions, Agent
import { createInsforgeServer } from "@/lib/insforge-server";
const insforge = await createInsforgeServer();
```

- Never use the browser client in server context
- Never use the server client in browser context
- Always await createInsforgeServer() — it reads cookies asynchronously
- Always scope every query to the current user_id — never query without a user filter
- **Rows come back as `any` — parse them, do not annotate them.** `insforge.database.from(...)`
  returns PostgREST's untyped builder, so `const x: Profile = data` type-checks and verifies nothing:
  `any` is assignable to anything. Narrow at the boundary with a zod schema, the way
  `parseProfile` in `lib/profile.ts` does. This matters most for `jsonb` columns, which Postgres does
  not check structurally at all — a drifted shape reaches the render as `undefined` and throws there.

---

## Error Handling

- Never use empty catch blocks — always log or handle
- Console errors always include context prefix: `[component/function name]`
- User-facing errors must be human readable — never expose raw error messages
- Agent errors go to agent_logs table — never surface raw agent errors to the UI
- API route errors return `status: 500` with generic message — never expose internals

---

## PostHog Events

All PostHog events must use these exact event names. Never invent new event names without adding them here first.

### Product events

| Event                | When                                       | Where  | Key Properties             |
| -------------------- | ------------------------------------------ | ------ | -------------------------- |
| `job_search_started` | Find Jobs button clicked                   | client | userId, jobTitle, location |
| `job_found`          | Each job discovered and saved              | server | userId, source, matchScore |
| `profile_completed`  | User saves complete profile for first time | server | userId                     |
| `company_researched` | Company research dossier generated         | server | userId, jobId, company     |

> Corrected in feature 17. These two lines used to read that `job_found` "powers the Jobs Found
> Over Time and Match Score Distribution dashboard charts" and `company_researched` "powers the
> Company Research Activity dashboard chart". **No dashboard chart reads PostHog.** All three read
> the user's own `jobs` rows — `found_at`, `match_score` and `researched_at`. PostHog cannot be read
> from this project at all (the only credential is the write-only project token, and there is no MCP
> server or skill), and `job_found` could not answer two of the three questions even if it could be:
> it carries no `jobId`, so distinct jobs cannot be counted, and it fires once per saved row on
> every run while `found_at` deliberately does not move on a re-discovery. See `build-plan.md`
> feature 17.

These four still fire, and are still the product's event record — they are simply not a read source.
Always fire them with correct properties.

All four are wired: `job_search_started` and `job_found` in feature 10, `profile_completed` in
feature 06, `company_researched` in feature 13. (This line previously said none were wired yet.)

### Auth lifecycle events

| Event                   | When                                | Where  | Key Properties |
| ----------------------- | ----------------------------------- | ------ | -------------- |
| `oauth_sign_in_started` | A provider button is submitted      | client | provider       |
| `user_signed_in`        | The OAuth code exchange succeeded   | server | userId         |
| `user_signed_out`       | The sign-out button is submitted    | client | userId         |

`oauth_sign_in_started` fires before any identity exists, so it carries the anonymous distinct ID
and no `userId`. `posthog.identify()` on the next authenticated render merges that anonymous ID
into the real one, which is what lets `oauth_sign_in_started → user_signed_in` work as a funnel.
Break that funnel down by step one's `provider` — that is why `user_signed_in` does not repeat it.

These seven events are the only events in this project. Do not add more without updating this list first.

---

## Environment Variables

All environment variables defined in `.env.local` for development. Never hardcode any key, URL, or secret anywhere in the codebase.

| Variable                            | Used In                                          |
| ----------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_INSFORGE_URL`          | read by the SDK itself                           |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY`     | read by the SDK itself                           |
| `NEXT_PUBLIC_APP_URL`               | actions/auth.ts                                  |
| `BROWSERBASE_API_KEY`               | lib/browserbase.ts                               |
| `BROWSERBASE_PROJECT_ID`            | lib/browserbase.ts                               |
| `OPENAI_API_KEY`                    | lib/openai.ts — the only reader; agent/ imports it |
| `ADZUNA_APP_ID`                     | lib/adzuna.ts                                    |
| `ADZUNA_APP_KEY`                    | lib/adzuna.ts                                    |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | instrumentation-client.ts, lib/posthog-server.ts |
| `NEXT_PUBLIC_POSTHOG_HOST`          | instrumentation-client.ts, lib/posthog-server.ts |

The PostHog variable is `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, not `NEXT_PUBLIC_POSTHOG_KEY` — that
is the name PostHog's own Next.js guide uses and the name already configured in `.env.local`.

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add `NEXT_PUBLIC_` to secret keys.

`NEXT_PUBLIC_INSFORGE_ANON_KEY` must be the **anon** key — it starts with `anon_`. InsForge's admin
API key starts with `ik_`, is full-access (equivalent to a service role key), and is what sits in
`.mcp.json` for the MCP server. Never put the `ik_` key in any `NEXT_PUBLIC_` variable. The `@insforge/sdk`
SSR helpers read `NEXT_PUBLIC_INSFORGE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY` from the environment
themselves, so `lib/insforge-client.ts` and `lib/insforge-server.ts` pass no credentials explicitly.

---

## Match Threshold

The job match threshold is defined once as a constant. Never hardcode this value anywhere else.

```typescript
// lib/utils.ts
export const MATCH_THRESHOLD = 70;
```

Import and use `MATCH_THRESHOLD` everywhere this value is needed.

---

## Import Aliases

Always use the `@/` alias — never use relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { insforge } from "@/lib/insforge-client";
import { MATCH_THRESHOLD } from "@/lib/utils";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Comments

- No comments explaining what the code does — code must be self-explanatory
- Comments only for why — explaining a non-obvious decision
- Agent functions may have a brief comment explaining the Browserbase or Stagehand strategy
- Never leave TODO comments in committed code

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does shadcn/ui already have this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?

Approved dependencies for this project:

- `@insforge/sdk` — InsForge client (SSR helpers live at `@insforge/sdk/ssr` and
  `@insforge/sdk/ssr/middleware`; there is no separate `@insforge/ssr` package)
- `@browserbasehq/sdk` — Browserbase sessions
- `@browserbasehq/stagehand` — AI browser control
- `openai` — GPT-4o API
- `posthog-js` — PostHog browser client
- `posthog-node` — PostHog server client
- `@react-pdf/renderer` — Resume PDF generation
- `pdf-parse` — Extract text from uploaded PDF
- `zod` — Schema validation
- `lucide-react` — Icons
- `tailwindcss` — Styling
- `shadcn/ui` components — UI primitives

Do not install any other packages without updating this list first.
