# Memory — Feature 04: Database Schema (and Feature 03 hardening)

Last updated: 2026-07-31

Phase 1 — Foundation is **complete**. Features 01–04 all done. Next is Phase 2.

## What was built

### Feature 04 — Database Schema (applied to the live backend)

- `migrations/20260731164849_create-jobpilot-schema.sql` — the whole schema in one migration:
  `profiles`, `agent_runs`, `jobs`, `agent_logs`; 12 indexes; `REVOKE ALL … FROM anon` plus explicit
  `GRANT`s to `authenticated`; RLS enabled with one `FOR ALL TO authenticated` policy per table.
- Private `resumes` storage bucket, created with `insforge storage create-bucket resumes --private`.
- The repo is now **linked** to InsForge project "Akash Kushwaha" (appkey `e6s7asc9`). `.insforge/`
  is gitignored — `project.json` holds a full-access admin key.
- Four decisions stored in InsForge project memory (`npx @insforge/cli memory list`).

### Feature 03 fixes — all 8 `/review` findings resolved

- `app/error.tsx` (new) — route-level boundary.
- `components/layout/ErrorState.tsx` (new) — shared card for both error boundaries.
- `lib/fonts.ts` (new) — one `next/font` instance shared with `global-error.tsx`.
- `app/global-error.tsx` — rewritten: imports `globals.css`, uses the font variable and tokens.
- `lib/posthog-server.ts` — bounded retries, `on("error")` listener.
- `app/api/auth/callback/route.ts` — capture moved inside `after()` from `next/server`.
- `lib/auth.ts` — added `getSessionUserForAnalytics()`; `getSessionUser` wrapped in React `cache()`.
- `components/auth/OAuthButton.tsx`, `SignOutButton.tsx` — `transport: "sendBeacon"`.
- `.gitignore` — `!.env.example`, `.insforge/`; `.env.example` filled with all 5 current vars.

## Decisions made

### Feature 04

- **`resumes` bucket is PRIVATE.** `profiles.resume_pdf_url` is now **`resume_path`** and stores the
  object key, not a URL. `getPublicUrl()` does not work; use `createSignedUrl(path, 3600)`
  server-side at render. Never store the signed result in the DB.
- **No trigger on `auth.users`.** The `profiles` row is created by an app-side upsert on first save,
  so **every read of `profiles` must handle a missing row**. A trigger runs inside the sign-up
  transaction — a bug in it would break OAuth for every new user.
- **`jobs.external_id` is the dedupe key** — Adzuna's stable id, not `redirect_url` (a tracking URL
  may carry a per-request token, and the constraint would then silently never fire). Unique partial
  index on `(user_id, source, external_id) WHERE external_id IS NOT NULL`.
  **Feature 10's upsert must never include `company_research` in its update list** or a re-search
  wipes a dossier the user already paid a Browserbase session for.
- **Completeness is derived, never stored.** `is_complete` was dropped; one `completeness(profile)`
  helper in `lib/` is the single source of truth. No backfill migration when the rules change.
- **`cover_letter_tone` and all tailored-resume columns dropped** — both out of scope.
- **`anon` gets nothing.** InsForge grants broad DML to `anon` on `public` tables by default; the
  migration revokes it, so unauthenticated requests fail at the privilege layer before RLS runs.

### Feature 03

- Server captures always go inside `after()` from `next/server`, never awaited on the request path.
- Identity lives in the root layout via `getSessionUserForAnalytics()` (catches); `requireUser()` in
  the page still fails loudly. Blast radius is one route, not the whole app.
- **Every catch in a Server Component / Server Action / Route Handler calls `unstable_rethrow(error)`
  first.** Now an invariant in `architecture.md`.

## Problems solved

- **Analytics was on the auth critical path.** `await captureServerEvent(...)` in the OAuth callback
  blocked the redirect for a measured **49 seconds** against a hung endpoint (4 attempts at library
  defaults), and `captureImmediate` *resolves* rather than rejecting so no `try/catch` would have
  caught it. Fixed with `after()` + `fetchRetryCount: 1` / `fetchRetryDelay: 1000` /
  `requestTimeout: 3000`. Re-measured: 7s, off the response path.
- **`captureImmediate` fails silently** — resolves on delivery failure. Only `posthog.on("error", …)`
  surfaces a dropped server event.
- **`await posthog.shutdown()` is a no-op in posthog-node 5** — it returns `void`. Use
  `captureImmediate`.
- **Catching in the root layout reintroduced the feature-02 `DYNAMIC_SERVER_USAGE` trap**, filling
  the build log with swallowed stack traces. `unstable_rethrow` first in the catch.
- **`insforge link` edits tracked files.** It appended an `<!-- INSFORGE:START -->` block to
  `AGENTS.md` (accurate, kept) and added a blanket `.claude` rule to `.gitignore`. **That rule was
  removed** — this repo versions its skills under `.claude/skills/`; the 65 tracked files were safe
  only because gitignore never applies to tracked paths, but any *new* skill would have been
  invisible.
- **`.env.example` was gitignored by `.env*`** and would never have reached a clone or CI, while the
  PostHog setup report told you to configure deployments from it. Fixed with `!.env.example`.
- **RLS cannot be tested with admin tooling.** Both MCP `run-raw-sql` and CLI `db query` run as
  `project_admin` and **refuse `SET ROLE`**. Test over the real REST API instead:
  `GET {url}/api/database/records/{table}` with the anon key.

## Current state

- `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Every route dynamic (`ƒ`).
- **Backend verified live:** RLS on with `USING` + `WITH CHECK` on all four tables; `anon` gets
  `42501 permission denied` on all four over the real REST API; private bucket returns 403 on list
  and 401 on direct object fetch; duplicate `external_id` rejected; an upsert refreshed `match_score`
  50 → 91 while preserving `company_research`; two NULL-`external_id` rows coexist.
  **All test rows deleted — all four tables are empty.**
- **PostHog client events confirmed arriving** (read from PostHog's browser debug output in
  `.next/dev/logs/next-development.log`): two full cycles, both Google —
  `oauth_sign_in_started {provider:'google'}` → `$identify` (whose `$anon_distinct_id` matches the
  anonymous id exactly, proving the merge) → `user_signed_out`. Error autocapture also confirmed
  working on a real `ReferenceError`.
- A dev server runs on port 3000, started outside these sessions. Must stay on 3000 or the OAuth
  callback will not match `NEXT_PUBLIC_APP_URL`.
- Branch `main`. **Nothing has been committed** — features 02, 03 and 04 are all uncommitted.

## Next session starts with

1. **Feature 05 — Profile Page (Full UI).** Build with mock data, no save logic. This is where
   `completeness(profile)` (returning `{ percent, missing, isComplete }`) and the signed-URL
   rendering of `resume_path` first land. Remember the profile row may not exist yet.
2. Feature 05 needs real shadcn primitives (select, checkbox, dialog). Per the feature-01 note: run
   the shadcn CLI **then**, and map its token names onto ours rather than accepting its palette —
   it will otherwise overwrite `globals.css`.
3. The Auth shell primitive now has **four** users (login, `ComingSoon`, `error.tsx`,
   `global-error.tsx`), past the extraction threshold `ui-registry.md` set. Extract it in the next
   session that touches any of them.

## Open questions

**Carried forward, still unresolved:**

- **Rotate the InsForge admin API key** if it was ever committed, pushed or deployed. The `ik_…`
  full-access key had been pasted into `NEXT_PUBLIC_INSFORGE_ANON_KEY` and served to browsers before
  being replaced with the correct `anon_…` key.
- **Cross-user RLS isolation is unproven** — that user A cannot read user B's rows, the one property
  RLS exists for. Needs a real user JWT; admin tooling refuses `SET ROLE` and `auth.users` currently
  holds one user. Test it the moment a second signed-in session exists.

**New this session:**

- **Session replay is recording and nobody decided that.** 89 `$snapshot` events,
  `$recording_status: active`. The `defaults: "2026-01-30"` snapshot in `instrumentation-client.ts`
  turns it on. Nothing in the context files or the PostHog setup report mentions it. This app is
  about to store resumes, phone numbers, salary expectations and work history — worth an explicit
  yes or no.
- **`user_signed_in` (server-side) has never been confirmed arriving.** It goes via `posthog-node` so
  it never appears in the browser log. Needs PostHog's Activity view, or a personal API key for a
  direct query (the `phc_` token is write-only).
- **GitHub OAuth has never been exercised** — both sign-in cycles were Google.
- **This session's feature-03 fixes have not run in a browser.** `after()`, the bounded retry and
  the sendBeacon transport all postdate the sign-ins.
- **Neither error boundary has rendered.** Only autocapture has fired; `error.tsx` and
  `global-error.tsx` are untested. Throw something on purpose once.

**Also still open from feature 02:** the homepage CTA label change ("Go to dashboard") is beyond
build-plan scope and kept deliberately; sign-out uses `md` while login providers use `lg`, judged
intentional but never confirmed.

**Note on `npm audit`:** 12 high-severity advisories (brace-expansion, postcss, sharp) — all
pre-existing transitive dependencies of Next/Tailwind/ESLint, none introduced by this work.
