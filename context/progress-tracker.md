# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 1 — Foundation
**Last completed:** 02 Auth — InsForge Google + GitHub OAuth, callback and refresh route handlers,
`proxy.ts` route protection, sign out, and the auth-aware homepage CTA. Build, typecheck and lint
are clean; route protection verified against the dev server. **The live OAuth round-trip has not
been driven by a human yet** — see Notes.
**Next:** 03 PostHog Initialization. `posthog.identify()` after login and `posthog.reset()` on
logout hook into `actions/auth.ts`.

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [ ] 03 PostHog Initialization
- [ ] 04 Database Schema

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
- **Feature 02 is not fully verified.** Automated checks that passed: `/dashboard`, `/profile`,
  `/find-jobs` and `/find-jobs/[id]` all 307 to `/login` while signed out; `/login` renders both
  providers; the homepage CTAs resolve to `/login`; OAuth init returns a valid provider URL for
  Google and GitHub. **Not yet exercised: an actual browser sign-in.** The code exchange, cookie
  write, post-login redirect, the signed-in homepage CTA, and sign-out have never run. Drive one
  sign-in with each provider before treating this feature as done.
