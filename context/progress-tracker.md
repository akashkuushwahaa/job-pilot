# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 5 — Dashboard, complete. **All 17 features are built.**
**Last completed:** 17 Analytics Charts — Real Data. The last three mock functions are gone, and
`/dashboard` now renders entirely from the user's own rows. **The source is the database, not
PostHog** — PostHog cannot be read from this project at all, and could not answer two of the three
questions if it could. Details below.
**Oldest open defect — FIXED.** Searching a country the app did not support returned confidently
wrong results rather than nothing ("India" → Indianapolis). The market is now an explicit field on the
search form covering all 19 Adzuna markets, and nine of the ten bad rows are gone. Details below.
**Standing gap — CLOSED.** `/dashboard` was opened signed in on 2026-08-09 and looks right. Every
PostgREST call features 15, 16 and 17 make has now executed against the live API. That gap had been
open since feature 14.
**Next:** merge `feat/16-recent-activity` into `main` — it carries 15, 16 and 17.

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [x] 03 PostHog Initialization
- [x] 04 Database Schema

### Phase 2 — Profile Page

- [x] 05 Profile Page — Full UI
- [x] 06 Profile Save Logic
- [x] 07 AI Profile Extraction from Resume
- [x] 08 Resume PDF Generation from Profile

### Phase 3 — Find Jobs Page

- [x] 09 Find Jobs Page — Full UI
- [x] 10 Adzuna Job Discovery
- [x] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [x] 12 Job Details Page — Full UI
- [x] 13 Company Research Agent

### Phase 5 — Dashboard

- [x] 14 Dashboard Page — Full UI
- [x] 15 Stats Bar — Real Data
- [x] 16 Recent Activity — Real Data
- [x] 17 Analytics Charts — Real Data (database, not PostHog)

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
  the constraint would then silently never fire. ~~The index is partial so url-sourced jobs (no
  Adzuna id) are not collapsed onto one NULL row per user.~~
  > **Overturned by feature 10.** The predicate was doing nothing — unique indexes are
  > `NULLS DISTINCT` by default, so NULL `external_id` rows never collided with each other either
  > way — and it made the index unusable from PostgREST, which cannot emit the `WHERE` clause that
  > `ON CONFLICT` needs to infer a partial index. Migration
  > `20260802124740_jobs-dedupe-index-non-partial.sql` drops it. **Do not make it partial again.**
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

### Feature 05 — Profile Page (Full UI)

- **The shadcn CLI was still not run.** Feature 01 deferred it to "when feature 05 needs real
  primitives (select, checkbox, dialog)". Feature 05 needs no dialog at all, and its select and
  checkbox are native elements in the design — a native `<select>` with an absolutely positioned
  `ChevronDown`, and a native checkbox tinted with `accent-accent`. Running `shadcn init` would have
  rewritten `globals.css` with its own palette to buy two Radix dependencies this page does not use.
  `code-standards.md` asks "is there a simpler native solution" first; here it is one. Six
  primitives — `field`, `label`, `input`, `textarea`, `select`, `checkbox` — were hand-written in
  shadcn's shape on project tokens, exactly as `Button` was. Revisit when a page genuinely needs a
  dialog or a combobox.
- **`completeness(profile)` reads ten fields.** Design-locked: the reference shows 70% with PHONE,
  LOCATION and EDUCATION missing, which is only self-consistent at ten required fields. Listed in
  `architecture.md`. Takes `Profile | null` so feature 06 can pass a missing row straight through.
- **Filled inputs tint; empty ones stay white** — and the tint inverts inside a tinted container.
  Read from the control's own `value`, so it needs no extra state and no validation styling. This is
  the design's own signal for "what have I not filled in yet".
- **`--color-error-dark` (#B42318) added.** The missing-field tags are red text on a red tint, which
  measures 3.3:1 with `--color-error` — under the AA floor. `--color-error` stays a signal colour for
  icons, borders and the ring; anything red that is *read* uses the new token at 5.8:1. Mirrors the
  `--color-success` / `--color-success-foreground` pair already in the set.
- **The navbar's active item gets an underline**, against `ui-rules.md`'s "colour change only". The
  design draws it, and on a page this long it is what makes the active tab legible. `active` is a
  prop rather than `usePathname()`, so `AppNavbar` stays a Server Component.
- **Pages still own their chrome.** No shared authenticated layout and no `(app)` route group —
  `architecture.md` has never had one. Every protected page renders `AppNavbar` itself.

### Feature 05 — issues found by `/review` on the auth implementation, and fixed

Reported symptom: after login you could not reach `/profile`.

- **Root cause: no navigation on any authenticated page.** `/dashboard` and `/find-jobs` rendered
  `ComingSoon`, the chrome-less auth shell, whose only links were the logo and Sign out. After login
  you land on `/dashboard` and nothing on the page points at `/profile`. The homepage navbar had the
  links but was `hidden md:flex`, so under 768px there was no route to `/profile` from anywhere.
  Fixed: both stub pages now render `AppNavbar`, and the homepage nav collapses at `sm` instead of
  `md`. `AppNavbar` on every protected page is now an invariant in `architecture.md` — it is the
  only navigation between them, so a protected page without it is a dead end.
- **Feature 05 had removed the app's only sign-out from `/profile`.** `ComingSoon` owned it, and the
  new profile page does not use `ComingSoon`. `SignOutButton` moved into `AppNavbar` — where the
  registry always said it belonged from feature 14 — and gained `variant` / `fullWidth` props for
  the navbar's compact ghost treatment. `ComingSoon` lost its logo and sign-out to avoid a second
  header under the navbar, so it is no longer an Auth shell user.
- **The homepage secondary CTAs ignored the session.** Both "Find your first match" buttons pointed
  at `ctaHref`, so signed in all four homepage buttons went to `/dashboard` — the label was a lie.
  `Hero` and `CallToAction` now take `secondaryHref`, which is `/find-jobs` with a session and
  `/login` without. The primary CTA branching was already correct and was not the reported problem.

**Reported, not fixed — awaiting a call:**

- **Critical: the `unstable_rethrow` invariant is violated in three catches** — `startOAuth` and
  `clearSession` in `actions/auth.ts`, and the outer catch in `app/api/auth/callback/route.ts`.
  `redirect()` is called outside the try in both actions so `NEXT_REDIRECT` is not currently
  swallowed, but `cookies()` inside those try blocks can raise Next control-flow exceptions. This is
  the same trap features 02 and 03 each hit once.
- **Minor: the OAuth code-verifier cookie survives a failed exchange.** `loginRedirect` returns
  without deleting `OAUTH_CODE_VERIFIER_COOKIE`, leaving a stale verifier for up to 10 minutes. The
  next attempt overwrites it, so this is hygiene rather than a defect.
- **Minor: signed-out visitors see the homepage app-nav links**, which 307 straight back to
  `/login`.
- **Cover Letter Tone was not built.** `build-plan.md` feature 05 lists it under Job Preferences, but
  feature 04 dropped the column and cover letters are out of scope. The design does not show it
  either — the build plan is the stale one.
- **Resume copy reworded.** The design's "generate a new tailored one" advertises resume tailoring,
  which `project-overview.md` puts out of scope. Same call as feature 01's `agnet-log.png`.
- **Remove role added, not in the design.** Add role with no remove is a dead end. Rendered only
  when more than one role exists.
- **`ResumePreview.tsx` was not built.** `architecture.md` lists it, but there is no resume to
  preview until feature 06 uploads one and no state in the design shows it. It lands with the
  signed-URL render in feature 06.

### Feature 06 — Profile Save Logic

Designed through `/architect`. Two latent defects were found during planning and fixed here.

- **`profiles.education` was declared as an array.** `JSONB NOT NULL DEFAULT '[]'::jsonb`, while
  `architecture.md`, `types/index.ts` and the design all treat it as one object. JSONB accepts
  either, so nothing errored — but a fresh row got `[]`, and `profile.education ?? EMPTY_EDUCATION`
  does not catch an empty array, so it would have flowed into the education inputs and dropped them
  to uncontrolled. Migration `20260801130227_fix-education-shape.sql` makes the column nullable with
  no default. Applied against zero rows, so no backfill.
- **InsForge storage has no ownership model.** `storage.buckets` carries only `name`, `public`,
  `cors_rules`, `versioning_status`, and `pg_policies` shows no RLS on `storage.objects` in any
  schema. Private means *authenticated*, not *owned* — nothing in the platform stops one signed-in
  user naming another's key. `app/api/resume/route.ts` is the entire defence: the key is always
  `${user.id}/resume.pdf` built from `requireUser()`, and `GET` signs a path read from the caller's
  own row rather than one they supplied. Recorded as a rule in `architecture.md` and `library-docs.md`.

Decisions:

- **Upload is a Route Handler fired on file selection, not part of the Save Profile action.** Server
  Actions default to a 1MB body limit and the spec allows 5MB, so a Server Action would reject a
  valid file outright. It also puts the file in storage before feature 07's Extract button needs it.
- **`profile_completed` fires on a false→true transition.** The action reads the existing row before
  writing and compares `completeness()` on both sides. No `is_complete` column, fires exactly once.
- **`email` and `resume_path` are never taken from the client.** `email` comes from the session (the
  field is disabled, so a payload carrying another address is tampering); `resume_path` is owned by
  the resume route, so a profile save can never clobber the resume and vice versa.
- **zod installed and validating the action payload.** Already approved in `code-standards.md`, never
  installed until now. It bounds sizes and shapes; `lib/profile.ts` separately re-narrows the three
  enums through the const arrays so an unrecognised value becomes null instead of hitting the CHECK
  constraint and failing the whole save.
- **`years_experience` is parsed as a non-negative integer or null.** The column carries
  `CHECK (>= 0)` and the zod schema only bounds string length, so `"-5"` would have reached Postgres
  and failed the save with a message the user could not act on.
- **Both directions of the row↔form mapping live in `lib/profile.ts`.** Split across two files they
  drift, and a column added to one and missed in the other is silent because every field is optional
  on the way in.
- **Session recording now sets `maskAllInputs` explicitly.** posthog-js masks input values by
  default, so this closes no live leak — it makes the guarantee a property of this repo rather than
  of a library default that can change under us.

### Feature 06 — issues found by `/review` and fixed

All eight findings resolved in the same session.

- **Critical — uploading a resume discarded unsaved form edits.** `ProfileForm` was keyed on
  `profile.updated_at` so it would re-seed after a save. But the resume upload upserts the same row,
  the `profiles_updated_at` trigger bumps the column, `router.refresh()` re-renders, the key changes
  and the form remounts — wiping whatever was part way through being typed. The key conflated "the
  server has newer canonical data" with "any write touched this row". **`saveProfile` now returns the
  normalised `values` and the form adopts them itself; the key is gone.** The plan specified that key
  and it was wrong.
- **Important — the success banner could never appear.** Same root cause: Next returns the
  revalidated tree in the Server Action's single-roundtrip response, so the remount reset `status` to
  null. Errors *did* show, because a failed save never revalidates — silent on success, loud on
  failure. Fixed by the same change.
- **Important — three `any` leaks at the database boundaries.** The SDK returns PostgREST rows as
  `any`, and annotating the variable `Profile | null` only renamed the `any`; nothing was checked. A
  comment even claimed the shape was "asserted" when it was not. Added `parseProfile(row: unknown)`
  in `lib/profile.ts` — a zod schema with `.catch()` on every field, so one drifted column degrades
  to its empty value instead of taking the page down. An absent row returns null; an unrecognisable
  one throws rather than returning null, because rendering an empty form over a row we failed to read
  invites the next save to blank it.
- **Important — a malformed `education` object crashed the profile page.** `hasText` took
  `string | null` and did `value.trim()`; an education object missing `degree` supplies `undefined`,
  which sails past a null-only guard and throws. Now `typeof value === "string"`. jsonb is
  structurally unchecked by Postgres, so nothing upstream guaranteed the shape.
- **Minor** — `EMPTY_ROLE` / `EMPTY_EDUCATION` moved from `types/` (which `architecture.md` scopes to
  types) into `lib/profile.ts`; `splitList` un-exported; `GET /api/resume`'s deviation from the
  route-handler envelope documented in the file; a no-resume `GET` now redirects to `/profile`
  instead of rendering raw JSON; and the 5MB limit gets a `Content-Length` pre-check so an oversized
  body is refused before `formData()` buffers it into memory.

**Verified by execution, not reasoning:** a temporary route (since deleted) ran `parseProfile` +
`completeness` over nine row shapes — absent, healthy, `education` as `[]` / as a string / missing
`degree`, a role missing keys, `skills: null`, an invalid enum, and `years_experience: "four"`. All
nine returned rather than threw; the three `education` cases are the ones that previously crashed.
The healthy row scored 60% with 4 missing, which is the correct 6-of-10.

Verified statically: the three app enums match the DB CHECK constraints character for character;
`education` is nullable with no default; `GET` and `POST /api/resume` and `/profile` all 307 to
`/login` for an anonymous caller. That last one also proves `unstable_rethrow` is letting
`NEXT_REDIRECT` through the route's catch — the proxy matcher excludes `/api`, so the redirect can
only be coming from `requireUser()` inside the handler.

### Feature 07 — AI Profile Extraction from Resume

Designed through `/architect`. `POST /api/resume/extract` takes **no request body** — it reads
whichever resume the caller's own row points at, the same rule as the upload route and for the same
reason.

Decisions:

- **The PDF is downloaded from storage, not re-posted.** The build plan says "uploaded PDF buffer",
  but the button only exists once `resume_path` is set, so `storage.download(key)` is the shorter
  path and keeps the key un-nameable by the caller.
- **Extraction writes nothing.** No `profiles` write, no `revalidatePath`. It returns form-shaped
  values, the client merges them into React state, and the user presses Save Profile. A page refresh
  discards a bad extraction entirely — which is what makes overwriting filled fields acceptable.
- **Merge rule: named fields win, unnamed fields keep what the user typed.** The response carries
  only keys the resume actually spoke to, so the merge is a spread. `education` merges key by key so
  a resume naming the institution but not the field of study cannot blank the latter. Work
  experience replaces the list wholesale — there is no correspondence between "the second role you
  typed" and "the second role on the resume".
- **Facts only.** `email`, `work_authorization`, and all four Job Preferences are never extracted.
  `ExtractedFormValues` in `types/index.ts` `Omit`s them, so the exclusion is enforced by the
  compiler rather than by discipline.
- **Form state lifted to `ProfileWorkspace`.** Two cards now write to it. `ProfileForm` is controlled
  and keeps only `status` and `isSaving`; the page still renders it unkeyed, for the feature 06 reason.
- **Extraction logic lives in `lib/`, not `agent/`.** No `runId`, no `agent_logs`, one
  request/response — it does not meet the agent-function contract in `code-standards.md`.
  `lib/openai.ts` holds the client (matching `browserbase.ts` / `stagehand.ts` / `adzuna.ts`);
  `lib/resume-extraction.ts` holds prompt, schema and mapping, beside `lib/profile.ts`.
- **`DEGREE_OPTIONS` moved from `ProfileForm.tsx` to `types/index.ts`.** The prompt, the zod schema
  and the `<Select>` now read one list — a degree the select cannot render would show as blank.
- **No new PostHog event.** `code-standards.md` fixes the list at seven.

Found while building:

- **`pdf-parse@2` is not the API `library-docs.md` documented.** The file showed
  `import pdf from "pdf-parse"; await pdf(buffer)` — that is v1 and does not exist in the installed
  v2.4.5, which is a `PDFParse` class over pdfjs-dist. It also needs `serverExternalPackages` and a
  `destroy()` in a `finally` or it leaks a pdfjs worker per call. `library-docs.md` corrected.
  **Third time in two features that the docs under-described an installed package — read the
  `.d.ts` first, every time.**
- **GPT-4o read seven years of experience as four.** "March 2022 — Present" is unresolvable without
  knowing the present, and the model anchored on its own training cutoff. Fixed by putting today's
  date in the prompt; re-ran and it returned 7. Recorded as a rule in `library-docs.md`.
- **`max_tokens` is deprecated in the installed SDK (v7)** in favour of `max_completion_tokens`.

**Verified by execution:** a temporary route (since deleted) ran the real prompt, schema and mapping
against the live model. A generated one-page resume returned all twelve permitted fields correctly —
dates as `YYYY-MM`, `currently_working: true` with `end_date: null`, degree drawn from
`DEGREE_OPTIONS`, `experience_level` a valid enum, no email and no job preferences. A text-free PDF
and a non-PDF both returned the build plan's exact "Could not extract text from this PDF" message.
Anonymous `POST /api/resume/extract` 307s to `/login`.

### Feature 08 — Resume PDF Generation from Profile

Designed through `/architect`. `POST /api/resume/generate` takes **no request body** — the third
resume route in a row to read the caller's own row rather than accept anything from the client.

Decisions:

- **Overwrite stays, but it is confirmed.** There is one storage key and one `resume_path`, and
  multiple resume versions are out of scope, so generating destroys the uploaded original — which is
  also the file extraction reads. With a resume already stored the button does not act: it swaps the
  row into a Cancel / Replace resume confirm. An inline confirm rather than a dialog, for the same
  reason feature 05 hand-wrote its primitives — `ui-rules.md` has no dialog and this does not earn a
  Radix dependency.
- **Generate is disabled while the form is ahead of the saved row.** Generation reads the row, and
  the form is routinely ahead of it — extraction exists to put unsaved values on screen. Without
  this, Extract → Generate silently produces a resume from the *old* row and overwrites the real one
  with it. `ProfileWorkspace` holds a `savedValues` snapshot and `lib/profile.ts` gained
  `isSameFormValues`, which compares field by field rather than by `JSON.stringify` — a role reaches
  the form from `EMPTY_ROLE`, from extraction, and from a jsonb column that orders its keys the way
  Postgres feels like, so identical roles serialise differently.
- **Gated on `completeness().isComplete`**, the same ten fields the banner reports, re-checked in the
  route. A near-empty profile would otherwise render a near-empty PDF over a real uploaded resume.
  The button carries the reason as muted text — a disabled control that does not say why reads as
  broken.
- **GPT-4o writes prose only.** It returns `{ summary, roles: [{ bullets }] }`; every fact — name,
  company, title, dates, degree, institution, skills — is rendered straight off the row. A model that
  can restate an employer's name can invent one.
- **A failure writes nothing.** No upload, no row write, so the stored resume survives a model
  outage or a render error intact. Failing loudly beats shipping an unpolished PDF over someone's
  real resume.
- **Bullets fall back per index, never across roles.** A response with fewer roles than were sent
  falls back to that role's own `responsibilities` text. Shifting bullets up would attribute one
  employer's work to another.
- **`lib/resume-pdf.tsx` lives in `lib/`, not `components/`.** It is not a React DOM component and
  can never be imported by one; `architecture.md` scopes `components/` to app UI.
- **No new PostHog event.** The list stays at seven.

Found while building:

- **The InsForge SDK's `upload()` takes `(path, file: File | Blob)` — there is no third options
  argument.** `library-docs.md` showed `upload(key, buffer, { contentType, upsert: true })`; none of
  that exists in `@insforge/sdk@1.5.1`. The buffer is wrapped in a `File`, which is what the upload
  route already passed. **Fourth package in three features whose installed API did not match the
  docs — read the `.d.ts` first, every time.**
- **The "supported CSS properties" list for react-pdf was a subset.** The real `Style` type is in
  `@react-pdf/stylesheet` and includes `borderBottomWidth`, `letterSpacing`, `textTransform`,
  `flexWrap` and `gap`, all of which this document uses. Corrected.
- **`@react-pdf/renderer` needed no `serverExternalPackages` entry** — unlike `pdf-parse`, it bundled
  and rendered clean under Turbopack.
- **GPT-4o wrote the current role in past tense** despite the rule saying otherwise, because the rule
  sat in the shared instructions where nothing tied it to a specific role. Marking the role itself
  `(CURRENT ROLE — write these bullets in present tense)` fixed it on the next run. A rule stated once
  at the top is weaker than the same rule attached to the item it governs.

**Verified by execution:** a temporary route (since deleted, confirmed 404) ran the real prompt,
schema, renderer and `pdf-parse` over a complete seven-year profile fixture. Output was a 3.5KB
`%PDF-1.3` that parses back to **one page** carrying the header, contact line with protocols
stripped, summary, skills, three roles and education. Dates rendered `Mar 2022 — Present`,
`Jul 2019 — Feb 2022`, `Jan 2018 — Jun 2019`. The role with empty responsibilities got **zero**
bullets rather than invented ones. No email address in the extraction sense is irrelevant here —
the generated resume carries contact details on purpose — but no job preferences, salary expectation
or work authorization appear anywhere. `tsc`, lint and build clean, every route `ƒ`. Anonymous
`POST /api/resume/generate` 307s to `/login`.

### Feature 09 — Find Jobs Page (Full UI)

UI only, on mock data, exactly as the build plan scopes it. Four components under
`components/find-jobs/`, matching `architecture.md`'s listing name for name.

Decisions:

- **The SOURCE column was not built.** The design does not draw it, and it could only ever carry one
  value: `jobs.source` is `'search' | 'url'`, discovery is Adzuna-only, and URL import is out of
  scope in `project-overview.md`. A column with one constant value is noise. The "Jobs by Adzuna"
  credit that `project-overview.md` requires on job listings carries the same information and is
  rendered under the card. Same call as feature 01 made on `jobs-lists.png`'s LinkedIn badges.
- **Match score bands come from the design: 90 green / 80 blue / below orange.** `ui-rules.md` said
  80/60 and `ui-tokens.md` said 90/70/50 — they disagreed with each other and both disagreed with
  the rendered design, which draws 88 and 85 blue. The design broke the tie for a visual decision;
  `ui-rules.md` corrected. Now one function, `matchScoreFill()` in `lib/utils.ts`, so feature 12's
  `MatchScore` cannot drift from the list.
- **The design's pagination is internally inconsistent** — "1 to 6 of 24 results" beside eight page
  buttons, where 24 at 6 per page is four pages. `JobsPagination` derives the page count from
  `totalResults / pageSize` so the sentence and the buttons cannot disagree, and the mock totals 48
  so the ellipsis and page 8 still render as drawn. Feature 11 passes 20 per page and the real count.
- **Rows do not link yet.** `/find-jobs/[id]` arrives in feature 12; a row navigating to a 404 is
  worse than one that does not navigate. The hover state `ui-rules.md` specifies is in place, so
  feature 12 adds only the `href`.
- **No Client Components at all.** Uncontrolled inputs and inert buttons need no state, so the page
  ships zero JavaScript of its own. Features 10 and 11 add the boundaries where they are needed —
  putting them in now would be guessing at where.
- **`found_at` is stored as a real ISO timestamp in the mock, not as "2 hours ago".**
  `formatRelativeTime()` in `lib/utils.ts` renders the column, so feature 11 changes the data source
  and nothing else. `Intl.RelativeTimeFormat` with `numeric: "auto"` is what produces "Yesterday"
  rather than "1 day ago".
- **A button on a field row states its own height.** `Button` `md` is `h-9`, form controls are
  `h-10`. Changing `md` globally was considered and declined — it would move every button in the app
  to fix one row.

**Verified by execution:** `npx tsc --noEmit`, `npm run lint` and `npm run build` all clean, every
route still `ƒ`, and `/find-jobs` still 307s to `/login` while signed out. A temporary preview route
(since deleted, confirmed 404) rendered the components unauthenticated and the markup was read back:
94 → `bg-success`, 88 → `bg-info`, 72 → `bg-warning`; "2 hours ago" / "Yesterday" / "4 days ago";
a null salary → "Not listed"; the empty state; and all four pagination shapes — `1 2 3 … 8` at page
1, `1 … 4 5 6 … 8` at page 5, `1 … 5 6 7 8` at page 8, `1 2` at twelve results. Also confirmed in
the emitted HTML that twMerge resolved every override as intended: `w-auto` beat `w-full` on the
selects, `border-transparent` beat `border-border` on the filter input, `pl-9` beat `px-3`, and the
current page button dropped `bg-surface` / `border-border` / `text-text-primary` for the accent set.

### Feature 10 — Adzuna Job Discovery

Designed through `/architect`. The first agent feature, and the first code in `agent/`.

**Found during planning, and it changed the feature:** the dedupe index could not be used from
PostgREST at all. Feature 04 created `jobs_user_source_external_key` as a *partial* unique index
(`WHERE external_id IS NOT NULL`); PostgreSQL infers a partial index for `ON CONFLICT` only when the
statement repeats the predicate, and PostgREST's `on_conflict` parameter emits no `WHERE`. Verified
against the live database before a line was written: the predicate-free statement failed with
*"there is no unique or exclusion constraint matching the ON CONFLICT specification"* and the same
statement with the predicate succeeded. Feature 04's stated reason for the predicate — keeping
url-sourced NULL rows from collapsing onto one — was also wrong: unique indexes are `NULLS DISTINCT`
by default. Migration `20260802124740_jobs-dedupe-index-non-partial.sql` drops it, and two NULL
`external_id` rows were confirmed to coexist afterwards. `architecture.md` corrected.

Decisions:

- **Feature 10 took the plain jobs read that build-plan.md assigns to feature 11.** Not the filter,
  sorts or pagination — just `mockJobs()` deleted and the user's own rows read, newest first. Without
  it the banner reports 8 jobs while six Vercel/Stripe/Linear mock rows sit underneath, and the
  feature cannot be seen working. `build-plan.md`'s own core principle is that every feature is
  visible and testable before the next starts.
- **Gated on `completeness(profile).isComplete`**, re-checked in the route, the same gate feature 08
  puts on Generate — with the reason as muted text under the row, the same class string. A score
  against a near-empty profile is meaningless, and the score is the product.
- **The description arrays are not filled.** Adzuna's snippet is 500 characters and truncates
  mid-sentence, so `about_role` takes it verbatim and `responsibilities`, `requirements`,
  `nice_to_have`, `benefits` and `about_company` stay empty. Structuring it means inventing the part
  that was cut. Feature 12 must render only the sections that have content — its job details page
  will look thinner than the design.
- **Scoring is concurrent and a failed score drops the job.** `Promise.allSettled` over all ten:
  3-5s instead of 30-40s sequential, and one bad response cannot take the other nine with it. An
  unscored job is logged to `agent_logs` at `warning` and skipped, because it cannot be ranked or
  rendered — `JobListItem.match_score` is a `number`.
- **`found_at` and `company_research` are omitted from the upsert payload.** PostgREST builds its
  `ON CONFLICT DO UPDATE SET` list from the payload's keys, so omission is the only way to say
  "write once, never touch again". `found_at` therefore means *first discovered*, which is what the
  Date Found column claims. `run_id` **is** sent, so it moves to the run that most recently surfaced
  the job — which is what feature 16's activity feed wants.
- **`matched_skills` is filtered back down to skills the profile actually lists**, compared on
  letters and digits only so "Node.js" matches "nodejs". It is rendered as the candidate's own claim,
  so it gets the feature 08 treatment: the model judges, the row supplies the facts. `missing_skills`
  is a claim about the *job* and passes through unfiltered — there is nothing to check it against.
- **Country is detected from explicit country names only.** Never from a city, and never from the
  bare code `ca` — that is how half the United States writes California. A wrong country is not an
  error Adzuna reports; it silently returns nothing.
- **The banner sentence was reworded.** The design's "Found 8 jobs and saved 4 strong matches" reads
  as though only the strong ones were kept, but `project-overview.md` requires every job visible
  regardless of score and all of them are saved. Now "Found 8 jobs — 4 are strong matches", with
  singular, zero-strong and zero-result forms.
- **`agent/logs.ts` added; `agent/extractor.ts` removed from the architecture listing.**
  `code-standards.md` and `library-docs.md` both call `logAgentError` without saying where it lives,
  and feature 13 needs the same helper. `extractor.ts` was listed for "job description extraction +
  structuring", which the decision above means nothing will ever call.
- **Agent functions take the InsForge client as a parameter** rather than calling
  `createInsforgeServer()` themselves — one run makes five or six writes and they all belong to the
  same request. `InsforgeServerClient` is now exported from `lib/insforge-server.ts`.
- **No new PostHog event.** `job_search_started` (client, on submit) and `job_found` (server, one per
  saved job, inside `after()` with `Promise.all`) were both already on the approved list. It stays
  at seven.

Found while building:

- **`contract_time`, not `contract_type`, carries full-time/part-time.** `library-docs.md` mapped
  `job_type` from `contract_type`, which was present on 1 of 10 live results while `contract_time`
  was present on 6. Nearly every job would have fallen through to the `|| "fulltime"` default. Now
  `contract_time` first, `contract_type` second, and **null** when neither is stated — defaulting an
  unknown listing to "fulltime" is inventing a term of employment. **Fifth package or API in four
  features whose real shape did not match the docs.**
- **The snippet is 500 characters, not ~200**, and every one of the ten truncated mid-sentence with
  a `…`. The scoring prompt says so on the description itself rather than in the shared rules — the
  feature 08 lesson that a rule attached to the item it governs beats the same rule stated once at
  the top.
- **`salary_min` and `salary_max` are frequently identical**, because Adzuna predicts a salary when
  the listing does not state one. A naive range renders "£70k - £70k"; an equal pair now collapses to
  a single figure.
- **An App Router folder starting with `_` is a private folder and is never routed.** The temporary
  verification route was first written to `app/api/__probe/` and 404'd until it was renamed. Worth
  knowing before blaming the dev server.

**Verified by execution:** a temporary route (since deleted, confirmed 404) ran the real client,
prompt and schema against the live Adzuna API and GPT-4o. Ten London listings parsed; salary rendered
`£70k` for an equal predicted pair and `£80k - £95k` for a real range; `job_type` was `fulltime`
where `contract_time` said so and null otherwise. Three were scored — 65 for a Java-heavy role
against a React profile, 95 for a React/Next/GraphQL role, 85 for a founding role with an AI-security
gap — and every `matchedSkills` entry was genuinely on the fixture profile while `missingSkills`
named "Java", "open-source" and "AI security", none of which are. Country detection returned `us` for
"San Francisco, CA", `gb` for "London, UK" and "Manchester, England", `ca` for "Toronto, Canada",
`au` for "Sydney, Australia", and `us` for "Remote" and "". All five banner sentences rendered.
`parseJobList` kept the one good row of three and dropped a row missing its title and a bare string.
`tsc`, lint and build clean, every route `ƒ`, `/api/agent/find` registered, and anonymous
`POST /api/agent/find` 307s to `/login`.

**Browser pass, 2026-08-02 — the whole path ran for real.** One search, "Backend Developer" in
"India", read back from the live database afterwards. Everything the temporary route could not reach
is now exercised:

- **`agent_runs` opened and closed correctly.** One row, `status: completed`, `jobs_found: 10`,
  `started_at` 07:33:50.195 → `completed_at` 07:33:54.957. **4.8 seconds end to end** for an Adzuna
  call plus ten GPT-4o scores — Adzuna took 1.85s and the ten concurrent scores plus the upsert took
  the remaining 2.9s. Sequential scoring would have been 30-40s, so the `Promise.allSettled` decision
  paid for itself on the first run.
- **The upsert worked through the SDK**, which the raw-SQL check could not prove. All ten rows carry
  `source: 'search'`, a non-null `external_id` and a `run_id`.
- **The scope decision held in practice.** `about_role` is exactly 500 characters on all ten;
  `responsibilities`, `requirements`, `nice_to_have` and `benefits` are empty on all ten; no row has
  a `company_research` dossier.
- **`agent_logs` took both levels** — one `info` ("Adzuna returned 10 us listings") and one
  `success` ("Saved 10 jobs"). **No `warning` rows, so no score failed** and the skip-and-log path is
  still untested.
- **`matched_skills` held.** Every row carries 1-4 matched skills and 1-6 missing, and scores spread
  30-65 for a frontend profile against backend roles — which is the correct answer, not a flat one.
- **`job_type` is null on all ten**, because no US listing in this result set carried `contract_time`
  or `contract_type`. The "never default to fulltime" decision is what kept that honest.

**The run also exposed a defect — see Notes.** The search said "India" and returned Indianapolis.

### Feature 11 — Filter + Sort + Pagination

No new components and almost no new markup: feature 09 wrote the option values as the filter and
sort keys precisely so this feature would only add behaviour.

Decisions:

- **All four controls live in the URL, not in component state.** `?q=&match=&sort=&page=`, parsed by
  `parseJobQuery` and read by `fetchJobPage`, both in `lib/jobs.ts`. This keeps the read in the
  Server Component that renders the page — `code-standards.md` forbids fetching in a Client
  Component — and it makes a refresh, the back button and a shared link all reproduce the same list.
  The alternative, holding filter state in `JobFilters` and fetching from the client, would have put
  a second copy of the query in the browser for the server's copy to drift from.
- **Every sort ends with `id`, and it is not decoration.** `found_at` defaults to `now()`, which is
  *transaction* time: **all ten rows of one discovery run carry the same millisecond** — confirmed
  against the live table, two runs, two timestamps, ten rows each. `match_score` ties are just as
  common (4 rows at 40, 3 at 30 in the first run). Sorting on either column alone is not a total
  order, so Postgres may break ties differently per request and a paged read shows one row on two
  pages and another on none.
- **Filter text is double-quoted before it reaches PostgREST's `or()`.** PostgREST parses that
  argument itself, so an unquoted comma, dot or parenthesis is read as syntax and fails the entire
  request — and the page treats a read failure as fatal, so it would have been a blank page rather
  than a bad result. This is not hypothetical: this user's own rows include a company called
  **"SimVentions, Inc - Glassdoor ✪ 4.6"**, so typing its name would have taken the page down.
- **The default sort is Match Score**, which is what the select has displayed since feature 09.
  Feature 10's plain read was newest-first, so the visible ordering changes with this feature. A
  default the control does not show is a control that lies on first load.
- **A `?page=` past the end is clamped, not rendered empty.** One extra round trip in a rare case,
  and only when the first read came back empty against a non-zero total. The resolved page — not the
  requested one — is what the controls are given, so the URL and the rows cannot disagree.
- **The empty state has two sentences now.** "No jobs yet, go and search" is the wrong thing to tell
  someone whose jobs a filter is hiding, so `JobsTable` takes `filtered` and swaps the copy. No CTA:
  the filter bar is directly above it and is itself the way out.
- **The two selects are controlled; the text input is not.** A controlled `<select>` re-renders in
  place and stays in step with the URL for free. The text input keeps `defaultValue` and is never
  re-seeded — its 300ms debounced `replace` lands while the user is still typing, so a value fed back
  from the server would race the keyboard and drop characters.
- **Filters `replace`, pagination `push`es.** A history entry per keystroke turns the back button
  into a way to un-type; moving between pages is a step a user does expect to walk back.
- **`pageSize` stopped being a prop.** `JobsPagination` imports `JOBS_PAGE_SIZE` from `lib/jobs.ts`,
  the same constant the read pages on — a passed page size can disagree with the one the query used.
- **No new PostHog event.** Still seven.

Found while building:

- **A `PostgrestError` logs as `{}`.** `console.error("[lib/jobs] …", error)` rendered as literally
  `{}` in `.next/dev/logs/next-development.log`, so a read failure told whoever read the log nothing
  at all — despite the object carrying `code`, `details`, `hint` and `message`. The call site now
  logs `error.code` and `error.message` by name. Worth remembering before trusting any log line that
  prints a whole SDK error object.
- **The `jobs` table gained ten rows mid-session** — a second browser search at 07:50:29Z, a
  different location, so it inserted rather than deduped. The re-run/dedupe test is *still* not done.

**Verified by execution:** a temporary route (since deleted, confirmed 404).

- `parseJobQuery` over eight inputs: empty params → all defaults; `"  Stripe  "` trimmed; unknown
  `match`/`sort` values fell back to `all`/`score` rather than reaching PostgREST; `page` of `0`,
  `-4` and `abc` all became 1, `"2.7"` became 2; a repeated `?q=` took the first value; a 140-char
  filter was cut to 100.
- `jobsHref` round trip: all-defaults → bare `/find-jobs`, page-only → `?page=4`, everything set →
  `?q=acme+corp&match=low&sort=newest&page=2`, and `a&b=c?d#e` → `?q=a%26b%3Dc%3Fd%23e`.
- **The `or()` quoting, with a negative control.** Six filter strings — plain, `Smith, Jones`,
  `say "hi"`, `back\slash`, `a.b(c)` and `or(1.eq.1)` — every one reached PostgREST and came back
  `42501 permission denied` (the anonymous caller's expected refusal), which means the filter
  *parsed*. The same text sent **unquoted** came back `PGRST100 failed to parse logic tree`. So the
  test discriminates, and the quoting is what makes the difference.
- **SQL semantics against the live 20 rows:** `ILIKE '%oracle%'` and `ILIKE '%ORACLE%'` both match 7
  — case-insensitivity on a pattern that matches a subset, not everything; the comma-bearing company
  name matches 10; `match_score >= 70` is 0 rows and `< 70` is 20, so High Match currently renders
  the filtered empty state and Low Match renders everything.
- `npx tsc --noEmit`, `npm run lint` and `npm run build` all clean, every route still `ƒ`.

**Not verified — nothing here has rendered for a signed-in user.** The whole feature is unexercised
in a browser: every control, the debounce, the clamp, both empty states, and `Link` navigation
between pages. **Pagination cannot be exercised by the current data at all** — 20 rows at 20 per page
is exactly one page, so the buttons are all in their disabled/single-page state until a 21st row
exists.

### Feature 12 — Job Details Page (Full UI)

Five components under `components/job-details/`, matching `architecture.md`'s listing name for name,
plus `app/find-jobs/[id]/page.tsx` and `fetchJob` in `lib/jobs.ts`. Built against
`context/designs/job-details.png`.

Decisions:

- **Real data on arrival, not mock data.** `build-plan.md` scopes feature 12 as "Full UI" but says to
  wire the job info and match sections immediately, because Phase 3 already put the rows in the
  database. Only Company Research is a placeholder, and only because feature 13 is what fills it.
- **`company_research` is not selected by the read.** The card renders the empty state and nothing
  else, so selecting the column would leave a card that says "No research yet" over a dossier that
  exists. Feature 13 adds the column, the dossier markup and the button's handler together.
- **The Research Company button is inert.** Same split feature 09 made across the whole Find Jobs
  page: the full-UI feature draws the control, the next feature wires it. Documented here rather than
  disabled, because the design draws it active and the empty-state copy tells the user to click it.
- **The match badge is not the match bar.** `matchBadge()` was added to `lib/utils.ts` beside
  `matchScoreFill()`. The badge keys on `MATCH_THRESHOLD` (70) and the bar on the design's 90/80
  bands, which is why the design draws an 85% badge green while the same 85 paints a blue bar. Two
  different questions — "did it clear the bar" and "where in the range does it sit" — and collapsing
  them would make one of the two wrong. Verified: 69 → grey, 70 → green.
- **An absent fact renders as `—` plus an `sr-only` "Not stated".** The design draws the em dash and
  every live row has a null `job_type`, so this branch is the common case, not the edge one. An em
  dash alone is announced as "em dash".
- **Every section of the page is conditional.** No reasoning → no reasoning card; no skills → no
  skills card; nothing in any description column → no description card at all. Feature 10 warned this
  page would look thinner than the design, and the honest way to be thinner is to render less rather
  than to render empty headings.
- **Missing skills are purple, not red.** `build-plan.md` feature 12 says "red/orange badges";
  `ui-tokens.md`'s Skills Badges table says `bg-accent-muted` / `text-accent` and the design draws
  purple. Two sources against one, and the semantic argument agrees: a gap skill is what feature 13
  turns into a strategy, not an error.
- **`max-w-4xl`, following `/profile`.** A details page is a reading column. `/find-jobs` keeps the
  full 1440px because a table is scanned across.
- **The row link is one link, not five.** A `<tr>` cannot wrap an `<a>`, so the company name is the
  link and a pseudo-element stretches it over the row. Killing the outline meant replacing it: the
  focus ring moved onto the pseudo-element, because `focus-within:bg-surface-secondary` is a 1.04:1
  change and is not a focus indicator.
- **A malformed id is a 404, not an error page.** PostgREST answers a non-uuid with `22P02`, which
  arrives as a read failure and would render the error boundary for a hand-typed URL. `fetchJob`
  shape-checks the id before querying. A *missing* row returns null → `notFound()`; a read failure or
  an unreadable row throws, because "this job does not exist" is a different statement from "the
  database is broken" and sending someone back to a list still showing the row they clicked is worse
  than an error.
- **No new PostHog event.** Still seven.

Found while building:

- **The design cannot be reproduced by the current data, and that is the data's fault, not the
  page's.** The design draws an 85% green badge, "Newark, Ess…", a salary range and "1 hour ago". The
  live table's top score is **65**, so *every* job renders the grey Low Match badge; `job_type` is
  null on all 20 rows, so the Job Type card always shows `—`; and `salary_min == salary_max` on these
  rows so every salary is a single figure. Everything the design shows is reachable — none of it is
  reachable *today*.
- **`sr-only` and the pseudo-element classes had to be confirmed in the emitted CSS**, not assumed.
  A first grep said `before:content-['']` and `focus-visible:before:ring-accent` were missing; the
  grep pattern was wrong, not the CSS — Tailwind escapes the colons, so the selector is
  `.before\:content-\[\'\'\]`. All ten new selectors are present. Worth remembering before concluding
  Tailwind dropped a class.

**Verified by execution:** two temporary routes (since deleted, both confirmed 404).

- **The parse path, against a row copied verbatim out of the live table** with `row_to_json` —
  including the company named "SimVentions, Inc - Glassdoor ✪ 4.6". Seven shapes: the real row parses;
  `responsibilities: null` and `matched_skills: null` degrade to `[]`; `about_company: undefined` and
  `salary: undefined` degrade to `null`; extra keys (`run_id`, `company_research`) are stripped; and
  `title: null`, `match_score: "60"` and a bare string are each **rejected**, which is the point — a
  job with no title or no score has nothing worth rendering.
- **The id guard, with a discriminating negative control.** `nope`, `1' OR '1'='1`, `" "` and a
  truncated uuid all returned `null (404)` **without touching the database**. Two well-formed uuids
  did reach PostgREST and came back `42501 permission denied` — the anonymous caller's expected
  refusal, which proves the query parsed. An earlier run of the same probe passed a non-uuid
  `user_id` and produced `22P02 invalid input syntax for type uuid`, which is exactly the failure the
  guard exists to prevent on the id.
- **`matchBadge`:** 69 → `bg-surface-secondary text-text-secondary`, 70 and 85 →
  `bg-success-lightest text-success-foreground`. **`formatJobType`:** `fulltime` → "Full-time",
  `parttime` → "Part-time", `contract` → "Contract", an unknown value title-cases rather than
  disappearing, and `""` / `null` both return null so the caller draws the em dash.
- **The rendered markup, over three job shapes.** A real row (65, null job type, empty description
  arrays) drew the grey badge, one `—` with its `sr-only` "Not stated", three skill chips and a
  description card carrying only `about_role` — no bullet headings. A rich row (85, `fulltime`, all
  four arrays filled) drew the green badge, "Full-time" and all four sections. A bare row (no reason,
  no skills, no description, no URLs) drew **no** reasoning card, **no** skills card, **no**
  description card and **no** View Job Post link, and Apply Now rendered as a disabled `<button>` with
  its muted reason instead of an `<a>`.
- **The table rows:** `<tr class="relative …">`, exactly **one** `<a>` per row, `href` correct, and an
  accessible name of "Company — Title".
- **The emitted CSS** contains all ten new selectors, including `.sr-only`,
  `.before\:content-\[\'\'\]`, the three `focus-visible\:before\:ring-*` rules, `bg-info-lightest`
  and `text-info-foreground`.
- `npx tsc --noEmit`, `npm run lint` and `npm run build` all clean, every route `ƒ`,
  `/find-jobs/[id]` registered, and both it and `/find-jobs/nope` 307 to `/login` while signed out.

**Not verified — nothing here has rendered for a signed-in user.** Unexercised: clicking a real row
through to the page, the back link, View Job Post and Apply Now actually opening Adzuna, the 404 for
a valid-but-absent uuid (anonymous callers cannot get past the privilege layer to reach it), the
responsive stacking of the header row and the fact grid, and the keyboard focus ring on a table row.

### Feature 12 — issues found by `/review` and fixed

Nine findings across the three layers; all resolved in the same session.

- **Critical — `notFound()` had nowhere to land.** There was no `not-found.tsx` anywhere in the app,
  so a missing or non-uuid job id rendered Next's bare default 404: no `AppNavbar`, no way back into
  the app. That is the exact defect `architecture.md` made an invariant after `/dashboard` shipped
  without navigation and stranded signed-in users — and feature 12 introduced the app's first
  `notFound()` call without the boundary it needs. Added `app/find-jobs/[id]/not-found.tsx`. It takes
  no props (Next's contract), so it reads the session itself with `getSessionUser()`; `cache()` makes
  that free on a request that already resolved the user.
- **Critical — the crash was environmental, and it was self-inflicted.** Clicking a row killed the
  dev server's render worker (`Jest worker encountered 2 child process exceptions`), twice, with no
  application error logged. Cause: `npm run build` was run three times **while the dev server was
  live**, rewriting `.next/server`, `.next/static` and `BUILD_ID` underneath it. `/find-jobs/[id]`
  was the first route that server had never compiled, so it was the first to go looking for chunks
  the production build had replaced. Fixed by stopping the server, deleting `.next` and restarting.
  **Never run `next build` against a `.next` that a running `next dev` owns.**
- **Important — the visual score indicator was missing.** `project-overview.md` asks the match
  section for a score number *and* a visual indicator; the design draws only the badge, and the two
  had been reconciled silently in favour of the design. The bar now sits under the badge in
  `JobInfo`, reusing feature 09's `matchScoreFill()` so this page and the jobs table can never colour
  the same score differently. Verified: 65 → `bg-warning`, 85 → `bg-info`, 95 → `bg-success`.
- **Important — the AI Match Reasoning icon failed the graphical contrast floor.** `text-success`
  (#10B981) on `bg-success-lightest` (#ECFDF5) is **2.4:1**, under 3:1. Now
  `text-success-foreground` (#007A55) at 5.4:1 — `ui-tokens.md`'s own rule, third time this project
  has hit it. **A fill colour is not the colour that goes on top of it.**
- **Important — twenty rows meant twenty prefetched server renders.** `<Link>` on each table row
  prefetches `/find-jobs/[id]`, a protected dynamic route, so scrolling the list could fire twenty
  `requireUser()` calls and twenty job reads. Rows now carry `prefetch={false}`, and
  `app/find-jobs/[id]/loading.tsx` keeps the click feeling immediate without them.
- **Important — `source_url` and `external_apply_url` reached `href` unvalidated.** `lib/adzuna.ts`
  checks `redirect_url` only for non-emptiness, so any string Adzuna sends became a clickable link.
  `safeExternalUrl()` in `lib/utils.ts` now gates both at the parse boundary in `JobDetailSchema`, so
  `JobDetail` carries only http/https URLs and no consumer has to remember. Verified against
  `javascript:` (plain, mixed-case and space-prefixed), `data:`, `vbscript:`, `file:`,
  protocol-relative, relative, garbage, empty and null — all null; http and https pass through
  verbatim with query strings intact.
- **Minor — gap-skill chips were 4.2:1.** `text-accent` (#7C5CFC) on `bg-accent-muted` (#FAF5FF) is
  under the 4.5:1 floor for the 12px text these chips use. Now `text-accent-dark` (#5E4CFF) at
  5.0:1, no new token needed. `ui-tokens.md`'s Skills Badges table corrected. The job-type fact chip
  keeps `text-accent` — it is an icon, and 4.2:1 clears the 3:1 graphical floor.
  **`DossierPreview` still has the old pairing at 14px; left alone as out of scope.**
- **Minor — no loading boundary.** `loading.tsx` added, which costs the route its hard 404 (a
  streamed response has already sent its headers, so `notFound()` returns 200 with
  `robots: noindex`). Free here — the route is behind auth and nothing crawls it.
- **Minor — `source` is not rendered on the details page**, though `project-overview.md` lists it.
  Closed without a change: same reasoning feature 09 documented for the SOURCE column — `jobs.source`
  is `'search' | 'url'`, discovery is Adzuna-only, and URL import is out of scope, so the field can
  only ever show one value. Recorded here rather than left implicit.

**Verified after the fixes:** `npx tsc --noEmit`, `npm run lint` and `npm run build` all clean, every
route `ƒ`. A fresh dev server on a clean `.next` serves `/login` 200 and 307s `/find-jobs`,
`/find-jobs/<uuid>` and `/find-jobs/nope` to `/login`, with **zero** worker crashes. Both temporary
verification routes deleted and confirmed 404.

**Still not verified: the page has never rendered for a signed-in user.** The crash is explained and
the server is healthy, but that is not the same as the route being proven — a browser pass is still
what closes features 11 and 12.

---

### Feature 13 — Company Research Agent

The Research Company button feature 12 shipped inert now runs, and the same run backfills the job
description. One click, one job, one Browserbase session.

**Built**

- `app/api/agent/research/route.ts` — POST `{ jobId }`. Auth, uuid check, the job read scoped to the
  caller, the same completeness gate `/api/agent/find` applies, then the run. Exports
  `maxDuration = 300`.
- `agent/research.ts` — the orchestrator. Resolve → backfill → browse → synthesise → save.
- `agent/posting.ts` — follows the Adzuna redirect. Produces both the employer homepage URL and the
  posting HTML the backfill reads. Also `rootDomain`, `homepageFor`, `htmlToText`, `extractPosting`.
- `agent/browsing.ts` — the Stagehand phase. Homepage extract, sub-page ranking, up to three visits.
- `agent/synthesis.ts` — GPT-4o dossier from research + job + profile.
- `lib/browserbase.ts`, `lib/stagehand.ts` — session creation and client init. Both return `null`
  rather than throwing.
- `lib/dossier.ts` — the dossier zod schema, used on write *and* on read.
- `components/job-details/CompanyResearch.tsx` rewritten to render the nine-field dossier;
  `ResearchButton.tsx` is the new and only client boundary on the page.
- `lib/jobs.ts` gained `company_research` in both the select and `JobDetailSchema`; `types/index.ts`
  gained `CompanyDossier`.
- Corrected in `library-docs.md` and `architecture.md`: the Stagehand API, the `maxDuration` advice,
  and the synthesis token budget. All three are recorded below.

**Decisions**

- **Every phase before the synthesis may fail without ending the run.** The deliverable is a
  dossier; GPT-4o can write one from the job and the profile alone. Only a missing or unsaveable
  dossier is a failure the user hears about.
- **The homepage comes from the redirect, and the ATS domains are refused.** `boards.greenhouse.io`
  stripped to its root domain is Greenhouse — the browser would research the ATS vendor and report
  its culture as the employer's. `NOT_THE_EMPLOYER` in `agent/posting.ts` sends those to the
  company-name guess instead, which is wrong less often.
- **The backfill shares the dossier's fetch.** The redirect hop has to happen anyway to find the
  employer; the posting body is on the page it lands on. No second scraper.
- **The truncation note in `JobDescription` was kept, not deleted.** `build-plan.md` said to delete
  it in the change that fills the column. It keys on the ellipsis rather than on a feature flag, so
  a successful backfill removes it by itself and a failed one leaves it true. Deleting it would have
  lied on every job the backfill cannot reach. Verified both directions.
- **`sources` is set from the pages actually visited, never asked of the model.** A model asked to
  name its sources produces plausible URLs, and these render as links.
- **The dossier is parsed on read as well as on write.** `jsonb` is unchecked by Postgres, so the
  column is exactly as untrusted as the model response was.
- No new PostHog event. `company_researched` was already in `code-standards.md`; it now fires.

**Verified by execution** — 32 checks over the pure logic, all passing:

- `rootDomain` across plain, `www`, deep-subdomain, `.co.uk` and `.com.au` hosts, plus a bare label.
- `homepageFor` with an employer domain, Greenhouse, Workday, Adzuna itself, no landed URL at all,
  and an unusable company name.
- `htmlToText` dropping script contents, resolving entities, and — after a fix this pass — not
  leaving every paragraph indented by one space.
- `parseDossier` over a clean dossier, `null`, `undefined`, a bare string, an array, `{}`, an
  all-empty dossier, and a drifted one where a string arrived where an array belonged. Each drifted
  field degrades alone; the good fields survive. A `javascript:` URL in `sources` is dropped and a
  duplicate collapsed.
- `fetchJob` over an untouched row, a researched-and-backfilled row, junk jsonb and a string in the
  jsonb column. Confirms `company_research` is in the select, survives the parse, and that
  `isTruncatedDescription` is `true` before the backfill and `false` after.

`npx tsc --noEmit`, `npm run lint` and `npm run build` all clean; `/api/agent/research` registered.

**Not verified — the whole run has never executed.** No Browserbase session has ever been created
from this codebase, so the browser phase, the extraction schemas, the synthesis prompt, the dossier
card's rendering and the `company_researched` event are all unexercised. One real click is what
closes this feature, and it costs a Browserbase session plus two GPT-4o calls.

---

### Feature 13 — issues found by `/review` and fixed

Nine, all closed in the same pass. Three of them are rules, not patches.

- **The company-name fallback mangled ordinary names.** The suffix regex was unanchored with a `\s*`
  that matches nothing, so `co\.?\b` matched *inside* a name and took everything after it: **Cisco
  Systems → `cis.com`, Costco Wholesale → `cost.com`, Tesco PLC → `tes.com`, Nordco Industries →
  `nord.com`.** Every one is a real domain, so the browser would have researched a different company
  and reported it as the employer, with `sources` linking to it — the same failure
  `NOT_THE_EMPLOYER` exists to prevent, arriving from the other direction. The separator is now
  required and the match anchored to the end, and it loops for "Acme Holdings Pty Ltd". Caught by
  running the function over a list of real names, not by reading it.
- **SSRF through `jobs.source_url`.** The redirect-follow fetched a DB column server-side with
  `redirect: "follow"`, and `safeExternalUrl` checks only the scheme. The `jobs_owner` policy is
  `ALL`, so any signed-in user could insert a row pointing at `169.254.169.254` or a loopback port,
  click Research, and have the response structured by GPT-4o and rendered back to them. New in
  feature 13 — feature 10 never fetched this column. `lib/safe-fetch.ts` now resolves the hostname
  and refuses loopback, link-local, RFC 1918, CGNAT and IPv4-mapped-IPv6, **re-checking every
  redirect hop** because passing the first host check says nothing about where a 302 points. Now an
  `architecture.md` invariant.
- **A Browserbase session leaked whenever Stagehand failed to init.** `stagehand.close()` releases
  the session it owns — but on a failed init there is no client to close, and the session held the
  free plan's only slot for its full 120 seconds. The next click would find the browser unavailable
  for a reason nothing logs. `releaseSession()` sends `REQUEST_RELEASE` on that path only.
- **A refresh could cost the user what the first run bought.** A second run whose browser failed
  would overwrite a researched dossier with one inferred from the posting. Now: the backfill only
  writes a column that is currently empty or still holds the snippet, and a browsed dossier
  (`sources` non-empty) is never replaced by a synthesis-only one. **A re-run can only add.**
- **An all-empty dossier reported as a failure.** `parseDossier` answered `null` for both "not a
  dossier" and "a dossier that says nothing", so a run that worked told the user it had failed.
  `readDossier` now returns three outcomes and the user gets "found too little about this company"
  instead of "could not research".
- **The browser phase had no overall bound.** Four visits at the per-step limits could run past two
  minutes — longer than the Browserbase session itself. `BROWSE_BUDGET_MS` stops visiting sub-pages
  once spent; what was gathered still goes to synthesis.
- **`maxDuration = 300` is a ceiling the host may not honour.** Vercel Hobby caps at 60s. Documented
  at the export, with the supported fallback: leave `BROWSERBASE_*` unset and every run synthesises
  from the posting and profile alone.
- Two style fixes: `z.uuid()` for the Zod 4 form, and `DossierSection` extracted to its own file
  under the one-component-per-file rule, using `cn()` rather than bare ternaries.

**Verified by execution** — 40 checks, all passing, plus a positive control:

- The six names the old regex mangled now resolve correctly, and the suffixes that *should* strip
  still do (`Marlabs LLC`, `Stripe Inc.`, `Wipro Limited`, `Acme Holdings Pty Ltd`). "Pty Digital"
  keeps its name instead of returning null.
- `safeFetchExternal` refuses all 14 of: the metadata endpoint, loopback v4 and v6, localhost by
  name, three RFC 1918 ranges, CGNAT, IPv4-mapped IPv6, a bare hostname, `.internal`, `.local`,
  `file:` and `javascript:`.
- **Positive control:** `https://example.com` and a live `http://github.com` redirect chain both
  still fetch and return 200. Every other check asserts a refusal, and a guard that refused
  everything would have passed all of them.
- `readDossier` returns the right one of three outcomes across five shapes; `wasBrowsed` separates a
  browsed dossier from a synthesis-only one.

`npx tsc --noEmit`, `npm run lint` and `npm run build` all clean afterwards.

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._

- **Never run `next build` while `next dev` is running.** They share `.next`, and the build rewrites
  `.next/server`, `.next/static` and `BUILD_ID` underneath the live server. The dev worker then dies
  with `Jest worker encountered N child process exceptions, exceeding retry limit` — a process-level
  crash with **no application error logged**, which makes it look like a bug in whatever route was
  requested. It bites hardest on a route the dev server has not compiled yet. Stop the server first,
  or accept that `.next` must be deleted and the server restarted afterwards.
- **The dev log prints 12-hour time with no AM/PM.** A log entry reading `02:13` is 14:13. This
  matters when correlating log timestamps against file mtimes — it cost real time during the feature
  12 review before the offset was spotted.

- **The job details page cannot look like its design until the data improves.** Top `match_score` is
  65, so the header badge is grey on every job; `job_type` is null on all 20 rows, so the Job Type
  card always reads `—`; and the four description arrays are empty by design (feature 10), so the
  Job Description card is a single paragraph. All three are honest renderings of real rows — do not
  "fix" the page to match the picture.

- **OPEN DEFECT — an unsupported country returns confidently wrong results.** The first real search
  was "Backend Developer" in **India** and it saved ten jobs in **Indianapolis**. `detectCountry`
  only knows `us` / `gb` / `au` / `ca`, so "India" fell through to the `us` default, and Adzuna's
  `where=India` then fuzzy-matched Indiana. This is worse than the failure mode the design guarded
  against: the plan reasoned that a wrong country "silently returns nothing", but it can also return
  a full page of plausible, wrong-continent results that the user has no way to identify as wrong.
  Two things to weigh — **add `in` (and the other Adzuna markets) to `ADZUNA_COUNTRIES`**, and
  **surface the market that was actually searched** in the result banner, since the `agent_logs` row
  already records it ("Adzuna returned 10 **us** listings"). ~~Fix before feature 11.~~ **Not fixed;
  feature 11 shipped without it.** Feature 11 does not depend on it — filtering and sorting do not
  care where a row came from — but this is now the oldest open item, and a second search has since
  added ten more US rows on top of the ten Indianapolis ones.
- **Feature 10's re-run behaviour is still unverified.** Two runs have now happened, but they were
  different searches — the second returned Virginia listings, so it inserted ten new rows rather than
  refreshing the first ten. The dedupe path has still never executed. Row count
  must not change on a repeat, `found_at` must not move, `run_id` must move to the new run, and a
  `company_research` value set by hand must survive. That is the entire dedupe design, and the one
  part of feature 10 the browser pass did not reach.
- **Feature 10 — still unexercised after the browser pass:** the completeness gate and its muted
  reason (the profile was already complete when the run happened), the error banner, the zero-result
  sentence, Enter-to-submit, and the skip-and-log path for a failed score, which needs a scoring
  failure that has not occurred yet. `job_found` fired ten times but has never been confirmed
  arriving — it goes through `posthog-node` and never appears in the browser log, so it needs
  PostHog's Activity view.
- **Historical, features 09–10 only — every control on the page is wired now.** Feature 09 shipped
  the filter input, both selects and the pagination buttons inert; feature 10 wired Find Jobs and
  deleted `mockJobs()`; feature 11 wired the remaining five; feature 12 added the row `href`.
  **Nothing on `/find-jobs` is a placeholder any more.**
- **Feature 11 has not run in a browser.** Every control, the 300ms debounce, the page clamp, both
  empty-state sentences and `Link` navigation are unexercised. **Pagination cannot be exercised by
  the current data** — 20 rows at 20 per page is exactly one page, so a 21st row is needed before
  Previous/Next/page-numbers leave their single-page state.
- **Feature 09's responsive behaviour has still not been looked at.** Unexercised: the horizontal
  scroll under 720px, the responsive stacking of the search row and the filter bar, the row hover,
  select focus rings, and how the table reads on a phone.

- **Feature 08 has not run in a browser, and has never run against a real profile row.** Everything
  verified above went through a fixture in a temporary route. Unexercised: the confirm step, the two
  disabled states and their reasons, the success banner, `router.refresh()` bringing up
  `ResumePreview` for a user whose first resume is a generated one, and the whole thing reading an
  actual `profiles` row. Also unexercised: the per-index bullet fallback, which needs a response
  carrying fewer roles than were sent.
- **The first real click of Generate destroys the uploaded resume feature 07 extracts from.** One
  key, one resume, no undo. Re-upload a copy afterwards if the original is worth keeping.
- **Historical, feature 05 only — all three are wired now.** As delivered, feature 05 shipped "Save
  Profile" with an `onSubmit` that called `preventDefault`, "Generate Resume from Profile" with no
  handler, and a resume file held in state and never uploaded. Features 06 and 08 wired all three;
  `mockProfile()` was deleted in feature 06. The one behaviour that survives: the completion ring
  reads the *saved* profile, not live form state, so it does not move while typing.
- **Verified for feature 05:** `npx tsc --noEmit`, `npm run lint` and `npm run build` all clean;
  every route still `ƒ`. `/profile` still 307s to `/login` while signed out. The rendered markup was
  checked through a temporary unauthenticated preview route (since deleted): 70% ring with the three
  expected missing-field tags, all five sections, and the generated CSS actually contains
  `text-error-dark`, `stroke-error/15`, `bg-error/10` and `accent-accent` rather than dropping them.
  The browser pass below then exercised the checkbox and both halves of the tag input. **Add role and
  the drag-and-drop upload are still unexercised.**
- **Session replay is on, and is now explicitly configured.** It comes from
  `defaults: "2026-01-30"` in `instrumentation-client.ts`; the browser pass produced 49 `$snapshot`
  events. Feature 06 settled it: replay stays on for layout and rage-click debugging, with
  `session_recording: { maskAllInputs: true }` set explicitly. posthog-js already masks input values
  by default, so this closed no live leak — it turns an undocumented library default into a
  version-controlled guarantee on a form that now holds real PII. **Not verified in a browser** —
  confirm masking in an actual recording once one exists.
- **Feature 06 has not run in a browser at all.** Everything below is unexercised: the first save
  creating a row, pre-fill on return, the ring moving off mock data, the comma-separated fields
  becoming `text[]`, `profile_completed` firing exactly once, and the whole resume round-trip
  (upload → `resume_path` → View → Replace). Server-side upload rejection is also untested — `curl -F`
  a non-PDF and a >5MB file straight at `/api/resume` to bypass the client checks, which are cosmetic.
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
  coexist. (The last three were re-verified in feature 10 against the **non-partial** index.)
  **The tables are no longer empty** — as of feature 11 they hold 1 profile, **2** `agent_runs` rows
  and **20** jobs, all belonging to the single existing user. Two discovery runs, ten rows each,
  neither of them a repeat of the other.
  **Not verified: that user A cannot read user B's rows.** That is the one property RLS exists for,
  and it needs a real user JWT. Both MCP `run-raw-sql` and CLI `db query` run as `project_admin` and
  refuse `SET ROLE`, so neither can prove it. There is currently only one user in `auth.users`.
  Test it the moment a second signed-in session exists.
- **Browser pass, 2026-08-01 — features 02, 03 and 05 exercised end to end.** Read from PostHog's
  browser debug output in `.next/dev/logs/next-development.log`. Two full sign-in cycles, both
  **GitHub** — the first time that provider has ever run. Confirmed:
  - Route trail `/login → /dashboard → /profile → /find-jobs → /`. Both routes that were
    unreachable before the navigation fix were reached from inside the app.
  - `oauth_sign_in_started` × 2, each carrying `provider: "github"`.
  - `$identify` × 2, each with a different `$anon_distinct_id` (`019fbbbd-d472…`, `019fbbbe-500f…`)
    resolving to the same identified id — the anonymous→identified merge works, so the
    `oauth_sign_in_started → user_signed_in` funnel is valid.
  - `user_signed_out` × 3 (three sign-outs against two sign-ins — the browser started signed in).
  - **Zero server-side errors** across the window: no `[proxy]`, `[api/auth/callback]`,
    `[actions/auth]` or `[lib/auth]` lines at all.
  - Feature 05 interactions, from autocapture: the "Currently working here" checkbox toggled
    (`attr__checked`), the tag **Add** button clicked ~5×, a chip's `×` clicked ~2×, one primary
    button clicked. **Add role and the drag-and-drop upload path left no distinguishable trace** —
    treat those two as still unexercised.

  Feature 02 was already covered by automated checks (all four protected routes 307 to `/login`
  signed out, both providers render, OAuth init returns a valid provider URL); the code exchange,
  cookie write, post-login redirect and sign-out have now run for real. Feature 03's client events
  are confirmed leaving the browser.

  **Still not verified after this pass:**
  - **Neither error boundary has ever rendered.** Zero `$exception` events. `app/error.tsx` and
    `app/global-error.tsx` remain untested — throw something on purpose once.
  - **Server-side `user_signed_in` has never been confirmed arriving.** It goes through
    `posthog-node`, so it never appears in the browser log. Needs PostHog's Activity view or a
    personal API key; the `phc_` token is write-only.
  - **Google OAuth has not run since the feature-03 fixes.** Both cycles here were GitHub.
  - **Cross-user RLS isolation is still unproven** — `auth.users` holds one user, and admin tooling
    refuses `SET ROLE`. Needs a genuine second signed-in account.

### Feature 14 — Dashboard Page (Full UI)

UI only, on mock data, exactly as the build plan scopes it. `/dashboard` was the last `ComingSoon`
stub; all three are now gone.

**Found while reading the plan, and it changed the feature:** two of the five surfaces build-plan 14
lists are from the cut feature set. The fourth stat card is **Jobs This Week**, not Cover Letters
Generated, and the third chart is **Company Research Activity**, not Resume Tailoring Activity — the
design draws both that way, feature 15 counts jobs in the last 7 days, feature 17 queries
`company_researched`, and cover letters and resume tailoring are both out of scope in
`project-overview.md`. Three sources against one stale line each. Same class of drift as feature 05's
Cover Letter Tone and feature 01's `agnet-log.png`. `build-plan.md` corrected.

Decisions:

- **No charting library, and recharts was not installed.** `build-plan.md` feature 17 names it and
  `code-standards.md` does not list it. All three charts are static — no tooltips, no legends, no
  brushing — and every recharts default (axis lines, tick styling, bar radius, grid stroke) would
  have had to be overridden to reach the design anyway, while making all three Client Components.
  `code-standards.md` asks "is there a simpler native solution" first; here it is markup plus one
  `<svg>`. Same call as feature 01 on `class-variance-authority` and feature 05 on the shadcn CLI.
  **Confirmed with the developer before building**, because feature 17 inherits it.
- **The geometry lives in `lib/charts.ts`, not in the components.** An axis ceiling and a Bézier
  control point are things that can be wrong in ways a screenshot does not reveal, so they are
  functions that can be run. The components only place what those return.
- **Whole-number data only gets whole-number ticks.** Every series on this dashboard counts things,
  and the first cut labelled a max of 3 as `0 / 0.75 / 1.5 / 2.25 / 3` — an axis offering ticks that
  cannot occur. Caught by running `chartScale` over a range of maxima rather than by looking at the
  three that happen to be in the design. Costs some headroom above the tallest bar; worst case across
  the ladder is 30%, at a maximum of 28.
- **Spline control points are clamped into the plot box.** A Catmull-Rom curve through a sharp peak
  overshoots, and an overshoot inside a `viewBox` does not curve out of frame — it clips flat against
  the edge, which reads as a rendering fault rather than as data.
- **`preserveAspectRatio="none"` plus `vector-effect="non-scaling-stroke"`** is what makes a
  hand-rolled line chart responsive without JavaScript: the 0-100 viewBox stretches to the card and
  the stroke stays an even 3px through it. Without the second attribute the line thins and its round
  caps go elliptical as the card widens.
- **The completion banner renders only when the profile is incomplete.** `CompletionIndicator` is
  reused from `components/profile/` unchanged — it takes plain props and computes nothing — so it is
  now shared by two pages.
- **Timestamps are stored as ISO instants and rendered with `formatRelativeTime()`**, the feature 09
  pattern: feature 16 changes the data source and no formatting.
- **The four mock functions are in `lib/dashboard.ts`, one per surface**, so features 15, 16 and 17
  each replace exactly one of them and touch no component.
- **Zero Client Components**, like feature 12's job details page. Every chart is markup and every
  value is server-rendered.
- **`AnalyticsCharts.tsx` was not built.** `architecture.md` listed it, but the design does not group
  the three charts — Company Research Activity sits beside Recent Activity and the other two are a
  row below — so a component wrapping all three would have to render two non-adjacent parts of the
  page. It is `ChartCard` + `BarChart` + `LineChart` instead, one component per file as
  `code-standards.md` requires. `architecture.md` corrected.
- **No new PostHog event.** The list stays at seven.

Found while building:

- **`ui-tokens.md`'s Activity Dots table and Dashboard Chart Colors table were both stale**, naming
  resume tailoring and cover letters. The chart table also listed raw hex for colours that all had
  exact tokens, under a document whose first invariant is never to use hex in a component. Both
  rewritten in tokens.
- **The design's activity dots do not encode anything.** Purple on rows 1 and 4, blue on row 2, green
  on rows 3 and 5 — across two entry types, in no consistent pattern, with purple being the
  out-of-scope tailoring colour. Built to `build-plan.md` feature 16's two-colour rule instead.

**Verified by execution:** 45 checks over `lib/charts.ts` (a temporary script, run under Node's
type stripping). The three series the design draws produce exactly the axes it draws — `0,3,6,9,12`
for the research bars and `0,25,50,75,100` for both 85-value charts. Across fourteen maxima from 1 to
4321 the ceiling is never below the maximum, there are always five ticks, the last tick is always the
ceiling and every tick is a whole number. Empty, all-zero and all-negative series return a drawable
axis rather than dividing by zero; `plotPercent` clamps negatives and survives a zero ceiling; the
line path starts at x=0 and ends at x=100, closes its area along the baseline, keeps every coordinate
inside the viewBox, and clamps a 0→100→0 spike instead of clipping it. One, two and zero-point series
all return something sane.

**Browser pass, 2026-08-03 — the page was rendered and read at three widths.** A temporary preview
route (since deleted, confirmed 404) rendered the components unauthenticated at 1470px, 834px and
414px. The layout matches the design at full width; the stats bar goes 4 → 2 → 1 and both chart rows
collapse to single column; the line chart's curve and stroke weight survive the width change, which
is the whole point of the non-scaling-stroke decision. **One real defect found and fixed:** the score
buckets ("50-60%") wrapped at their hyphen in the narrow card — `whitespace-nowrap` on the category
labels. Console clean, no errors or warnings. `tsc`, lint and build all clean, every route still `ƒ`,
and `/dashboard` still 307s to `/login` while signed out.

**Not verified:** the real `/dashboard` has not been opened in a signed-in browser, so the profile
read, the `AppNavbar` and the incomplete-profile banner in place have not been seen. The banner will
not render for this user in any case — the profile is complete, which is why searches have run.

### Feature 14 — issues found by `/review` and fixed

Six findings, all resolved in the same session. Two mattered.

- **Important — one non-finite value silently destroyed an entire chart.** `chartScale`,
  `plotPercent` and `smoothLinePath` all propagated `NaN` and `Infinity` straight through: the
  ceiling went `NaN`, all five ticks rendered the literal string "NaN", a bar's height became the
  invalid CSS `"NaN%"`, and the line's `d` attribute stopped parsing so the curve vanished
  completely. Nothing threw and nothing logged. **These three functions are the boundary feature 17
  feeds from PostHog**, which is external input, and the project's standing rule is to narrow at the
  boundary rather than trust the type — the same rule `parseProfile` and every GPT-4o zod schema
  exist for. `finiteSeries()` now coerces to zero and logs once per series; `plotPercent` guards both
  arguments; `smoothLinePath` returns null on a non-finite ceiling. **Found by probing the functions,
  not by reading them.**
- **Important — a negative trend rendered green.** `StatCard` hardcoded
  `bg-success-lightest text-success-darker` while the sign logic beside it
  (`stat.trend > 0 ? "+" : ""`) explicitly anticipated negatives — so the code handled the sign in one
  place and not the other. Feature 15 computes these from real week-on-week counts, so a week where
  jobs found dropped would have shown "-8%" styled as a success. Now three tones: rising green,
  falling `bg-error/10 text-error-dark` (the pair `CompletionIndicator` already uses, because
  `--color-error` measures 3.3:1 on its own tint), flat neutral.
- **Minor — the charts had no empty state.** `build-plan.md` assigns them to feature 17, but
  `ui-rules.md`'s "every section that can be empty must have an empty state" is project-wide and an
  all-zero series is reachable the moment real data lands. `ChartCard` takes `emptyMessage` and
  replaces the whole frame with the standard centred empty state; `hasPlottableData()` decides. An
  axis with no marks under it is indistinguishable from a chart that failed to draw.
- **Minor — the all-zero branch hardcoded its ticks.** It returned
  `{ ceiling: TICK_COUNT, ticks: [0,1,2,3,4] }`, where the ceiling equalling the tick count was a
  coincidence of step 1. Changing `TICK_COUNT` would have left an axis whose last tick was not its
  ceiling. Both now derive from one step through `ticksFrom()`.
- **Minor — the profile read was duplicated verbatim** across `/dashboard` and `/profile`: same
  query, same fatal-on-error branch, same parse. Extracted to `fetchProfile()` in `lib/profile.ts`,
  which is where `architecture.md` puts data access — `app/` is pages.
- **Minor — `ACTIVITY_KINDS` was exported and never read.** `JOB_MATCH_FILTERS` and `JOB_SORTS` are
  const arrays because the URL parser validates an untrusted string against them at runtime;
  `ActivityKind` is only ever constructed by the code that builds the entry, so the array had no
  reader. Now a plain union.

Also hardened while in there: React keys on chart points and category labels are `label-index`
rather than the label alone, so a series with a repeated bucket name cannot collide.

**Verified by execution:** 32 further checks. The three series the design draws produce byte-identical
axes to before the fix, so the hardening changed nothing that was already right. `NaN`, `Infinity` and
`-Infinity` in a series now yield a finite ceiling and five finite ticks; `plotPercent` returns 0 for
a non-finite value *or* a non-finite ceiling; `smoothLinePath` emits a path containing no "NaN" and
returns null on a non-finite ceiling; the all-zero branch's last tick is its ceiling;
`hasPlottableData` is false for all-zero, empty, all-non-finite and negatives-only and true for one
positive.

**Second browser pass, 2026-08-03.** A temporary preview route (since deleted, confirmed 404)
rendered all four trend states side by side — `+12%` green, `-8%` red, `0%` neutral, and no badge —
and both chart empty states. Then the populated dashboard was re-rendered to confirm the `ChartCard`
restructure broke nothing: grid, both axes, bars, curve and labels all unchanged. Console clean.
`tsc`, lint and build clean, every route still `ƒ`, `/dashboard` still 307s to `/login`.

### Feature 15 — Stats Bar (Real Data)

`mockStats()` deleted; `fetchDashboardStats()` reads the user's own `jobs` rows. No component
changed — feature 14 built the cards against `DashboardStat[]`, and this only changed where the array
comes from. The activity feed and the three chart series are still mock, as features 16 and 17 own.

Decisions:

- **Two queries, not four.** One selects `match_score, found_at` for the user's rows; one is a
  `head: true` count with `.not("company_research", "is", null)`. The totals, the average, the week
  bucket and both previous-week baselines all fall out of the first result set, so splitting them
  into separate counts would be four round trips to answer what one already carries. The research
  count stays separate because the alternative is selecting `company_research` itself — pulling every
  dossier on the account across the wire to answer a question about how many there are.
- **The average is computed in JS, not by Postgres.** PostgREST only exposes aggregate functions when
  the server enables `db-aggregates-enabled`, and nothing on the client can prove that is on. A
  user's own jobs are a bounded set — 30 today — and this reads one integer and one timestamp from
  each. Left as an open question rather than assumed either way.
- **"vs last week" compares the value now against the value seven days ago**, not this week's jobs
  against last week's. Total Jobs Found is cumulative, so "your total rose 12%" is the only reading
  of a badge on it that is true.
- **Both badges are a relative percentage, so "+12%" means one thing everywhere.** A
  percentage-point delta on the match rate would render "+3%" for a move from 79% to 82% — a
  different claim wearing the same badge as the count's. One badge shape, one meaning.
- **No previous value means no badge, and the caption changes with it.** A first-week account has
  nothing to divide by, and "vs last week" sitting under a number with nothing beside it reads as a
  missing element. Total Jobs Found falls back to "All time", Avg. Match Rate to "Across all jobs".
  **This is what the live account renders today** — all 30 rows were discovered on one day.
- **No scored job means no average, and that is not zero.** `DashboardStat.value` became
  `string | null`; `StatCard` renders the em dash with an `sr-only` "Not available yet", the
  treatment `JobInfo` established for an absent fact. A rate of 0% is a claim about the quality of
  someone's matches; the absence of one is not.
- **An unscored row counts towards Total Jobs Found and towards nothing else.** `match_score` parses
  as `z.number().finite().nullable().catch(null)` rather than `.catch(0)` — folding a missing score
  in as a zero would report a worse match rate than the user actually has. Feature 10 skips unscored
  jobs, so this should never fire; jsonb and PostgREST have both drifted on this project before.
- **A read failure throws.** A dashboard that silently reports zeroes because a query failed is worse
  than one that says it broke — the user reads "0 jobs found" as their data being gone.
- **The two reads run concurrently** with the profile read the banner needs, since neither depends on
  the other.

**Verified by execution:** 25 checks over `buildStats` and `parseStatRows`, covering a normal
account, an empty one, a first-week one, a week where the rate fell, an unscored row, the exact
seven-day boundary, and rows with an unusable `found_at`. Then **the 30 real rows were pulled out of
the live database and fed through the real parse and the real builder**: 30 / 51% / 2 / 30, which
matches Postgres's own `count(*)`, `avg(match_score)` = 50.67, `count(*) FILTER (company_research IS
NOT NULL)` = 2 and `count(*) FILTER (found_at >= now() - interval '7 days')` = 30 exactly.
`tsc`, lint and build clean.

**Not verified:** the two PostgREST calls have not been executed against the live API. An
unauthenticated request cannot reach the rows — `anon` has no grants and RLS scopes by user — so this
needs a signed-in browser. The SQL equivalent of both filters was confirmed against the live table,
so what is untested is whether the SDK emits `company_research=not.is.null` as intended, not whether
the question is the right one.

**Also unverifiable with today's data:** no trend badge can render, because every row was discovered
on the same day and there is no previous week. The three tones were confirmed in the browser during
feature 14's review pass; what has not been seen is a badge driven by real data.

### Feature 16 — Recent Activity (Real Data)

`mockActivity()` deleted; `fetchRecentActivity()` merges completed `agent_runs` with researched
`jobs`. `RecentActivity` did not change — feature 14 built it against `ActivityEntry[]`, so this is
the second consecutive feature that swapped a data source and touched no component.

**Found before writing any code, and it changed the feature:** a `jobs` row had **no timestamp for
its dossier**. `build-plan.md` feature 16 says to "merge and sort all by created_at descending",
which assumes one exists. The only candidate was `found_at`, and on the live rows that is **seven to
nine hours before the research actually ran** — Oracle was found at 07:33:54 and researched at
16:54:25. Sorting on it would have put the *oldest* research entry first and rendered "Yesterday"
under a run that finished minutes earlier. Migration
`20260803090000_jobs-researched-at.sql` adds `jobs.researched_at`, backfills the two existing rows
from `agent_logs`, and adds a partial index on `(user_id, researched_at DESC)`.
`agent/research.ts` now writes it in the same statement as the dossier.

Decisions:

- **The timestamp is a column, not a string match on `agent_logs`.** Deriving it from the
  "Saved a company dossier for X" message was the alternative and was rejected twice over:
  `agent/logs.ts` is explicitly allowed to fail silently, so a run can succeed while writing no log
  row, and keying on prose a future edit can reword is the failure mode `JobDescription` already
  documents.
- **`researched_at` joins `company_research` and `found_at` in the upsert-omission list.** A
  re-discovery that reset it would move a research entry to the moment the job was re-found.
  Recorded in `agent/adzuna.ts` and as an `architecture.md` invariant.
- **Only `completed` runs become entries.** This database has a failed run for "Frontend Developer";
  rendering it as "Found 0 jobs for Frontend Developer" states something untrue, and a failure entry
  would need a third dot colour and an error treatment neither the design nor `ui-tokens.md`
  defines. The feed says nothing rather than something wrong.
- **Zero is a real outcome, and it reads as "No jobs found for X".** Feature 10 saves a run that
  found nothing; "Found 0 jobs" reads as a bug rather than as a result. Singular gets "1 job".
- **Entry ids are namespaced** — `run-{uuid}` / `job-{uuid}` — because the two halves come from
  different tables and nothing guarantees they cannot collide as React keys.
- **An exact timestamp tie breaks on id.** Same rule every `jobs` ordering follows: without a unique
  final key two events written in the same millisecond can swap places between requests.
- **Each source is read to the display limit, not to half of it.** Five and five, merged, then
  truncated to five — otherwise a day with five searches and no research would show three entries.
- **A row that cannot be rendered is dropped, not faked.** A run with no usable timestamp, a research
  row with no company or no `researched_at` — each is logged and skipped rather than rendered with an
  invented value. A completed run missing `completed_at` falls back to `started_at`, which costs the
  entry precision rather than its place.

**Verified by execution:** 15 checks over `buildActivity` — every sentence form (plural, singular,
zero, missing title), the interleaving of both kinds by time, namespaced ids, truncation to five,
tie-breaking, and six ways a row can be unrenderable. Then **the real rows from the live database
were fed through it**, and the feed came out as:

```
research  16:54:25  Researched Oracle
research  16:37:18  Researched Voto Consulting LLC
search    09:00:27  Found 10 jobs for Frontend Developer
search    07:50:29  Found 10 jobs for Software Developer
search    07:33:54  Found 10 jobs for Backend Developer
```

Exactly five entries, newest first, with the failed run absent. **Under the old `found_at` ordering
Oracle would have been last rather than first** — which is the clearest evidence the migration was
necessary rather than tidy.

The migration was applied to the live database and read back: both dossier rows now carry a
`researched_at` seven and nine hours after their `found_at`. `tsc`, lint and build all clean.

**Not verified:** the two PostgREST calls have not run against the live API — same gap as feature 15,
and the same fix, one signed-in visit to `/dashboard`. What is untested is whether the SDK emits
`researched_at=not.is.null` and `status=eq.completed` as intended, not whether the questions are
right.

### Feature 17 — Analytics Charts (Real Data)

`mockResearchActivity()`, `mockJobsFound()` and `mockScoreDistribution()` deleted; `fetchDashboardStats`
became `fetchDashboardData`, which returns the stats bar and all three chart series from one read.
`BarChart`, `LineChart` and `ChartCard` did not change — the third consecutive feature to swap a data
source and touch no component. Designed through `/architect`, and the plan's main decision was
overturning the build plan's data source before any code was written.

**The source is the database, not PostHog, and `build-plan.md` feature 17 is wrong about it in four
separate ways.** Checked before building:

- **PostHog cannot be read from this project at all.** `.mcp.json` has two servers, `insforge` and
  `chrome-devtools` — no PostHog MCP, and no PostHog skill is installed. A repo-wide search for
  `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_API_KEY` and `phx_` returns zero hits: the only credential is
  `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, a public write-only ingestion token. Reading would mean
  minting an account-wide personal API key, shipping it in server env and hand-rolling a HogQL
  client — a new credential and a new client, to fetch data Postgres already holds.
- **It could not answer two of the three questions even if it could be read.** `job_found` carries
  `{ userId, source, matchScore }` and **no `jobId`**, so distinct jobs cannot be counted at all. It
  also fires once per saved row on *every* run, including a re-discovery the upsert correctly treats
  as the same job — while `found_at` is deliberately omitted from that upsert so it keeps meaning
  *first discovered*. A repeated search would inflate the PostHog series and leave the rows correct.
- **PostHog is lossy where Postgres is exact.** `captureImmediate` resolves even when delivery
  failed, and whether `job_found` and `company_researched` have ever arrived has still never been
  confirmed. That question is no longer blocking, because nothing reads them.
- **PostHog still captures.** No event was removed. It stopped being a *read* dependency.

Decisions:

- **One read serves four surfaces.** `researched_at` joined `match_score, found_at` in the stats
  select, so feature 17 adds **no query at all** — the rows the charts need are rows the page had
  already loaded. Three separate chart reads would have been three more round trips for the same 30
  rows. Same call feature 15 recorded in choosing two queries over four. `StatRow` / `parseStatRows`
  became `JobFact` / `parseJobFacts` because those rows no longer feed only the stats bar, and
  `parseJobFacts` now delegates to the file's own generic `parseRows<T>` instead of hand-rolling the
  same per-row `safeParse` loop a second time.
- **Both time charts cover 7 days, not the build plan's 30.** Feature 14 built and the design draws
  seven points; thirty daily labels do not fit the card. Seven also puts Jobs Found Over Time on the
  same window as Company Research Activity beside it, so the two can be read against each other.
- **Days are bucketed in UTC, and the label is formatted in UTC to match.** The page has no client
  boundary anywhere in the chart chain, so the reader's timezone is not knowable without adding one.
  Pinning UTC at least makes the chart identical in development and on the deployed server, which
  the machine's local zone would not. **If the label's zone and the bucket's zone ever disagree,
  every bar names a different day from the one it counts** — there is a check for exactly that.
- **A day with no rows is a zero, not a missing bucket.** The series has to stay seven long or the
  axis silently shortens and every label slides onto the wrong bar.
- **The score distribution has six buckets, not the design's five.** The five start at 50, and this
  account's scores run 30-65: **19 of its 30 rows score under 50** and would have been dropped
  entirely from a chart whose whole job is to show the distribution. Nearly two thirds of the
  account, invisible. Lower-inclusive and upper-exclusive so 60 lands in `60-70`, with both end
  buckets unbounded — the column carries `CHECK (match_score BETWEEN 0 AND 100)`, but the value
  arrives through PostgREST and zod rather than from the constraint, and a score falling through
  every bucket would vanish without a trace.
- **The distribution is all-time and excludes unscored rows**, the same rule Avg. Match Rate
  follows: a row with no score counts towards Total Jobs Found and towards nothing else.
- **`researched_at` for the research chart, never `found_at`.** On this database the two are seven
  to nine hours apart, which is why feature 16 added the column.

Found while building — both by running the thing, not by reading it:

- **The two windowed empty states were claiming something false.** `/architect` had concluded the
  existing copy "is correct for real data and does not change". It is not: every row on this account
  was found on 2026-08-02, which is one day outside today's window, so both time charts render their
  empty state — under the words "No jobs found yet" and "No companies researched yet", to a user
  with 30 jobs and 2 dossiers. Now "No jobs found **in the last 7 days**" and "No companies
  researched **in the last 7 days**", which is true for a new account as well. Match Score
  Distribution keeps "yet" because it is all-time.
- **The sixth bucket broke the narrow layout, and the fix was in the labels.** `flex-1` carries
  `min-width: auto`, so a `whitespace-nowrap` label wider than its equal share expands and steals
  from its neighbours. At 414px the six labels `<50%`…`90-100%` needed 274px of the 277px available
  and rendered as **one unbroken run with no gap** — `<50%50-60%60-70%70-80%80-90%90-100%` — with
  slots no longer equal and every label drifting up to 8px off its bar. Five labels needed 239px of
  the same 277px, so this was a regression the sixth category introduced. Dropping the repeated `%`
  returned about 7px each: equal slots, **zero drift**, and 8.1px of gap. The unit is stated once in
  the card title instead of six times in the tightest row on the page. **A resized browser window
  bottoms out around 500px and hides this entirely — it took emulating a real 414px viewport.**

**Verified by execution: 60 checks.** 46 over the three builders — the window edge in both
directions, a future row, a UTC-midnight timestamp landing on the bucket its own label names, the
last instant of the same UTC day still landing there, labels rolling with the weekday rather than
staying Mon-first, all seven labels distinct (the line chart keys on the label alone), every bucket
boundary at 49/50/59/60/89/90/100, a score outside 0-100 in both directions, an unscored row
excluded, and null or unparseable timestamps skipped.

Then **the 30 real rows were pulled out of the live database and fed through the real parse and the
real builders**, asserted against Postgres's own aggregates. The distribution came out
`[19, 1, 5, 2, 3, 0]`, matching a SQL `GROUP BY` on the same `CASE` expression exactly, and summing
to 30. Both time charts came out all-zero, matching `count(*) WHERE found_at >= …` = 0 and the same
for `researched_at` — every row is dated 2026-08-02 and the window starts 2026-08-03. Run against
the previous day's clock, the same rows produce `[30, 0, 0, 0, 0, 0, 0]` and `[2, 0, 0, 0, 0, 0, 0]`
under a `Sun` first label, which is what the charts rendered yesterday. `buildStats` over the same
rows still returns 30 / 51% / 2, with Jobs This Week now correctly 0.

**Browser pass, 2026-08-09**, on a temporary preview route (since deleted, confirmed 404) at 1470px,
834px and an emulated 414px — three states: today's live data, the same rows a day earlier, and a
spread across all seven days. Both empty states render with the corrected copy; the distribution
draws six bars on a 0-20 axis; the line chart's curve and the seven weekday labels survive every
width; console clean at all three. `tsc`, lint and `npm run build` all clean, every route still `ƒ`,
`/dashboard` still 307s to `/login` signed out.

### Feature 17 — issues found by `/review` and fixed

Seven findings, five fixed in the same session. Two mattered.

- **Important — the page carried two different definitions of "the last 7 days", and they
  contradicted each other on screen.** `Jobs This Week` counted a rolling `now - 7 x 24h` while both
  time charts bucketed seven UTC calendar days. The calendar window is always the shorter of the
  pair, by exactly the current time of day — so by up to 23 hours. Reproduced: a job found 6.8 days
  ago gave `Jobs This Week: 1` directly above a chart captioned "No jobs found in the last 7 days".
  Same page, same window name, opposite answers. Fixed with one `weekStart(now)` that the stat card,
  **both trend baselines** and both charts now share; `WEEK_MS` is gone. The calendar reading won
  because it is the one with a visible definition — the chart draws seven labelled days and a reader
  can count them.
- **Important — three context files still told readers the charts read PostHog.** Feature 17
  corrected `build-plan.md`, `architecture.md`'s chart invariant, `ui-registry.md` and this file, and
  missed `code-standards.md` ("`job_found` powers the Jobs Found Over Time and Match Score
  Distribution dashboard charts"), `architecture.md`'s own stack table, and three lines in
  `project-overview.md`. All corrected. `code-standards.md` also still said none of the four product
  events were wired, which stopped being true at feature 13.
- **Minor — a non-finite clock took the whole dashboard down.** `buildJobsFound(rows, NaN)` threw
  `RangeError: Invalid time value` out of `Intl.DateTimeFormat.format` — a 500 on the page, from a
  chart. Unreachable today (`Date.now()` is the only caller) but these are exported functions, and
  `lib/charts.ts` guards its own inputs for exactly this reason: the clock was the one input in the
  chain that was never narrowed. Now logs and returns an empty series, which renders the card's
  empty state — the same degrade an all-zero series already gets.
- **Minor — the `sr-only` value list lost its unit.** Dropping the `%` fixed the visual crowding at
  414px, but the screen-reader list went from "60-70%: 1" to "60-70: 1" — and horizontal space, the
  entire reason for the change, is not a constraint a screen reader has. `ChartPoint` gained an
  optional `srLabel` that both charts prefer in their `sr-only` list; the score buckets set it
  ("under 50%", "50-60%", …) and the weekday series does not, because weekday names already read
  correctly aloud.
- **Minor — `DashboardData` was declared in `lib/dashboard.ts`** while every other shared shape
  (`ChartPoint`, `DashboardStat`, `ActivityEntry`) lives in `types/index.ts`. Moved.

Two findings were recorded without a code change: the plan's own instruction to do the signed-in
browser pass **before** writing code was inverted when OAuth could not be completed (see below), and
the empty-state copy and label format both changed despite the plan saying they would not — the plan
was wrong on both, and the reasons are above.

**Verified by execution:** 11 further checks, and the count above includes them. The card and the
chart now agree on a 6.8-day-old row (the exact case that used to disagree), on a 2-day-old row, and
on the boundary instant itself in both directions; `NaN`, `Infinity` and `-Infinity` clocks all
return an empty series rather than throwing, and `buildStats` survives one too; the visual labels
stay short while the sr labels keep the unit; and the weekday series sets no `srLabel`. Re-read in
the browser at an emulated 414px: `maxDrift` still 0, `minGap` still 8.1px, and the `sr-only` list
now reads "under 50%: 19 / 50-60%: 1 / 60-70%: 5 / …" while the visible axis still reads
"<50 / 50-60 / 60-70". Console clean. `tsc`, lint and build clean, `/dashboard` still 307s signed
out, preview route confirmed 404.

**Not verified:** `/dashboard` has still never been opened signed in — the browser profile has no
GitHub session and OAuth cannot be completed on the developer's behalf. Feature 17 **adds no new
query**, so this did not widen the gap features 15 and 16 left; the two reads are the same two, with
one extra column in the select list, and `fetchRecentActivity` is byte-identical. One signed-in visit
still closes all three features at once.

### Chart tooltips — added after the signed-in pass

Hovering a chart showed nothing, so the three charts gained hover tooltips: a dark
`bg-overlay`/`text-surface` pill naming the bucket and its value, plus a dot on the line chart's
curve. Full pattern in `ui-registry.md`.

**This reverses part of a feature 14 decision, and it cost nothing.** Feature 14 declined a charting
library partly because "all three charts are static — no tooltips, no legends, no brushing", and
that was confirmed with the developer at the time. The tooltips are `group` / `group-hover`, which
is CSS — so there is still no charting library, still no `"use client"` anywhere in the chart chain,
and the charts at rest render byte-identically to before. Only the reason changed, not the outcome.

Decisions:

- **The hover target is the whole column, not the bar.** A zero bar is zero pixels tall and
  unhoverable; a reader pointing at an empty column is asking the same question as one pointing at a
  tall one. The bar's tooltip is anchored to the bar's own top edge so it tracks the value, and on a
  zero bar that edge is the baseline.
- **The line chart's dots are DOM, not SVG.** Its `<svg>` is `preserveAspectRatio="none"`, so a
  `<circle>` inside it would stretch into an ellipse as the card widens — the same reason the path
  already carries `vector-effect="non-scaling-stroke"`.
- **Its hover zones are not equal slots.** The line's points sit at `i / (n - 1)`, on the plot
  edges, not at slot centres like the bars. The first and last get half a zone flush to their edge.
- **The tooltip uses `srLabel ?? label`**, so the score chart's tooltip reads "60-70%: 5" while its
  axis reads "60-70" — the axis dropped the unit for width, and a tooltip has no such constraint.
- **Tooltips sit inside the `aria-hidden` mark layer**, because the `sr-only` list already carries
  every label and value. Verified in the a11y tree: seven entries per chart, not fourteen.

Found while building: **a centred tooltip on the last line-chart point cleared the card's right edge
by 2px.** The two edge points now align an edge to the point and grow inwards instead of centring.
Caught by measuring every tooltip against its own card rect, not by looking — 2px does not read as
wrong in a screenshot.

**Verified in the browser** at 1470px and an emulated 414px. Hover was driven for real and exactly
one tooltip and one dot came up (`Thu: 9`, the centre point); then every tooltip was force-shown at
once to check placement for the edges too, and none escaped its card at either width. Also confirmed
the seven weekday axis labels are all `rgb(153, 161, 175)` — they look warm-tinted in a screenshot,
which is subpixel antialiasing rather than a token problem. `tsc`, lint and build clean, every route
still `ƒ`, preview route confirmed 404.

**Known limitation:** hover is a pointer affordance, so there is no keyboard or touch path to a
tooltip. The `sr-only` list and the axis carry the data otherwise. Giving the marks a focus path
means either 13 extra tab stops on the dashboard or a Client Component, and neither was worth it for
a second copy of data the page already exposes — but if touch users start asking for it, that is the
trade to revisit.

### Country selection — the oldest open defect, closed

`detectCountry()` used to read the free-text Location field and fall back to `us` when it recognised
nothing. A search for "India" therefore ran against the US index and returned ten Indianapolis
listings — confidently wrong rather than empty, which is the worst shape a wrong answer can take.
`ADZUNA_COUNTRIES` is now all **19 markets Adzuna actually serves**, and the market is chosen by the
user rather than guessed.

**All 19 were verified against the live API before the list was widened**, with `category=it-jobs`,
and their IT job counts recorded: us 371,374 · in 86,206 · gb 35,754 · ca 17,693 · au 11,891 ·
za 10,299 · sg 10,104 · fr 8,867 · pl 7,232 · de 2,906 · es 1,174 · br 989 · mx 964 · nl 836 ·
it 760 · nz 701 · be 481 · at 367 · ch 338. `ie` and `ae` answer 404 and are not Adzuna markets.
**India is the second-largest market on the platform** — the one the app was silently redirecting.

Decisions:

- **The old comment justifying four markets was wrong on both counts.** It claimed the others were
  "a separate host path and an untested category vocabulary"; the path differs only in the country
  segment, and `it-jobs` returns results in all nineteen. A short list cost nothing to widen and cost
  a real defect to keep.
- **`detectCountry` survives but is demoted to seeding.** It reads the saved *profile* location to
  preselect the field — never the search box. The difference is that a wrong guess is now visible in
  a select and one click from being corrected, instead of silently deciding the query.
- **The route validates the country with `z.enum(ADZUNA_COUNTRIES)` rather than defaulting.** A
  country the server does not serve is a broken client, and answering it with a US search is the
  exact failure being removed.
- **The banner names the market**: "Found 10 jobs in India — 3 are strong matches." The zero-result
  sentence names it too and suggests changing country, because a wrong market is the likeliest reason
  a real search returns nothing.
- **Salary symbols come from `Intl.NumberFormat`, not a table.** Nineteen hand-written symbols is a
  table to get wrong; only the ISO code is stated. `currencyDisplay` stays at the default `"symbol"`
  — `"narrowSymbol"` collapses AUD, CAD, SGD, MXN and NZD to a bare `$`, so a Singapore salary would
  read as US dollars. Compact notation also absorbs the old `formatAmount`'s sub-1000 rule for free.
- **The Location placeholder no longer invites a country** — "Remote, Bengaluru, New York…". Typing a
  country there is what produced Indianapolis.

**Two things visible in the rendering changed**: salaries read `£70K` rather than `£70k` (Intl's
compact notation capitalises), and Canada renders `CA$` rather than `C$`. Neither is specified in any
design file.

**Verified by execution: 44 checks.** 34 over the market list, the seeding heuristic and the banner —
including that **Indiana is not India** and **Austria is not Australia** (both one word-boundary away
from being wrong), that California is still not Canada, that all 19 markets seed correctly from a
plausible profile location, and every banner form. 10 over the salary formatter across all 19
markets, confirming no two dollar-markets render identically.

**Two real bugs the checks caught, neither visible by reading:** the market list had **Austria before
Australia** — they diverge at the fifth letter, where "a" sorts before "i" — and an expected-value
literal used a plain space where `Intl` emits U+00A0, which made a passing case look like a failure.

**The harness itself was fixed.** Feature 17's `/review` recorded that check scripts could only
import modules whose `@/` imports were all `import type`, because a runtime one does not strip. That
made `lib/jobs.ts` unreachable and the whole harness dependent on a file never gaining a real import.
A `--import` resolver hook now resolves `@/` and supplies the `.ts` extension, so any lib module can
be checked. It must test `statSync().isFile()`, not `existsSync()` — `@/types` is a real directory
and would otherwise shadow `types/index.ts`.

**Browser pass** at 1470px, 834px and an emulated 414px. The form goes four columns → two → stacked;
the select fits its card at every width and the button stays bottom-aligned with it. Seeding was
confirmed live for three profiles: "Pune, India" → India, "Springfield" → United States,
"London, UK" → United Kingdom.

### The dedupe path — exercised for the first time

Never run since feature 10 built it. Proven on a synthetic probe row created and destroyed for the
purpose, so no real row was mutated: a row carrying `found_at`, `researched_at` and a dossier was
re-upserted with the **exact 16-column payload `agent/adzuna.ts` sends** and its
`ON CONFLICT (user_id, source, external_id) DO UPDATE`.

Result: **one row, not two.** `researched_at` unchanged, `company_research` survived, `found_at`
unchanged — and `match_score` 42 → 99, `location`, `salary`, `job_type` and `run_id` all refreshed.
Exactly the split the omission list promises, and the rule both dashboard time charts depend on.

**`found_at` first appeared to have changed and had not.** The comparison literal was
millisecond-precision while Postgres stores microseconds (`12:32:50.222036`), so an equality test
against `.222` returned false. Reading the value back showed it 24.7 seconds older than `now()` — the
original insert time, not the upsert time. **The check was wrong, not the code.**

**Still not exercised end to end**: the SDK's own `on_conflict` emission on a second run, and the
re-scoring path. That needs one signed-in search run twice.

### The Indianapolis rows — nine deleted, one kept

Nine of the ten were deleted. **The tenth was kept because it carries a company dossier** — one of
only two on the account, produced by a real Browserbase session, and the "Researched Oracle" entry in
the activity feed. Found by listing the rows before deleting rather than after; the plan had assumed
all ten were disposable.

**The ten Virginia rows were never a defect.** Checking each run against its own rows showed they
came from a search whose location was "US", so Virginia is a correct result. That note had been
carried in this file and in `memory.md` and was overstated.

Effect on the live account: 40 jobs → 31, and **average match rate 51% → 57%** — the six-point lift
is the measure of how much the wrong-country rows were dragging the number down. Both dossiers
intact, and no probe rows left behind.
