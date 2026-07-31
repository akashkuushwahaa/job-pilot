# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 1 — Foundation ✅ complete
**Last completed:** 04 Database Schema — four tables, 12 indexes, grants and RLS applied to the live
backend via `migrations/20260731164849_create-jobpilot-schema.sql`, plus the private `resumes`
bucket. Anonymous access and the dedupe/upsert behaviour are both verified against the real backend;
authenticated cross-user isolation is not — see Notes.
**Next:** Phase 2 — 05 Profile Page (Full UI).

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [x] 03 PostHog Initialization
- [x] 04 Database Schema

### Phase 2 — Profile Page

- [ ] 05 Profile Page — Full UI
- [ ] 06 Profile Save Logic
- [ ] 07 AI Profile Extraction from Resume
- [ ] 08 Resume PDF Generation from Profile

### Phase 3 — Find Jobs Page

- [ ] 09 Find Jobs Page — Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [ ] 12 Job Details Page — Full UI
- [ ] 13 Company Research Agent

### Phase 5 — Dashboard

- [ ] 14 Dashboard Page — Full UI
- [ ] 15 Stats Bar — Real Data
- [ ] 16 Recent Activity — Real Data
- [ ] 17 Analytics Charts — PostHog Data

---

## Decisions Made During Build

- **Font token indirection.** `ui-tokens.md` specifies `--font-sans: "Inter", sans-serif` in `@theme`
  while `ui-rules.md` specifies `next/font` with `variable: "--font-sans"`. Both resolve on the `<html>`
  element at equal CSS specificity, so the winner depends on stylesheet order — which Next explicitly
  documents as differing between dev and prod. If `@theme` won, `--font-sans` would resolve to the bare
  string `"Inter"`, which has no `@font-face` (next/font names its face `__Inter_<hash>`), silently
  falling back to a system font. Resolved with the pattern from Next's own docs: `next/font` declares
  `--font-inter`, and `@theme` maps `--font-sans: var(--font-inter), sans-serif`. Token name is
  unchanged — `font-sans` and `var(--font-sans)` work as documented.
- **Card shadow needs no token.** Tailwind v4's built-in `--shadow-sm` is byte-identical to the card
  shadow in `ui-tokens.md`. Cards use `shadow-sm`; no custom shadow token was added.
- **Default border color.** Tailwind v4 defaults every border to `currentColor` (v3 defaulted to
  gray-200). A `@layer base` rule sets `border-color: var(--color-border)` on all elements so a bare
  `border` class satisfies the "all borders default to `--border`" invariant.
- **No dark mode.** No dark tokens exist in `ui-tokens.md` and dark mode is not in scope, so the
  scaffold's `prefers-color-scheme` block was removed rather than filled in.

### Feature 01 — Homepage

- **shadcn CLI deferred; `Button` hand-written.** `shadcn init` rewrites `globals.css` with its own
  `--background`/`--primary` palette, which would collide with the token set already built and
  verified. The homepage only needed one primitive, so `components/ui/button.tsx` was written by
  hand in shadcn's shape (a `buttonVariants` class builder plus a `Button` wrapper) using project
  tokens throughout. When feature 05 needs real primitives (select, checkbox, dialog), run the CLI
  then and map shadcn's token names onto ours rather than accepting its palette.
- **No `class-variance-authority`.** `code-standards.md` asks for the simpler solution first. Four
  variants and three sizes are a plain `Record` lookup; cva earns its place at combinatorial
  variants, not here. Installed only `clsx` + `tailwind-merge` (for `cn`) and `lucide-react`.
- **`cn()` lives in `lib/utils.ts`** alongside `MATCH_THRESHOLD`, per the import-alias rules.
- **`rounded-xl` is the card radius, not `rounded-2xl`.** `ui-tokens.md` says "16px (rounded-2xl in
  Tailwind)", but `@theme` overrides `--radius-xl` to 16px, so both classes now resolve to the same
  value. `rounded-xl` is used because it maps to an explicit project token.
- **Landing typography exceeds the type scale.** The scale in `ui-tokens.md` tops out at 30px (stat
  numbers) and is written for app chrome. The hero runs to `text-6xl` and section headings to
  `text-4xl`. Colour, weight and family stay on-token; only size departs. App pages stay on the
  documented scale.
- **Nav inactive colour.** `ui-rules.md` says `#4A5565`, `ui-tokens.md` says `text-text-dark`
  (`#364153`). No `#4A5565` token exists, so `text-text-dark` won — tokens are the source of truth.
- **Sections are not cards.** The "cards are always white" invariant is about content cards. The
  bottom CTA is a full-bleed band on `bg-overlay`, matching the design's own use of a coloured CTA
  band. Light text on it uses `text-surface` / `text-surface/70` rather than any new colour.
- **Navbar is static, not sticky.** `ui-rules.md` bans `position: fixed`; sticky is a grey area, so
  the navbar sits in normal flow.
- **`agnet-log.png` was not used.** The asset reads `[ACTION] Tailoring resume for Stripe` and
  `... Generating cover letter` — both listed under Features Out of Scope in `project-overview.md`.
  Shipping it would advertise features the product will not have. The second feature split uses
  `components/homepage/DossierPreview.tsx` instead, a tokenised JSX mock of the real company-research
  dossier, which doubles as the pattern source for the live card in feature 12/13.
- **`jobs-lists.png` ships with a known inaccuracy.** Its SOURCE column shows `LinkedIn` badges, but
  `jobs.source` is only `'search' | 'url'` and discovery is Adzuna-only. The surrounding copy avoids
  naming a source. The asset should be regenerated before launch.
- **Homepage owns its own chrome.** `Navbar` and `Footer` render from `app/page.tsx`, not the root
  layout, because `/login` must not show them. When authenticated pages arrive, move them into a
  shared layout that excludes the `(auth)` route group.
- **Components beyond the architecture listing.** `architecture.md` names Hero, HowItWorks and
  Features under `components/homepage/`. `build-plan.md` also specifies a dashboard preview, a
  testimonial and a bottom CTA, so `ProductPreview.tsx`, `Testimonial.tsx`, `CallToAction.tsx` and
  `DossierPreview.tsx` were added in the same folder.

### Feature 02 — Auth

- **The package is `@insforge/sdk`, not `@insforge/ssr`.** `architecture.md`, `library-docs.md` and
  `code-standards.md` all named a package that does not exist, with positional-arg constructors and
  hand-rolled cookie `getAll`/`setAll` plumbing that is not the real API. SSR helpers live at
  `@insforge/sdk/ssr` and `@insforge/sdk/ssr/middleware`. All three files have been corrected.
  Other corrections made at the same time: the method is `getCurrentUser()` not `getUser()`, and
  table access is `insforge.database.from(...)` not `insforge.from(...)` — that second one would
  have failed at runtime in feature 04.
- **The anon key in `.env.local` was the admin API key.** The `ik_…` value in `.mcp.json` is a
  full-access admin credential; it had been pasted into `NEXT_PUBLIC_INSFORGE_ANON_KEY`, which ships
  it to every browser. Replaced with the real `anon_…` key. `code-standards.md` now documents the
  prefix difference.
- **`middleware.ts` is `proxy.ts` in Next 16.** Same functionality, renamed. Confirmed in the
  installed docs at `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- **The callback cannot be a page.** `architecture.md` specified `app/(auth)/callback/page.tsx`.
  Cookies are only writable from a Route Handler or Server Action, so it is
  `app/api/auth/callback/route.ts`. `app/api/auth/refresh/route.ts` was also added — no context file
  mentioned it, but the browser client needs it to refresh the access token, and Storage and
  Realtime break without it in feature 06 onwards.
- **Two layers of protection, deliberately.** `proxy.ts` does an optimistic cookie check; every
  protected page calls `requireUser()`. Next's own docs say proxy "should not be used as a full
  session management or authorization solution", so the page check is the real boundary.
- **`updateSession` needs a cookie adapter.** Next's `RequestCookies.set()` takes no attributes, so
  it does not satisfy the SDK's `CookieStore` type — the documented example does not compile.
  `proxy.ts` wraps it. The writes cannot be stubbed: `updateSession` writes the refreshed token back
  into the request jar so Server Components see it on the same pass.
- **`redirect()` is called outside try/catch in `actions/auth.ts`.** It signals by throwing, so a
  wrapping catch swallows the navigation. `startOAuth()` returns a destination string and the
  exported action redirects to it. This is the one place `code-standards.md`'s "every Server Action
  has a try/catch" needs judgement rather than literal application.
- **`getSessionUser()` calls `unstable_rethrow()`.** `cookies()` throws a `DYNAMIC_SERVER_USAGE`
  control-flow error while Next probes for static rendering; catching it logged noise on every build
  and would have reported "signed out" instead of letting Next mark the route dynamic.
- **`/` is now dynamic.** Reading the session server-side costs the static prerender. Accepted: the
  alternative was a visible CTA flash on the page whose entire job is that button.
- **Stub pages are scaffolding.** `/dashboard`, `/profile` and `/find-jobs` render `ComingSoon` so
  route protection and sign-out are testable now. Delete each as features 05, 09 and 14 land.
- **Navbar chrome still belongs to the homepage.** Sign out lives on the stub pages only. The shared
  authenticated layout stays deferred, as feature 01 planned.
- **Tailwind v4 stays.** The InsForge docs and skill both insist on Tailwind 3.4 and say to lock it.
  That is guidance for their scaffolding template — the SDK ships no CSS. Downgrading would destroy
  the token system built in Phase 1. Ignored deliberately.
- **Never redirect in both directions on two different sources of truth.** The first cut had proxy
  sending `/login` → `/dashboard` whenever a session cookie existed, while `requireUser()` sent
  `/dashboard` → `/login` whenever the backend rejected the token. `updateSession` only decodes the
  JWT's `exp` locally — it never asks the backend — so an unexpired-but-rejected token satisfied one
  check and failed the other. Reproduced as an infinite loop (8+ redirects, `ERR_TOO_MANY_REDIRECTS`
  in a browser) and it locked the user out of the login page entirely. Triggered by a backend
  outage, a revoked session, a deleted user, a rotated secret, or missing env config. Fixed by
  making proxy redirect only *towards* `/login`; the signed-in bounce off `/login` now runs in the
  page, on the authoritative check. Verified: 8 redirects → 1.
- **`getSessionUser()` does not catch.** It previously swallowed everything, so a missing InsForge
  config rendered the whole app as "signed out" instead of failing. The SDK returns transport and
  auth failures via `error`, so the only throws are config problems and Next's control-flow
  exceptions — both must propagate. This also removed the need for `unstable_rethrow`.
- **`allowedRedirectUrls` does not gate OAuth.** It was empty and looked like a blocker. Verified
  directly against the backend: OAuth init accepts `http://localhost:3000/api/auth/callback` for
  both providers. That setting governs email link flows, which are out of scope here.

### Feature 03 — PostHog Initialization

- **`instrumentation-client.ts` replaces `lib/posthog-client.ts` and the provider.** `architecture.md`
  and `build-plan.md` both specified a browser client module plus a provider in the root layout.
  Next 16 has a file convention for exactly this — `instrumentation-client.ts` runs after the
  document loads and *before* React hydrates, which is strictly earlier than any provider in the
  tree can initialise. A `lib/posthog-client.ts` on top of it would be a module that exists only to
  re-export the `posthog-js` singleton. Both context files corrected; the file was already in place
  from an earlier `npx @posthog/wizard` run.
- **`await posthog.shutdown()` is wrong in posthog-node 5.** `library-docs.md` carried it as a hard
  rule ("events are lost without it"). In v5 `shutdown()` returns `void`, so awaiting it waits for
  nothing — following that rule would have lost exactly the events it was meant to protect.
  `captureServerEvent` uses `captureImmediate()`, which resolves only once the event has been sent.
  Verified against a local listener: one gzipped POST to `/batch/` carrying
  `user_signed_in` / `distinct_id` / `userId`, resolving in ~20ms after the response.
- **The env variable is `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`.** `code-standards.md` named
  `NEXT_PUBLIC_POSTHOG_KEY`; PostHog's own Next.js guide and the already-populated `.env.local` both
  use `PROJECT_TOKEN`. The docs were changed to follow the working configuration, not the reverse.
- **Identity lives in the root layout, not in a page.** The wizard had put `posthog.identify()` in
  `ComingSoon` — scaffolding that features 05, 09 and 14 delete, taking identification with it.
  It moved to `components/analytics/PostHogIdentity.tsx`, rendered from `app/layout.tsx` whenever a
  session exists. `ComingSoon` lost its `"use client"` and its `name` prop and is a Server
  Component again.
- **`getSessionUser()` is wrapped in React `cache()`.** The layout now resolves the session for
  identification and the page still resolves it for authorization. Without memoisation that is two
  InsForge round-trips on every authenticated render.
- **`posthog.reset()` stays on the sign-out action, not on the identity component.** Resetting when
  the layout sees no user would fire on every anonymous page load and mint a fresh anonymous ID each
  time, which destroys anonymous funnels. `SignOutButton` owns the form so capture-then-reset
  travels with sign-out when it moves into the navbar at feature 14.
- **Three auth events added to the approved list; the four product events were not touched.**
  `job_search_started`, `job_found`, `profile_completed` and `company_researched` measure actions
  that do not exist yet — they belong to features 06, 10 and 13. The only real user actions today
  are the auth lifecycle, so `oauth_sign_in_started`, `user_signed_in` and `user_signed_out` were
  registered in `code-standards.md` first, then wired.
- **`user_signed_in` is captured server-side in the OAuth callback**, not client-side on the
  dashboard, so it fires once per sign-in rather than once per visit.
- **`user_signed_in` deliberately carries no `provider`.** The callback URL does not know it, and
  threading it through would mean a second OAuth cookie. `oauth_sign_in_started` carries it, the
  anonymous→identified merge puts both events on one person, and a funnel breaks down by step one's
  property. Do not add a provider cookie for this.
- **`send_instantly: true` on both client captures.** Each is immediately followed by a navigation —
  the provider redirect, and the sign-out Server Action's redirect. A queued event goes with the page.
### Feature 03 — issues found by `/review` and fixed

All eight review findings were addressed in the same session. What changed:

- **Critical — analytics was on the auth critical path.** `await captureServerEvent(...)` in the
  OAuth callback blocked the redirect. Measured against an endpoint that accepts the connection and
  never answers: **49 seconds**, across 4 attempts at the library defaults — and `captureImmediate`
  *resolves* rather than rejecting, so the `try/catch` never fired and no amount of error handling
  would have helped. Fixed two ways: the call moved inside `after()` from `next/server` so it runs
  once the response has gone, and `captureServerEvent` now sets `fetchRetryCount: 1`,
  `fetchRetryDelay: 1000`, `requestTimeout: 3000`. Re-measured: **7 seconds**, off the response path.
  Rule added to `architecture.md` invariants: never await a server capture on the request path.
- **`captureImmediate` fails silently.** Because it resolves on delivery failure, a dropped server
  event produced no log at all. `captureServerEvent` now attaches `posthog.on("error", …)`, which is
  the only place that surfaces.
- **The root layout was a single point of failure.** `getSessionUser()` deliberately does not catch,
  and it now runs in `app/layout.tsx` — so an InsForge config or transport throw took down *every*
  route. Added `getSessionUserForAnalytics()`, which catches: identity is not worth an outage, while
  `requireUser()` in the page still fails loudly, so the blast radius is one route instead of all.
- **That catch immediately reintroduced the feature-02 `DYNAMIC_SERVER_USAGE` trap.** The first
  version swallowed Next's control-flow exception, hid the dynamic signal from the static probe, and
  spammed the build log with stack traces. Fixed with `unstable_rethrow(error)` as the first
  statement in the catch. Invariant added: every catch in a Server Component, Server Action or Route
  Handler calls `unstable_rethrow` first.
- **`app/global-error.tsx` was unstyled.** Raw `<h2>`/`<button>`, no tokens, and — because it
  replaces the root layout — no `globals.css` and no font variable, so it rendered as browser-default
  HTML. Now imports `globals.css`, pulls the font from the new `lib/fonts.ts`, and renders
  `components/layout/ErrorState.tsx`.
- **There was no route-level error boundary at all.** Added `app/error.tsx`, so a thrown page keeps
  the layout instead of escalating to the document-replacing boundary. Both boundaries share
  `ErrorState` and both call `posthog.captureException`.
- **`lib/fonts.ts` extracted.** `global-error.tsx` renders its own `<html>` and inherits no
  className, so `--font-inter` would have been undefined there and `--font-sans` would have silently
  fallen back to a system font. One `next/font` instance now serves both.
- **`.env.example` was invisible and incomplete.** `.gitignore`'s `.env*` matched it, so it was
  untracked and would never have reached a clone or CI — while `posthog-setup-report.md` tells you to
  configure deployments from it. Added `!.env.example`, and filled it with all five current variables
  plus the four commented ones features 07–13 will need. Verified `git add` now accepts
  `.env.example` and still refuses `.env.local`.
- **Client events now use `transport: "sendBeacon"`** alongside `send_instantly`. Both captures are
  immediately followed by a navigation, which cancels in-flight XHRs; sendBeacon is the only
  transport the browser still delivers after unload.
- **The `cache()` dedupe was measured, not assumed.** Temporarily instrumented `getSessionUser`, hit
  `/` (two call sites: the layout and the page), and counted **one** body execution.

Two review findings were closed without a code change: `lib/posthog-client.ts` not existing, and the
three auth events being beyond build-plan 03's stated scope. Both are deliberate and documented above.

- **`app/global-error.tsx` was kept rather than deleted**, but no longer as the wizard left it — see
  the fixes above. Exception autocapture stays on in `instrumentation-client.ts`.

### Feature 04 — Database Schema

Designed through `/architect`; the five decisions below were made with the developer, not assumed.

- **Storage is private, and `resume_pdf_url` is now `resume_path`.** `architecture.md` said
  "authenticated users only, own files only" while `library-docs.md` called `getPublicUrl()` and
  stored the result — only one could survive. Private won: a resume is PII, and a public URL is a
  permanent bearer token that leaks via logs, `Referer` and PostHog session replay (which is active
  on this app). The column stores the object key; features 06 and 08 call `createSignedUrl` at
  render time. `library-docs.md` rewritten.
- **No trigger on `auth.users`.** The `profiles` row is created by an app-side upsert on first save.
  A trigger runs inside the sign-up transaction, so a bug in it would break OAuth sign-up for every
  new user — not worth avoiding one null check. Every read of `profiles` must handle absence.
- **`jobs.external_id` added; it is the dedupe key.** Nothing previously stopped a re-run of the same
  search from duplicating every row and inflating feature 15's "Total Jobs Found". Keyed on Adzuna's
  stable `id` rather than `redirect_url`, because a tracking URL may carry a per-request token and
  the constraint would then silently never fire. The index is partial so url-sourced jobs (no Adzuna
  id) are not collapsed onto one NULL row per user.
- **Completeness is derived, not stored, and `is_complete` was dropped.** Feature 06 said percentage
  and missing fields were "calculated and saved", but no columns existed for them. Storing them
  means a backfill migration every time the definition of "complete" changes, and stale rows until
  then. One helper in `lib/` is the single source of truth.
- **`cover_letter_tone` dropped too** — same drift class as the tailored-resume columns, since cover
  letters are out of scope. Flagged as an assumption and confirmed.

Implementation notes worth keeping:

- **Grants are not optional.** InsForge grants broad DML on `public` tables to `anon` and
  `authenticated` by default so RLS can decide rows. Policies do **not** grant privileges. The
  migration revokes everything from `anon` and grants explicit DML to `authenticated`.
- **`system.update_updated_at()` is built in** — used for the `profiles` updated_at trigger rather
  than hand-rolling one.
- **`(SELECT auth.uid())` subquery form** in every policy, so it is evaluated once per query.
- **`insforge link` edits tracked files.** It appended an `<!-- INSFORGE:START -->` block to
  `AGENTS.md` (accurate, kept) and added a blanket `.claude` rule to `.gitignore`. That rule was
  removed: this repo versions its skills under `.claude/skills/`, and the 65 tracked files were safe
  only because gitignore never applies to tracked paths — any *new* skill would have been invisible.
- **`.insforge/` is gitignored** — `.insforge/project.json` holds a full-access admin key.

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._

- **Unresolved drift, Phase 5.** `build-plan.md` feature 14 lists a "Cover Letters Generated" stat
  card and a "Resume Tailoring Activity" chart, but `project-overview.md` puts cover letters and
  resume tailoring out of scope and names the four cards as Total Jobs Found / Avg. Match Rate /
  Companies Researched / Jobs This Week. Follow `project-overview.md` when Phase 5 is built.
- **Dev server smoke test.** `npm run build`, `npx tsc --noEmit` and `npm run lint` all pass clean as
  of feature 02. `/` no longer prerenders as static — every route is now server-rendered on demand.
- **`lib/insforge-client.ts` is intentionally unreferenced.** `architecture.md` prescribes it and
  feature 06 needs it for Storage and Realtime, so it stays rather than being deleted and re-added.
  It has never been exercised — treat it as unverified when feature 06 first imports it.
- **Feature 04: the RLS policies themselves are unproven.** Verified against the live backend: RLS is
  enabled with one `USING` + `WITH CHECK` policy per table; `anon` has zero privileges and gets
  `42501 permission denied` over the real REST API on all four tables; the private bucket returns 403
  on list and 401 on direct fetch; the unique index rejects a duplicate `external_id`; an upsert
  refreshed `match_score` 50 → 91 while preserving `company_research`; two NULL-`external_id` rows
  coexist. All test rows were deleted — every table is empty.
  **Not verified: that user A cannot read user B's rows.** That is the one property RLS exists for,
  and it needs a real user JWT. Both MCP `run-raw-sql` and CLI `db query` run as `project_admin` and
  refuse `SET ROLE`, so neither can prove it. There is currently only one user in `auth.users`.
  Test it the moment a second signed-in session exists.
- **Feature 03 is not fully verified either, and for the same reason.** What was verified: the
  project token and host answer PostHog's flags endpoint with HTTP 200; the posthog-node call shape
  sends a correct `/batch/` payload; the browser bundle contains a real `posthog.init`; the worst-case
  server stall is 7s and off the response path; and the `cache()` dedupe is one call per request.
  What was **not**: no `oauth_sign_in_started`, `user_signed_in`, `user_signed_out` or `$exception`
  has ever been seen arriving in the PostHog project, because that needs the browser sign-in below.
  Drive one sign-in and one sign-out, then check PostHog's Activity view before treating the events
  as working. Neither error boundary has been triggered either — throw something on purpose once.
- **Feature 02 is not fully verified.** Automated checks that passed: `/dashboard`, `/profile`,
  `/find-jobs` and `/find-jobs/[id]` all 307 to `/login` while signed out; `/login` renders both
  providers; the homepage CTAs resolve to `/login`; OAuth init returns a valid provider URL for
  Google and GitHub. **Not yet exercised: an actual browser sign-in.** The code exchange, cookie
  write, post-login redirect, the signed-in homepage CTA, and sign-out have never run. Drive one
  sign-in with each provider before treating this feature as done.
