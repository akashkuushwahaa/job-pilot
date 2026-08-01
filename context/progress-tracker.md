# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 — Profile Page, in progress
**Last completed:** 06 Profile Save Logic. `actions/profile.ts` upserts the row with zod validation,
`app/api/resume/route.ts` owns resume upload and signed access, and `/profile` now reads the real
row. `mockProfile()` is gone. Not yet exercised in a browser — see Notes.
**Next:** Phase 2 — 07 AI Profile Extraction from Resume.

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

Verified statically: the three app enums match the DB CHECK constraints character for character;
`education` is nullable with no default; `GET` and `POST /api/resume` and `/profile` all 307 to
`/login` for an anonymous caller. That last one also proves `unstable_rethrow` is letting
`NEXT_REDIRECT` through the route's catch — the proxy matcher excludes `/api`, so the redirect can
only be coming from `requireUser()` inside the handler.

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._

- **Feature 05 is UI only, and three controls are deliberately inert.** "Save Profile" submits a form
  whose `onSubmit` calls `preventDefault` (feature 06), "Generate Resume from Profile" has no handler
  (feature 08), and a selected resume file is held in component state and never uploaded (feature 06).
  The completion ring reads the *saved* profile, not live form state, so it will not move while
  typing — feature 06 recomputes it after `revalidatePath`.
- **`app/profile/page.tsx` holds a `mockProfile()` function.** Delete it in feature 06 and replace it
  with a real read; it returns exactly the design's data so the page can be diffed against
  `context/designs/profile.png`. Email is already real — it comes from `requireUser()`.
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
  coexist. All test rows were deleted — every table is empty.
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
