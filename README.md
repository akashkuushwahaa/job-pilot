# JobPilot

An AI-powered job hunting assistant. Set up your profile once, upload your resume, and the agent
discovers relevant jobs from Adzuna and scores each one against your actual skills with GPT-4o. For
roles you care about, it researches the company across its public web pages and builds a structured
dossier — overview, tech stack, culture, why the role exists, and interview prep — so you arrive at
every application already informed.

All 17 planned features are built. See [context/progress-tracker.md](context/progress-tracker.md)
for the full build record.

---

## What it does

- **Profile + resume** — a full resume-shaped profile form. Upload a PDF and GPT-4o can extract it
  into the form, or generate a clean professional PDF back out of your profile data.
- **Job discovery** — search by title, location, and one of Adzuna's 19 markets, filtered to IT
  jobs. Every result is scored 0–100 with a match reason, matched skills, and missing skills.
- **Job details** — full structured posting (responsibilities, requirements, nice-to-have,
  benefits), the match breakdown, and a one-click apply link.
- **Company research** — a single Browserbase session driven by Stagehand visits the company
  homepage and up to three sub-pages; GPT-4o synthesises the findings into a dossier.
- **Dashboard** — four stat cards, a recent activity feed, and three charts (jobs found over time,
  match score distribution, research activity), all read from your own rows.

Out of scope by design: auto-apply, cover letters, resume tailoring, scheduled runs, and
notifications. The full list is in [context/project-overview.md](context/project-overview.md).

---

## Stack

| Layer                    | Tool                                              |
| ------------------------ | ------------------------------------------------- |
| Framework                | Next.js 16 (App Router), React 19, TypeScript strict |
| Auth + DB + Storage      | InsForge (Postgres + PostgREST, Google/GitHub OAuth) |
| AI                       | OpenAI GPT-4o — matching, extraction, synthesis   |
| Job discovery            | Adzuna API                                        |
| Company research         | Browserbase (cloud browser) + Stagehand           |
| PDF                      | `@react-pdf/renderer` out, `pdf-parse` in         |
| Analytics                | PostHog (write-only — see below)                  |
| Styling                  | Tailwind CSS + shadcn/ui                          |

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure

Copy [.env.example](.env.example) to `.env.local` and fill it in. It documents every variable,
including which are safe to expose to the browser.

```bash
cp .env.example .env.local
```

Required — nothing works without the backend: `NEXT_PUBLIC_INSFORGE_URL`,
`NEXT_PUBLIC_INSFORGE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL`. The last must match the port the app
actually runs on, or the OAuth callback will not match.

The rest are read lazily, so a missing key costs the feature that needed it rather than the build:

- **`OPENAI_API_KEY`** — without it, job scoring, resume extraction, resume generation, and dossier
  synthesis each fail with a message rather than a crash.
- **`ADZUNA_APP_ID` / `ADZUNA_APP_KEY`** — without both, Find Jobs reports that search is
  unavailable.
- **`BROWSERBASE_API_KEY` / `BROWSERBASE_PROJECT_ID`** — without both, Research Company still
  returns a dossier; the run skips the browser and GPT-4o synthesises from the job posting and your
  profile alone.
- **`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` / `NEXT_PUBLIC_POSTHOG_HOST`** — analytics events only.

### 3. Apply the database schema

The four SQL files in [migrations/](migrations/) create `profiles`, `jobs`, `agent_runs`, and
`agent_logs` with their indexes and RLS policies. Apply them in filename order against your InsForge
project (via the InsForge CLI or the MCP `run-raw-sql` tool).

Resume uploads also need a **private** storage bucket named `resumes`, created through InsForge
rather than SQL. `profiles.resume_path` stores the object key, not a URL — signed links are
generated server-side at render time.

Every table is strictly per-user: nothing is granted to `anon`, and every RLS policy is scoped to
the owner.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Signed-out visitors land on the login page; signed-in users go
straight to the dashboard.

### Scripts

| Command         | Does                       |
| --------------- | -------------------------- |
| `npm run dev`   | Development server         |
| `npm run build` | Production build           |
| `npm start`     | Serve the production build |
| `npm run lint`  | ESLint                     |

---

## How the agents work

**Discovery** — `/api/agent/find` → `agent/adzuna.ts`: search Adzuna, score each result against the
profile with GPT-4o, upsert on Adzuna's stable id, close the run. Gated on a complete profile.

**Research** — `/api/agent/research` → `agent/research.ts`: follow the Adzuna redirect to the
employer's real posting, backfill the description from that page, derive the company homepage from
its domain, browse it with Stagehand, then synthesise the dossier.

Every phase before the synthesis is allowed to fail without ending the run — a dead redirect, a
JS-rendered posting, a parked domain, or Browserbase being unavailable each cost that phase and
nothing else. Only a missing or unsaveable dossier is a failure the user hears about.

---

## Project structure

```
app/          Pages and API routes only — no business logic
agent/        Discovery, research, matching, synthesis — nothing here touches React
actions/      Server Actions for UI-triggered mutations
components/   UI only — no data fetching, no direct DB calls
lib/          Third-party clients, shared utilities, session guards
migrations/   SQL schema history
context/      The project's own docs — read these before changing anything
```

Boundaries are enforced by convention and documented in
[context/architecture.md](context/architecture.md).

---

## A note on PostHog

PostHog is **write-only here**. The only credential this project has is the public write-only
project token — there is no read path. The dashboard's three charts are read from Postgres, which
also answers them more correctly: the `job_found` event carries no job id, so it cannot count
distinct jobs, and it fires again on a re-discovery that `found_at` deliberately ignores. The events
still fire and are still the product's event record; they are not a data source.

---

## Working on this project

Read [AGENTS.md](AGENTS.md) first. It names the docs in `context/` that have to be read before any
implementation, and the rules that never change — no hardcoded hex or raw Tailwind color classes,
and update `progress-tracker.md` and `ui-registry.md` after every feature.
