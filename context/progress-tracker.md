# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 1 — Foundation
**Last completed:** 01 Homepage — full UI, all sections built and rendering. CTAs point at `/login`
unconditionally; the auth-aware branch is deferred to feature 02.
**Next:** 02 Auth — InsForge Google + GitHub OAuth, callback handler, middleware, and the
auth-aware CTA redirect the homepage is waiting on.

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [ ] 02 Auth
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

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._

- **Unresolved drift, Phase 5.** `build-plan.md` feature 14 lists a "Cover Letters Generated" stat
  card and a "Resume Tailoring Activity" chart, but `project-overview.md` puts cover letters and
  resume tailoring out of scope and names the four cards as Total Jobs Found / Avg. Match Rate /
  Companies Researched / Jobs This Week. Follow `project-overview.md` when Phase 5 is built.
- **Dev server smoke test.** `npm run build`, `npx tsc --noEmit` and `npm run lint` all pass clean as
  of feature 01; `/` prerenders as static content.
