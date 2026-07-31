# Memory — Feature 03: PostHog Initialization + Event Tracking

Last updated: 2026-07-31

## What was built

Feature 03 of the build plan, on top of an earlier `npx @posthog/wizard` run that had already
installed `posthog-js`, written `instrumentation-client.ts` and `app/global-error.tsx`, and created
a PostHog dashboard. Neither of those two files was re-initialised — they were kept as-is.

**Created:**

- `lib/posthog-server.ts` — `captureServerEvent(userId, event, properties)` and the
  `ServerEventName` union. The only server-side capture entry point.
- `components/analytics/PostHogIdentity.tsx` — renders `null`; calls `posthog.identify()`.
- `components/auth/SignOutButton.tsx` — owns the `<form action={signOut}>`; captures
  `user_signed_out` then calls `posthog.reset()`.

**Modified:**

- `app/layout.tsx` — now `async`; resolves the session and mounts `PostHogIdentity` when signed in.
- `lib/auth.ts` — `getSessionUser` wrapped in React `cache()`.
- `components/layout/ComingSoon.tsx` — lost `"use client"`, the `posthog` import and the `name`
  prop; a Server Component again.
- `app/dashboard|profile|find-jobs/page.tsx` — dropped the now-unused `name` prop.
- `components/auth/OAuthButton.tsx` — takes an explicit `provider` prop; captures
  `oauth_sign_in_started`.
- `app/(auth)/login/page.tsx` — passes `provider` to `OAuthButton`.
- `app/api/auth/callback/route.ts` — captures `user_signed_in` after a successful code exchange.
- `package.json` — added `posthog-node` ^5.47.2.
- `context/`: `code-standards.md`, `architecture.md`, `library-docs.md`, `progress-tracker.md`,
  `ui-registry.md`.

**Events wired** — three, all auth lifecycle:

| Event | Where | Properties |
| --- | --- | --- |
| `oauth_sign_in_started` | client, OAuthButton | provider |
| `user_signed_in` | server, OAuth callback | userId |
| `user_signed_out` | client, SignOutButton | userId |

**Env:** `.env.local` holds `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` (a `phc_…` value) and
`NEXT_PUBLIC_POSTHOG_HOST` (`https://us.i.posthog.com`). Values are in the file — not repeated here.

## Decisions made

- **The four product events were deliberately NOT wired.** `job_search_started`, `job_found`,
  `profile_completed` and `company_researched` measure actions that do not exist yet — they belong
  to features 06, 10 and 13. Wiring them now would mean dead call sites. Wire each in the feature
  that creates its action.
- **Three auth events were registered in `code-standards.md` before being written.** That file
  forbids inventing event names without adding them to the table first. The table now has seven
  events and says so.
- **`instrumentation-client.ts` replaces `lib/posthog-client.ts` and the planned provider.** Next 16's
  client instrumentation hook runs after document load and *before* React hydrates, which is strictly
  earlier than a provider in the tree. A `lib/posthog-client.ts` would exist only to re-export the
  `posthog-js` singleton. `architecture.md` and `library-docs.md` were corrected; there is no
  `lib/posthog-client.ts` and there should not be one.
- **Identification lives in the root layout, never in a page.** The wizard had put
  `posthog.identify()` in `ComingSoon`, which features 05, 09 and 14 delete — identification would
  have silently vanished with it.
- **`posthog.reset()` stays on the sign-out action, not on the identity component.** Resetting
  whenever the layout sees no user would fire on every anonymous page load and mint a fresh anonymous
  ID each time, destroying anonymous funnels.
- **`SignOutButton` owns the form, not just the button**, so capture-then-reset travels with sign-out
  when it moves into the authenticated navbar at feature 14.
- **`user_signed_in` is captured server-side in the callback**, not client-side on the dashboard, so
  it fires once per sign-in rather than once per visit.
- **`user_signed_in` deliberately carries no `provider`.** The callback URL does not know it and
  threading it through would need a second OAuth cookie. `oauth_sign_in_started` carries it, the
  anonymous→identified merge puts both events on one person, and a funnel breaks down by step one's
  property. Do not add a provider cookie for this.
- **`OAuthButton` takes both `provider` and `label`.** They look redundant; they are not. `label` is
  display copy, `provider` is the analytics dimension. Deriving one from the other silently re-keys
  the funnel the first time the copy is reworded.
- **Env variable is `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, not `NEXT_PUBLIC_POSTHOG_KEY`.** Docs were
  changed to follow the working configuration and PostHog's own Next.js guide.

## Problems solved

- **`await posthog.shutdown()` is wrong in posthog-node 5.** `library-docs.md` carried it as a hard
  rule ("events are lost without it"). In v5 `shutdown()` returns `void`, so awaiting it waits for
  nothing — following the rule would have lost exactly the events it was meant to protect.
  `captureServerEvent` uses `captureImmediate()`, which resolves only once the event has been sent.
  Verified against a local listener: one gzipped POST to `/batch/` carrying
  `user_signed_in` / `distinct_id` / `userId`.
- **Root layout + page would have doubled the InsForge round-trips.** The layout resolves the session
  to identify, the page still resolves it to authorize. `getSessionUser` is wrapped in React
  `cache()` so both share one call per request.
- **`posthog.reset()` does not clear the request queue.** Checked the posthog-js source directly —
  `reset()` clears persistence, session, flags, surveys, logs and metrics but not pending requests.
  So capture-then-reset in `SignOutButton` is safe and `user_signed_out` is not dropped.
- **posthog-js does not throw when uninitialised.** Tested `identify` / `capture` / `reset` before
  `init` — all return without throwing, they only log. So a missing token in production degrades to
  no-op rather than crashing the sign-out button or the identity effect.

## Current state

- `npx tsc --noEmit`, `npm run lint` and `npm run build` all clean. Route table unchanged — every
  route still `ƒ` (dynamic).
- Route protection re-probed against the running dev server: `/dashboard`, `/profile`, `/find-jobs`
  all 307 to `/login`; `/` and `/login` 200.
- PostHog project token + host verified reachable — the flags endpoint returns HTTP 200.
- The browser bundle genuinely contains `posthog.init` with the real token, host and
  `capture_exceptions` (confirmed by fetching the `instrumentation-client_ts_*.js` chunk).
- **No event has ever been observed arriving in PostHog.** Credentials and payload shape are proven;
  the end-to-end path is not.
- A dev server (PID 12284) is running on port 3000 — not started by this session. It must stay on
  port 3000 or the OAuth callback will not match `NEXT_PUBLIC_APP_URL`.
- Branch `main`. **Nothing has been committed** — features 02 and 03 are both uncommitted.
- `/review` was run and found 8 issues (1 critical, 3 important, 4 minor). **None were fixed** — the
  review skill reports only. See Open questions.

## Next session starts with

1. **Fix the critical issue from /review:** `await captureServerEvent(...)` in
   `app/api/auth/callback/route.ts` blocks the OAuth redirect. Measured at **49 seconds** against a
   hung endpoint — 4 attempts (`fetchRetryCount: 3`, `requestTimeout: 10000`, `fetchRetryDelay:
   3000`), and it *resolves* rather than rejecting, so the `try/catch` never fires. Likely fix:
   Next 16's `after()` from `next/server`, so the capture runs after the response is sent. The
   in-code comment there claiming analytics never blocks sign-in is wrong and must be corrected too.
2. Drive a real browser sign-in (Google, then GitHub) and a sign-out, then check PostHog's Activity
   view for `oauth_sign_in_started`, `user_signed_in` and `user_signed_out`. This closes the
   verification gap for features 02 and 03 at the same time.
3. If that passes, commit features 02 and 03 and move to **feature 04 — Database Schema**.

## Open questions

**From this session's /review — none fixed:**

- **Critical — 49s sign-in stall.** See "Next session starts with" item 1.
- **Important — `app/global-error.tsx` is unstyled.** Raw `<h2>` and `<button>`, no design tokens, no
  `Button` primitive, and it renders its own `<html><body>` *without importing `globals.css`* — so it
  shows browser-default HTML if it ever fires. Also single quotes / no semicolons against project
  style. Kept from the wizard; needs tokenising or deleting.
- **Important — `.env.example` is invisible and incomplete.** `.gitignore:34` matches `.env*`, so the
  file is untracked and will never reach a teammate or CI. It also documents only the 2 PostHog
  variables, not the 3 InsForge/app ones the app needs. The wizard's `posthog-setup-report.md` tells
  you to configure deployments "from `.env.example`", which nobody else can see.
- **Important — the root layout is now a single point of failure.** `getSessionUser()` deliberately
  does not catch, and it now runs in `app/layout.tsx`, so an InsForge config or transport throw takes
  down *every* route and lands on the unstyled boundary above. There is no `app/error.tsx`,
  `not-found.tsx` or `loading.tsx` anywhere in `app/`.
- **Minor** — client event delivery on navigation is best-effort; `send_instantly` mitigates but does
  not eliminate a cancelled in-flight request. `cache()` dedupe is relied on but not measured.
- **Minor** — the wizard's `posthog-setup-report.md` at the repo root is now partly stale (it
  describes the old identify placement and the `NEXT_PUBLIC_POSTHOG_KEY` naming). Untracked; left
  alone rather than deleted.

**Carried forward from feature 02, still unresolved:**

- **A real browser sign-in has still never been driven.** The code exchange, cookie write, post-login
  redirect, signed-in homepage CTA and sign-out have never actually run in a browser. This remains
  the single biggest gap in the project and now blocks verification of feature 03 as well.
- **Rotate the InsForge admin API key** if it was ever committed, pushed or deployed. The `ik_…`
  full-access key had been pasted into `NEXT_PUBLIC_INSFORGE_ANON_KEY` and served to browsers before
  being replaced with the correct `anon_…` key.

**Also still open from feature 02:** the homepage CTA label change ("Go to dashboard") is beyond
build-plan scope and kept deliberately; the sign-out button uses `md` while login providers use `lg`,
judged intentional but never confirmed; the Auth shell is duplicated verbatim in the login page and
`ComingSoon` and should be extracted when a third page needs it.

**Note on `npm audit`:** 12 high-severity advisories (brace-expansion, postcss, sharp) — all
pre-existing transitive dependencies of Next/Tailwind/ESLint, none introduced by `posthog-node`.
