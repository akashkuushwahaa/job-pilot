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
│       │   ├── route.ts                   → POST upload the resume PDF; GET a short-lived signed link
│       │   ├── generate/route.ts          → Generate base resume PDF from profile
│       │   └── extract/route.ts           → Extract profile data from uploaded resume PDF
├── agent/
│   ├── adzuna.ts                          → Discovery run: search, score, upsert, close the run
│   ├── research.ts                        → Research run: resolve, backfill, browse, synthesise, save
│   ├── posting.ts                         → Follows the Adzuna redirect; homepage URL + description backfill
│   ├── browsing.ts                        → The Stagehand phase — homepage + up to 3 sub-pages
│   ├── synthesis.ts                       → GPT-4o dossier from research + job + profile
│   ├── matcher.ts                         → GPT-4o scoring of one job against one profile
│   ├── logs.ts                            → The only writer of agent_logs; never throws
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
│   │   ├── Navbar.tsx                       → Homepage chrome — nav + CTA
│   │   ├── AppNavbar.tsx                    → Authenticated chrome — nav with active item
│   │   ├── Footer.tsx
│   │   └── ErrorState.tsx                  → Shared card for both error boundaries
│   ├── homepage/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Features.tsx
│   ├── dashboard/
│   │   ├── StatsBar.tsx                     → The four-card row
│   │   ├── StatCard.tsx                     → One stat card
│   │   ├── RecentActivity.tsx
│   │   ├── ChartCard.tsx                    → Card, title, dashed grid, both axes
│   │   └── BarChart.tsx / LineChart.tsx     → The marks only; no chart library
│   ├── profile/
│   │   ├── ProfileWorkspace.tsx             → Owns form state; the node both cards write to
│   │   ├── ProfileForm.tsx                  → All five form sections; controlled by the workspace
│   │   ├── TagInput.tsx                     → Skills and industries chip input
│   │   ├── WorkExperienceCard.tsx           → One role's fields
│   │   ├── ResumeUpload.tsx                 → The whole Resume card — upload, preview, extract
│   │   ├── ResumePreview.tsx                → The stored-resume row: filename, View, Replace
│   │   └── CompletionIndicator.tsx          → Attention banner + completion ring
│   ├── find-jobs/
│   │   ├── SearchControls.tsx
│   │   ├── JobsTable.tsx
│   │   ├── JobFilters.tsx
│   │   └── JobsPagination.tsx
│   └── job-details/
│       ├── JobInfo.tsx
│       ├── MatchScore.tsx
│       ├── JobDescription.tsx
│       ├── CompanyResearch.tsx              → The dossier card; server-rendered, nine sections
│       ├── ResearchButton.tsx               → "use client" — the only client boundary on this page
│       └── JobActions.tsx
├── proxy.ts                                → Session refresh + optimistic route protection
├── lib/
│   ├── insforge-client.ts                 → InsForge browser client instance
│   ├── insforge-server.ts                 → InsForge server client
│   ├── auth.ts                            → getSessionUser / requireUser, OAuth constants
│   ├── browserbase.ts                     → Browserbase session creation; null rather than throw
│   ├── stagehand.ts                       → Stagehand init + close, against an existing session
│   ├── dossier.ts                         → The jsonb dossier schema — parsed on write AND on read
│   ├── safe-fetch.ts                      → Server-side fetch of URLs the app did not author
│   ├── adzuna.ts                          → Adzuna API client
│   ├── posthog-server.ts                  → captureServerEvent — server-side PostHog capture
│   ├── openai.ts                          → OpenAI client instance + the pinned model string
│   ├── resume-extraction.ts               → PDF text + GPT-4o prompt, schema, and form mapping
│   ├── resume-generation.ts               → GPT-4o prompt, schema, and bullet alignment
│   ├── resume-pdf.tsx                     → The react-pdf Document + renderResumePdf()
│   ├── fonts.ts                           → next/font instance, shared with global-error.tsx
│   ├── completeness.ts                    → completeness(profile) — the only definition of "complete"
│   ├── profile.ts                         → fetchProfile, parseProfile + both directions of the row <-> form mapping
│   ├── jobs.ts                            → parseJobList, the discovery banner sentence, the filtered/sorted/paged list read, and the single-job read
│   ├── charts.ts                          → Axis ceilings, bar heights, the smoothed line path
│   ├── dashboard.ts                       → fetchDashboardStats + the mock series features 16-17 replace
│   └── utils.ts                           → Shared utility functions and constants
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
fetch(source_url, { redirect: "follow" }) → the employer's real job page
        ↓
        ├── that page's HTML → GPT-4o → about_role + the four bullet columns
        │   (the description backfill — best effort, never fails the run)
        └── that page's domain → the company homepage URL
        ↓
Single Browserbase session opens with Stagehand
        ↓
Navigates to company homepage + up to 3 sub pages
        ↓
GPT-4o synthesizes dossier from research + job + profile
        ↓
Dossier saved to jobs.company_research
        ↓
Page data revalidated by router.refresh()
```

**Every phase before the synthesis is allowed to fail, and none of them ends the run.** No
`source_url`, a redirect that times out, a JS-rendered posting with no readable body, a parked
domain, Browserbase unavailable — each costs that phase and nothing else. The deliverable is a
dossier, and GPT-4o can write one from the job and the profile alone. Only a missing dossier, or one
that cannot be saved, is a failure the user hears about.

**The backfill and the dossier share one fetch on purpose.** Feature 13 has to follow the redirect
anyway to find out who the employer is; the posting body is on the page it lands on. Building a
separate scraper for the description would duplicate that hop. Two rules carry over from feature 10
and are not negotiable: write no field the page did not state, and never touch `found_at` or
`company_research` from the discovery path.

### Resume Operations (API Routes)

Three routes, and only two of them write. The object key is never accepted from the
client in any of them — it is always derived from the session. A private InsForge
bucket means "requires authentication", not "requires ownership", so these routes are
the only thing separating one user's resume from another's.

**Upload — `POST /api/resume`**

```
User selects a PDF
        ↓
Uploaded to resumes/{user_id}/resume.pdf
        ↓
Key saved to profiles.resume_path (and nothing else on the row)
```

**Extract — `POST /api/resume/extract`** (no request body)

```
User clicks Extract from Resume
        ↓
resume_path read from the caller's own row
        ↓
PDF downloaded from InsForge Storage
        ↓
pdf-parse extracts raw text — too little text ends it here
        ↓
GPT-4o returns structured JSON, validated by zod
        ↓
Form-shaped values returned to the browser
        ↓
ProfileWorkspace merges them into form state
        ↓
Nothing is persisted. The user reviews and presses Save Profile.
```

**Generate — `POST /api/resume/generate`** (no request body)

```
User clicks Generate, then confirms the replacement
        ↓
Profile row read from the caller's own profiles row
        ↓
completeness(profile).isComplete — anything less ends it here
        ↓
GPT-4o writes the summary and the bullets, validated by zod
        ↓
@react-pdf/renderer renders a PDF buffer from those plus the row's own facts
        ↓
Uploaded to InsForge Storage, overwriting in place
        ↓
Key saved to profiles.resume_path
```

Three properties of this route are load-bearing:

- **It reads the saved row, never the form.** The profile form is routinely ahead of the database —
  resume extraction exists precisely to put unsaved values on screen — so the Generate button is
  disabled while the two differ. `ProfileWorkspace` owns that comparison.
- **Every fact is rendered from the row; the model only writes prose.** Names, companies, titles,
  dates, degree, institution and skills never pass through GPT-4o. A model that can restate an
  employer's name can invent one, and a resume is a claim the candidate defends in an interview.
- **Nothing is written until the PDF exists.** A model failure or a render failure returns without
  touching storage, so a failed generation always leaves the stored resume intact. This is what
  makes the overwrite survivable: there is one key, one resume, and no undo.

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
| education           | jsonb       | One object: degree, field, institution, year. Nullable, no default |
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
  by `completeness(profile)` in `lib/completeness.ts`, so redefining "complete" never needs a
  backfill migration. A stored copy would be a second source of truth that silently goes stale.
  It reads ten fields — full name, email, phone, location, current title, experience level, years of
  experience, at least one skill, at least one work-experience role with a company and title, and an
  education entry with a degree, field and institution. Everything else on the row improves matching
  without gating it. It takes `Profile | null` and returns `{ percent, missing, isComplete }`.
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
| about_role         | text        | Adzuna's snippet, verbatim — see below          |
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

**`about_role` is a fragment, not a summary.** This row said "2-3 sentence summary", which is what a
reader would build against and is not what the column holds. Adzuna's search endpoint returns a
**500-character snippet that stops mid-word and ends in a single `…`** — verified across all ten live
results in feature 10 and all 20 stored rows, every one exactly 500 characters, every one ending in
that character. Feature 10 stores it verbatim rather than restructuring it, because structuring a
fragment means inventing the part that was removed.

Two consequences, both load-bearing:

- **Anything rendering it must say so.** `isTruncatedDescription()` in `lib/jobs.ts` keys on the
  ellipsis, not the length, and the details page pairs it with a link to `source_url`. An
  unexplained mid-word stop under a "Job Description" heading reads as a broken renderer — it was
  reported as one.
- **The real body has to be fetched from the posting.** Feature 13 already follows the Adzuna
  redirect to reach the employer's site, so it is the feature that closes this — see `build-plan.md`.

**Re-running a search must not duplicate rows.** The unique index
`(user_id, source, external_id)` is the dedupe key; feature 10 upserts onto it.

**The index is not partial, and must not be made partial again.** Feature 04 created it with
`WHERE external_id IS NOT NULL`, reasoning that url-sourced jobs would otherwise collapse onto one
NULL row per user. That reasoning was wrong — PostgreSQL unique indexes are `NULLS DISTINCT` by
default, so NULL `external_id` rows never collide with each other either way. The predicate bought
nothing and cost the feature: PostgreSQL infers a partial index for `ON CONFLICT` only when the
statement repeats the predicate, and PostgREST's `on_conflict` parameter emits no `WHERE`, so every
upsert failed with *"there is no unique or exclusion constraint matching the ON CONFLICT
specification"*. Migration `20260802124740_jobs-dedupe-index-non-partial.sql` drops it.

**The upsert must never include `company_research` or `found_at` in its payload.** PostgREST builds
its `ON CONFLICT DO UPDATE SET` list from the payload's own keys, so omitting a column is the only
way to say "write this once and never touch it again". Re-discovery refreshes title, salary,
`match_score`, `match_reason` and the skill arrays; a dossier the user spent a Browserbase session on
survives, and `found_at` keeps meaning *first discovered*, which is what the Date Found column
claims. `run_id` **is** sent, so it moves to whichever run most recently surfaced the job.

Verified against the live database in feature 10: the predicate-free statement upserts, `match_score`
refreshed 50 → 91, `company_research` and `found_at` were untouched, and two NULL-`external_id` rows
coexisted under the non-partial index.

**Every ordering of `jobs` ends with `id`.** `found_at` defaults to `now()`, which is *transaction*
time, so every row written by one discovery run carries the same millisecond — and `match_score` ties
are common at ten results a run. A sort on either column alone is not a total order, and Postgres is
free to break the ties differently per request, which on a paged read shows one row on two pages and
another on none. `fetchJobPage` in `lib/jobs.ts` appends `id` to every sort; it is not decoration.

**A single-job read shape-checks the id before it queries.** `jobs.id` is a uuid, and PostgREST
answers a malformed one with `22P02 invalid input syntax for type uuid` — a *read failure*, which
`/find-jobs/[id]` would render on the error boundary. A hand-typed URL is a missing job, not a broken
database, so `fetchJob` returns null for anything that is not uuid-shaped and the page turns that
into `notFound()`. A genuine read failure or an unreadable row still throws.

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
the object key, and a link is produced server-side with `createSignedUrl(path, expiresIn)`. A resume
is PII, and on a public bucket its URL is a permanent bearer token that leaks through logs,
`Referer` headers and PostHog session replay.

Verified: an anonymous caller gets 403 listing the bucket and 401 fetching an object directly.

**"Private" means authenticated, not owned.** `storage.buckets` carries only `name`, `public`,
`cors_rules` and `versioning_status`, and there are no RLS policies on `storage.objects` in any
schema — InsForge has no per-path storage permissions. Nothing in the platform stops one signed-in
user from naming another user's key. Two rules follow, and `app/api/resume/route.ts` is the only
thing enforcing them:

- **The object key is always derived from the session** — `${user.id}/resume.pdf` built from
  `requireUser()`. A key is never read out of a request body, query string or form field.
- **The browser never receives a key or a signed URL it asked for.** `GET /api/resume` resolves the
  key from the caller's *own* profile row, signs it for 60 seconds server-side, and redirects. The
  signed result is never stored in the database and never rendered into the page.

Cross-user isolation at the bucket itself is unproven — it needs a second account. The design above
does not depend on the answer.

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
- **Every protected page renders `AppNavbar`.** There is no shared authenticated layout, so this is
  a per-page responsibility and it is load-bearing: it is the only navigation between the protected
  routes. `/dashboard` shipped without it once and left signed-in users unable to reach `/profile`
  at all. `AppNavbar` also carries the app's only sign-out.

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

Identification lives in the **root layout**, not in a page. Pages come and go, and identity that
lives in a page disappears with it — the three `ComingSoon` stubs that once held it were deleted by
features 05, 09 and 14, taking the component with them. `getSessionUser()` is wrapped in React
`cache()` so the layout and the page share one InsForge round-trip per request.

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

> **Corrected against the installed Stagehand 3.7.1 in feature 13.** The block that used to be
> here described Stagehand 1.x — `modelName` at the top level, `modelClientOptions`, and
> `stagehand.page`. None of the three exist. `library-docs.md` carries the full correction; the
> shape below is what the types actually declare, and `lib/stagehand.ts` is the only place the
> client is constructed.

```typescript
// Single session — visits company homepage and sub pages sequentially
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  apiKey: process.env.BROWSERBASE_API_KEY!,
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  browserbaseSessionID: session.id,
  model: { modelName: OPENAI_MODEL, apiKey: process.env.OPENAI_API_KEY! },
  disablePino: true,
  verbose: 0,
});

await stagehand.init();

// Not stagehand.page. Returns Page | undefined — the undefined branch is real.
const page = stagehand.context.activePage();

// Navigate and extract — graceful fallback if the page is not found.
// domcontentloaded, not networkidle: a marketing homepage with a chat widget
// or a beacon on a timer may never go idle, and the copy is in the document
// long before that.
try {
  await page.goto(homepageUrl, {
    waitUntil: "domcontentloaded",
    timeoutMs: 20_000,
  });

  const content = await stagehand.extract(instruction, schema, {
    timeout: 45_000,
  });
} catch (error) {
  // Log and continue — GPT-4o synthesises from whatever was gathered
  await logAgentError(insforge, { runId: null, userId, jobId, message });
}

// Always close the session, always in a finally. An unclosed session holds the
// free plan's single slot for its full 120 seconds, and the next research click
// finds the browser unavailable for a reason nothing in the logs explains.
await stagehand.close();
```

**The homepage URL is derived from the redirect, not from the company name.** The name-based guess
(`https://www.{cleanName}.com`) is the *fallback*, not the primary path — feature 13 follows the
Adzuna redirect with `fetch(redirect_url, { redirect: "follow" })` and takes the root domain of
wherever it lands. It also refuses that domain when it belongs to an ATS or an aggregator
(`boards.greenhouse.io`, `*.myworkdayjobs.com`, `adzuna.com`, `linkedin.com`, and the rest of
`NOT_THE_EMPLOYER` in `agent/posting.ts`): stripping one of those to its root domain would send the
browser off to research Greenhouse and report its culture as the employer's.

---

## Invariants

Rules the AI agent must never violate:

- API routes contain no UI logic. Components contain no DB logic.
- Every `profiles` row read goes through `parseProfile()` — never annotate an SDK result as a typed
  row, because `any` is assignable to anything and the annotation checks nothing. A page reads the
  caller's own row through `fetchProfile()` rather than writing the query out again: `/profile` and
  `/dashboard` both render something consequential off the answer, and both need the same
  throw-rather-than-degrade branch.
- **Every value that reaches a chart is checked for finiteness first.** `lib/charts.ts` coerces
  `NaN` and `Infinity` to zero and logs, because a single non-finite value otherwise renders the
  string "NaN" across an axis, sets a bar's height to the invalid CSS `"NaN%"`, and makes the line's
  `d` attribute unparseable so the curve disappears — all without throwing. Feature 17 feeds these
  functions from PostHog, which is external input. Found by `/review` on feature 14.
- Every GPT-4o response is validated with zod before use, for the same reason. A model response is
  untrusted input, not a typed object.
- The resume object key is always `{user.id}/resume.pdf` derived from the session. No route accepts
  a key, a path, or a user id from the caller — storage has no ownership model to fall back on.
- Resume extraction never writes to `profiles`. It proposes values; the user saves them.
- Resume generation reads the saved row, never client-supplied values, and never writes to storage
  unless a PDF was actually produced.
- GPT-4o writes prose only. Any fact that appears in a generated document is rendered from the row.
- Agent code in `/agent` never imports from `/components` or `/actions`.
- Server Actions never call agent functions. Agent functions are only called from API routes.
- Agent functions take the InsForge client as a parameter — they never call `createInsforgeServer()`
  themselves. One run makes several writes and they all belong to the same request.
- Job discovery writes no job facts it did not receive. Adzuna's snippet goes into `about_role`
  verbatim; `responsibilities`, `requirements`, `nice_to_have`, `benefits` and `about_company` stay
  empty rather than being reconstructed from a description that truncates mid-sentence.
- **A URL out of the database is never fetched server-side with `fetch()` directly.** It goes
  through `safeFetchExternal()` in `lib/safe-fetch.ts`, which resolves the hostname and refuses
  loopback, link-local, RFC 1918, CGNAT and IPv4-mapped-IPv6 addresses, re-checking **every redirect
  hop**. `safeExternalUrl()` answers "is this safe to link"; it checks the scheme and nothing else.
  `jobs.source_url` is writable by any authenticated user under the `jobs_owner` policy, so a
  crafted row would otherwise point the research agent at the cloud metadata endpoint and render the
  response back through GPT-4o. Found by `/review` on feature 13.
- **The research agent never replaces good data with worse.** The description backfill only writes a
  column that is currently empty or still holds Adzuna's truncated snippet, and a dossier that
  reached the company's website is never overwritten by one synthesised without it. A re-run can
  only add.
- `matched_skills` is always filtered back down to skills the profile actually lists. It is rendered
  as the candidate's own claim, so the model's answer is checked against the row rather than trusted.
- All InsForge server-side writes use `createInsforgeServer()` — never the browser client.
- No hardcoded hex values or raw Tailwind color classes in components — use CSS variables from ui-tokens.md.
- Every Stagehand action is wrapped in try/catch. Failures are logged to agent_logs, never thrown to crash the run.
- Company research always returns a dossier — even if browser research fails, GPT-4o synthesizes from company name and job description alone. Never return empty.
- Browserbase sessions are always closed with stagehand.close() when done — never leave sessions open.
- Always scope InsForge queries to the current user_id — never query without a user filter.
- Any third party URL rendered into an `href` passes `safeExternalUrl()` first — `lib/adzuna.ts`
  validates `redirect_url` only for non-emptiness, so `jobs.source_url` and `jobs.external_apply_url`
  are untrusted strings until their scheme is checked. Gated once in `JobDetailSchema` rather than at
  each call site.
- Any user-supplied value interpolated into a PostgREST `or()` string is double-quoted first.
  PostgREST parses that argument itself, so an unquoted comma, dot or parenthesis is read as syntax
  and fails the whole request — this user's own data contains a company called
  "SimVentions, Inc - Glassdoor ✪ 4.6".
- Adzuna API always includes category=it-jobs — never search without this filter.
- Every server-side PostHog event goes through `captureServerEvent` — never `new PostHog(...)` at a call site.
- Every `captureServerEvent` call is wrapped in `after()` — never awaited on the request path.
- PostHog event names only ever come from the table in code-standards.md — add the name there first.
- Any `catch` in a Server Component, Server Action or Route Handler calls `unstable_rethrow(error)` first.
- jobs.source is always 'search' or 'url' — never any other value.
