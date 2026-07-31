# Architecture

## Stack

| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Framework                      | Next.js 16 (App Router)  | Full stack framework                             |
| Auth + DB + Storage + Realtime | InsForge                 | Entire backend                                   |
| Cloud browser                  | Browserbase              | Company research — browsing company public pages |
| AI browser control             | Stagehand                | Company page interaction and content extraction  |
| Job Discovery                  | Adzuna API               | Job search and discovery                         |
| AI model                       | OpenAI GPT-4o            | Matching, research synthesis, extraction         |
| Analytics                      | PostHog                  | Event tracking and dashboard charts              |
| PDF generation                 | @react-pdf/renderer      | Resume PDF rendering                             |
| Styling                        | Tailwind CSS + shadcn/ui | UI components and styling                        |
| Language                       | TypeScript strict        | Throughout                                       |

---

## Folder Structure

```
/
├── AGENTS.md
├── instrumentation-client.ts               → PostHog browser init (Next 16 client instrumentation)
├── context/
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   ├── build-plan.md
│   └── progress-tracker.md
├── app/
│   ├── layout.tsx                          → Root layout, PostHog identity boundary
│   ├── error.tsx                           → Route-level error boundary
│   ├── global-error.tsx                    → Root-layout error boundary; renders its own <html>
│   ├── page.tsx                            → Homepage
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                   → Login page
│   ├── dashboard/
│   │   └── page.tsx                       → Main dashboard
│   ├── profile/
│   │   └── page.tsx                       → Profile form + resume management
│   ├── find-jobs/
│   │   ├── page.tsx                       → Find Jobs page — search controls + jobs list
│   │   └── [id]/
│   │       └── page.tsx                   → Individual job details page
│   └── api/
│       ├── auth/
│       │   ├── callback/route.ts          → OAuth code exchange, writes session cookies
│       │   └── refresh/route.ts           → Access token refresh for the browser client
│       ├── agent/
│       │   ├── find/route.ts              → Trigger Adzuna job discovery
│       │   └── research/route.ts          → Trigger company research agent
│       ├── resume/
│       │   ├── generate/route.ts          → Generate base resume PDF from profile
│       │   └── extract/route.ts           → Extract profile data from uploaded resume PDF
├── agent/
│   ├── adzuna.ts                          → Adzuna API job discovery + GPT-4o scoring
│   ├── research.ts                        → Company research — Browserbase + Stagehand + GPT-4o
│   ├── matcher.ts                         → GPT-4o job matching logic
│   ├── extractor.ts                       → GPT-4o job description extraction + structuring
│   └── types.ts                           → Agent-specific TypeScript types
├── actions/
│   ├── auth.ts                            → OAuth initiation + sign out
│   ├── profile.ts                         → Profile save + update
│   └── jobs.ts                            → Job status updates
├── components/
│   ├── ui/                                → shadcn/ui components only
│   ├── analytics/
│   │   └── PostHogIdentity.tsx             → Renders null; identifies the session user
│   ├── auth/
│   │   ├── OAuthButton.tsx                 → Submit button with pending state
│   │   └── SignOutButton.tsx               → Sign-out form; captures then resets PostHog
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── ErrorState.tsx                  → Shared card for both error boundaries
│   │   └── ComingSoon.tsx                  → Placeholder for unbuilt protected routes
│   ├── homepage/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Features.tsx
│   ├── dashboard/
│   │   ├── StatsBar.tsx
│   │   ├── RecentActivity.tsx
│   │   └── AnalyticsCharts.tsx
│   ├── profile/
│   │   ├── ProfileForm.tsx
│   │   ├── ResumeUpload.tsx
│   │   ├── ResumePreview.tsx
│   │   └── CompletionIndicator.tsx
│   ├── find-jobs/
│   │   ├── SearchControls.tsx
│   │   ├── JobsTable.tsx
│   │   ├── JobFilters.tsx
│   │   └── JobsPagination.tsx
│   └── job-details/
│       ├── JobInfo.tsx
│       ├── MatchScore.tsx
│       ├── JobDescription.tsx
│       ├── CompanyResearch.tsx
│       └── JobActions.tsx
├── proxy.ts                                → Session refresh + optimistic route protection
├── lib/
│   ├── insforge-client.ts                 → InsForge browser client instance
│   ├── insforge-server.ts                 → InsForge server client
│   ├── auth.ts                            → getSessionUser / requireUser, OAuth constants
│   ├── browserbase.ts                     → Browserbase session creation + management
│   ├── stagehand.ts                       → Stagehand initialisation with Browserbase session
│   ├── adzuna.ts                          → Adzuna API client
│   ├── posthog-server.ts                  → captureServerEvent — server-side PostHog capture
│   ├── fonts.ts                           → next/font instance, shared with global-error.tsx
│   └── utils.ts                           → Shared utility functions
└── types/
    └── index.ts                           → Global TypeScript types
```

---

## System Boundaries

| Folder        | Owns                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `app/`        | Pages and API routes only. No business logic.                                                          |
| `agent/`      | All agent logic. Adzuna discovery, company research, matching, extraction. Nothing here touches React. |
| `actions/`    | Server Actions for UI-triggered mutations only. Profile save, profile update.                          |
| `components/` | UI only. No data fetching logic. No direct DB calls.                                                   |
| `lib/`        | Third party client initialisation, shared utilities, and session guards (`getSessionUser`, `requireUser`). |
| `types/`      | TypeScript types shared across the project.                                                            |

---

## Data Flow

### UI Mutations (Server Actions)

```
User interaction in component
        ↓
Server Action in actions/
        ↓
InsForge DB write
        ↓
Revalidate or redirect
```

### Agent Operations (API Routes)

```
User clicks Find Jobs
        ↓
API route in app/api/agent/find
        ↓
Calls agent/adzuna.ts
        ↓
Adzuna API returns job listings
        ↓
GPT-4o scores each job against user profile
        ↓
Agent writes results to InsForge DB
        ↓
Page data revalidated
```

### Company Research (API Routes)

```
User clicks Research Company on job details page
        ↓
API route in app/api/agent/research
        ↓
Calls agent/research.ts
        ↓
Single Browserbase session opens with Stagehand
        ↓
Navigates to company homepage + sub pages
        ↓
GPT-4o synthesizes dossier from extracted content
        ↓
Dossier saved to jobs.company_research
        ↓
Page data revalidated
```

### Resume Operations (API Routes)

```
User uploads resume or clicks Generate
        ↓
API route in app/api/resume/
        ↓
GPT-4o processes content
        ↓
@react-pdf/renderer renders PDF buffer
        ↓
New PDF uploaded to InsForge Storage
        ↓
URL saved to profiles table
```

---

## InsForge Database Schema

### `profiles`

| Column              | Type        | Notes                                        |
| ------------------- | ----------- | -------------------------------------------- |
| id                  | uuid        | References auth.users                        |
| full_name           | text        |                                              |
| email               | text        | Pre-filled from auth                         |
| phone               | text        |                                              |
| location            | text        | City, country                                |
| current_title       | text        | Most recent job title                        |
| experience_level    | text        | junior / mid / senior / lead                 |
| years_experience    | integer     |                                              |
| skills              | text[]      | Array of skill tags                          |
| industries          | text[]      | Industries worked in                         |
| work_experience     | jsonb       | Array of up to 3 roles                       |
| education           | jsonb       | Degree, field, institution, year             |
| job_titles_seeking  | text[]      | Roles they want                              |
| remote_preference   | text        | remote / onsite / hybrid / any               |
| preferred_locations | text[]      | Optional preferred locations                 |
| salary_expectation  | text        | Optional                                     |
| linkedin_url        | text        |                                              |
| portfolio_url       | text        |                                              |
| work_authorization  | text        | citizen / permanent_resident / visa_required |
| resume_path         | text        | Storage object key, **not** a URL            |
| created_at          | timestamptz |                                              |
| updated_at          | timestamptz | Maintained by `system.update_updated_at()`   |

`id` is the PK and references `auth.users(id) ON DELETE CASCADE`. There is **no row until the user
saves** — `actions/profile.ts` upserts on first save, so every read must handle a missing profile.

Three columns from earlier drafts do not exist and must not be re-added:

- **`is_complete`, and any completion-percentage or missing-fields column.** Completeness is derived
  by one helper in `lib/`, so redefining "complete" never needs a backfill migration. A stored copy
  would be a second source of truth that silently goes stale.
- **`cover_letter_tone`.** Cover letter generation is out of scope.

### `agent_runs`

| Column             | Type        | Notes                        |
| ------------------ | ----------- | ---------------------------- |
| id                 | uuid        |                              |
| user_id            | uuid        | References profiles          |
| status             | text        | running / completed / failed |
| job_title_searched | text        |                              |
| location_searched  | text        |                              |
| jobs_found         | integer     | Total jobs discovered        |
| started_at         | timestamptz |                              |
| completed_at       | timestamptz |                              |

### `jobs`

| Column             | Type        | Notes                                          |
| ------------------ | ----------- | ---------------------------------------------- |
| id                 | uuid        |                                                |
| run_id             | uuid        | References agent_runs — null if from URL input |
| user_id            | uuid        | References auth.users                          |
| source             | text        | search / url                                   |
| external_id        | text        | Adzuna's stable job id — the dedupe key        |
| source_url         | text        | Original job listing URL                       |
| external_apply_url | text        | Direct company apply URL                       |
| title              | text        |                                                |
| company            | text        |                                                |
| location           | text        |                                                |
| salary             | text        | If available                                   |
| job_type           | text        | fulltime / parttime / contract                 |
| about_role         | text        | 2-3 sentence summary                           |
| responsibilities   | text[]      | Bullet points                                  |
| requirements       | text[]      | Bullet points                                  |
| nice_to_have       | text[]      | Optional                                       |
| benefits           | text[]      | Optional                                       |
| about_company      | text        | Brief company description                      |
| match_score        | integer     | 0-100 scored against main profile              |
| match_reason       | text        | GPT-4o explanation                             |
| matched_skills     | text[]      | Skills user has that match                     |
| missing_skills     | text[]      | Skills user lacks                              |
| company_research   | jsonb       | Company dossier from research agent            |
| found_at           | timestamptz |                                                |

**Re-running a search must not duplicate rows.** A unique partial index
`(user_id, source, external_id) WHERE external_id IS NOT NULL` is the dedupe key; feature 10 upserts
onto it. It is partial so that url-sourced jobs, which have no Adzuna id, are not all collapsed onto
one NULL row per user.

**The upsert must never include `company_research` in its update list.** Re-discovery refreshes
title, salary, `match_score`, `match_reason` and the skill arrays — writing the whole record back
would wipe a dossier the user already spent a Browserbase session generating. Verified against the
live database: after an upsert, `match_score` refreshed 50 → 91 and `company_research` survived.

No tailored-resume columns exist. Resume tailoring is out of scope.

### `agent_logs`

| Column     | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| id         | uuid        |                                  |
| run_id     | uuid        | References agent_runs            |
| user_id    | uuid        | References profiles              |
| message    | text        | Human readable log entry         |
| level      | text        | info / success / warning / error |
| job_id     | uuid        | Optional — related job           |
| created_at | timestamptz |                                  |

---

## InsForge Storage

| Bucket  | Path                  | Contents                  |
| ------- | --------------------- | ------------------------- |
| resumes | {user_id}/resume.pdf  | Current active resume PDF |

**The bucket is private.** `getPublicUrl()` does not work against it — `profiles.resume_path` stores
the object key, and a link is produced server-side at render time with
`createSignedUrl(path, 3600)`. A resume is PII, and on a public bucket its URL is a permanent bearer
token that leaks through logs, `Referer` headers and PostHog session replay.

Verified: an anonymous caller gets 403 listing the bucket and 401 fetching an object directly.

---

## Row Level Security

RLS is enabled on all four tables with one `FOR ALL TO authenticated` policy each, carrying both
`USING` and `WITH CHECK` — so a user can neither read nor write a row they do not own, and cannot
re-point an existing row at another user. `auth.uid()` is wrapped as `(SELECT auth.uid())` so it is
evaluated once per query rather than once per row.

`anon` has **no** privileges on any app table. InsForge grants broad DML to `anon` on `public` tables
by default; the migration revokes it, so an unauthenticated request is refused at the privilege layer
before RLS is even consulted. Verified over the live REST API: `42501 permission denied` on all four.

Policies do not replace grants — every table also has explicit
`GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated`.

---

## Authentication

- Provider: InsForge Auth
- Methods: Google OAuth, GitHub OAuth
- Protected routes: /dashboard, /profile, /find-jobs, /find-jobs/[id]
- Public routes: /, /login
- `proxy.ts` (Next 16's rename of middleware.ts) refreshes the session and does an optimistic
  cookie check on protected routes
- Every protected page additionally calls `requireUser()` from `lib/auth.ts` — proxy is an
  optimisation, not the authorization boundary
- On login → redirect to /dashboard

---

## InsForge Client Pattern

Two separate InsForge instances — never mix them:

```typescript
// lib/insforge-client.ts
// Browser-side — used in client components for auth state
import { createBrowserClient } from "@insforge/sdk/ssr";

export const insforge = createBrowserClient();

// lib/insforge-server.ts
// Server-side — used in API routes, Server Actions, agent code
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

type InsforgeServerClient = ReturnType<typeof createServerClient>;

export async function createInsforgeServer(): Promise<InsforgeServerClient> {
  return createServerClient({ cookies: await cookies() });
}
```

Both helpers read `NEXT_PUBLIC_INSFORGE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY` from the
environment themselves — never pass credentials explicitly. The browser client's auth surface is
read-only (`getCurrentUser`, `getProfile`, `getPublicAuthConfig`); every auth mutation runs on the
server through `createAuthActions()`.

---

## PostHog Pattern

There is no `lib/posthog-client.ts` and no PostHog provider component. Next 16's
`instrumentation-client.ts` runs after the document loads and before hydration, which is strictly
earlier than a provider in the tree, so it owns browser init. Client components import the
`posthog-js` singleton directly.

```
instrumentation-client.ts     posthog.init() — runs once, before React hydrates
components/analytics/         posthog.identify() — root layout, whenever a session exists
components/auth/SignOutButton posthog.capture() then posthog.reset()
lib/posthog-server.ts         captureServerEvent() — every server-side event
```

Identification lives in the **root layout**, not in a page. Pages come and go — the stubs that hold
`ComingSoon` are deleted by features 05, 09 and 14 — and identity that lives in a page disappears
with it. `getSessionUser()` is wrapped in React `cache()` so the layout and the page share one
InsForge round-trip per request.

Server events go through `captureServerEvent(userId, event, properties)`, which uses
`captureImmediate`, forces `userId` onto every event, bounds the retry budget, and reports delivery
failures through the client's `error` listener rather than dropping them silently.

**Server events are always called inside `after()` from `next/server`, never awaited inline.**
`captureImmediate` resolves only once the event has been sent, so awaiting it on the request path
puts PostHog's availability in front of the user's. Awaiting it inline in the OAuth callback was
measured at 49s of added sign-in latency against an unresponsive endpoint — and because it resolves
rather than rejecting, no `try/catch` would have caught it. `after()` runs the capture once the
response has already gone.

Error boundaries: `app/error.tsx` catches a thrown page and keeps the layout; `app/global-error.tsx`
catches the root layout itself and therefore replaces the document, so it declares its own
`<html>`, imports `globals.css`, and pulls the font from `lib/fonts.ts`. Both render
`components/layout/ErrorState.tsx` and both call `posthog.captureException`.

The root layout resolves the session through `getSessionUserForAnalytics()`, which catches. Identity
is not worth taking every route down for; authorization still runs through `requireUser()` in the
page, which does not catch. The catch calls `unstable_rethrow()` first so Next's control-flow
exceptions still reach Next.

---

## Browserbase Session Pattern

```typescript
// Company research session — single session, sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

---

## Job Discovery Pattern

**Adzuna API — job search**

```typescript
const response = await fetch(
  `https://api.adzuna.com/v1/api/jobs/us/search/1?` +
    `app_id=${process.env.ADZUNA_APP_ID}&` +
    `app_key=${process.env.ADZUNA_APP_KEY}&` +
    `what=${encodeURIComponent(jobTitle)}&` +
    `where=${encodeURIComponent(location)}&` +
    `category=it-jobs&` +
    `results_per_page=10&` +
    `content-type=application/json`,
);
const data = await response.json();
// data.results — array of job listings
// Each job: title, company.display_name, location.display_name,
//           salary_min, salary_max, description, redirect_url, created
```

---

## Company Research Pattern

```typescript
// Single session — visits company homepage and sub pages sequentially
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  apiKey: process.env.BROWSERBASE_API_KEY!,
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  browserbaseSessionID: session.id,
  modelName: "gpt-4o",
  modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
});

await stagehand.init();
const page = stagehand.page;

// Clean company name and construct homepage URL
const cleanName = companyName
  .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?).*$/i, "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "");

const homepageUrl = `https://www.${cleanName}.com`;

// Navigate and extract — graceful fallback if page not found
try {
  await page.goto(homepageUrl);
  await page.waitForLoadState("networkidle");
  const content = await stagehand.extract({ instruction: "..." });
} catch (error) {
  // Log and continue — GPT-4o will synthesize from what was found
  await logAgentError(jobId, error);
}

// Always close session when done
await stagehand.close();
```

---

## Invariants

Rules the AI agent must never violate:

- API routes contain no UI logic. Components contain no DB logic.
- Agent code in `/agent` never imports from `/components` or `/actions`.
- Server Actions never call agent functions. Agent functions are only called from API routes.
- All InsForge server-side writes use `createInsforgeServer()` — never the browser client.
- No hardcoded hex values or raw Tailwind color classes in components — use CSS variables from ui-tokens.md.
- Every Stagehand action is wrapped in try/catch. Failures are logged to agent_logs, never thrown to crash the run.
- Company research always returns a dossier — even if browser research fails, GPT-4o synthesizes from company name and job description alone. Never return empty.
- Browserbase sessions are always closed with stagehand.close() when done — never leave sessions open.
- Always scope InsForge queries to the current user_id — never query without a user filter.
- Adzuna API always includes category=it-jobs — never search without this filter.
- Every server-side PostHog event goes through `captureServerEvent` — never `new PostHog(...)` at a call site.
- Every `captureServerEvent` call is wrapped in `after()` — never awaited on the request path.
- PostHog event names only ever come from the table in code-standards.md — add the name there first.
- Any `catch` in a Server Component, Server Action or Route Handler calls `unstable_rethrow(error)` first.
- jobs.source is always 'search' or 'url' — never any other value.
