# Memory — Feature 05: Profile Page (Full UI) + auth navigation fix

Last updated: 2026-08-01

Phase 1 complete. **Feature 05 is done.** Next is feature 06 — Profile Save Logic.

## What was built

### Feature 05 — Profile Page, full UI on mock data

Built against `context/designs/profile.png`. No save logic.

- `app/profile/page.tsx` — replaced the `ComingSoon` stub. Holds a `mockProfile()` function returning
  exactly the design's data; email is real, from `requireUser()`.
- `components/profile/` — `CompletionIndicator` (banner + SVG ring), `ResumeUpload` (owns the whole
  Resume card), `ProfileForm` (all five sections, owns form state), `TagInput`, `WorkExperienceCard`.
- `components/ui/` — six hand-written primitives: `field` (exports `Field` **and** `fieldSurface`),
  `label`, `input`, `textarea`, `select`, `checkbox`.
- `lib/completeness.ts` — `completeness(profile)` → `{ percent, missing, isComplete }`.
- `types/index.ts` — `Profile`, `WorkExperienceEntry`, `EducationEntry` and the three enums.
- `lib/utils.ts` — added `MAX_WORK_EXPERIENCE` (3) and `MAX_RESUME_BYTES` (5MB).
- `--color-error-dark: #b42318` added to `globals.css` and `ui-tokens.md`.

### Auth navigation fix (found by `/review`)

- `components/layout/AppNavbar.tsx` — new. Rendered by **all three** protected pages.
- `app/dashboard/page.tsx`, `app/find-jobs/page.tsx` — now render `AppNavbar` above `ComingSoon`.
- `components/layout/ComingSoon.tsx` — lost its logo and sign-out to the navbar; it is now just the
  centred card and is **no longer an Auth shell user** (shell is back to three: login, `error.tsx`,
  `global-error.tsx`).
- `components/auth/SignOutButton.tsx` — moved into `AppNavbar`; gained `variant` / `fullWidth` props.
- `Hero` / `CallToAction` / `app/page.tsx` — new `secondaryHref`; `Navbar` nav collapses at `sm`.

## Decisions made

- **The shadcn CLI was still not run, deliberately.** Feature 05 needs no dialog, and its select and
  checkbox are native elements. `shadcn init` would rewrite `globals.css` with its own palette. All
  primitives are hand-written in shadcn's shape on project tokens, as `Button` was. Revisit only when
  a page genuinely needs a dialog or combobox.
- **`completeness()` reads exactly ten fields** — design-locked. 70% with PHONE/LOCATION/EDUCATION
  missing is only self-consistent at ten. Listed in `architecture.md`. Takes `Profile | null`.
- **Filled inputs tint, empty ones stay white, and the tint inverts against its container.** `Input`
  reads its own `value`. Inside the grey `WorkExperienceCard`, inputs are forced back to `bg-surface`.
- **`--color-error` is a signal colour, not a text colour.** Red that is read uses `text-error-dark`.
- **Every protected page must render `AppNavbar`** — now an invariant in `architecture.md`. There is
  no shared authenticated layout and no `(app)` route group; pages own their chrome.
- **Sign-out lives in `AppNavbar`** — the feature-14 plan executed early, because feature 05 deleted
  `/profile`'s use of `ComingSoon` and took the app's only sign-out on that page with it.
- **Focus states are split on purpose:** `focus-visible:` on anything clicked, plain `focus:` on
  `fieldSurface` text controls.

## Problems solved

- **"Cannot reach /profile after login" was never an auth bug.** `/dashboard` rendered the
  chrome-less `ComingSoon`, whose only links were the logo and Sign out — nothing pointed at
  `/profile`. The homepage navbar had the links but was `hidden md:flex`, so under 768px there was no
  route to `/profile` from anywhere. Fixed by `AppNavbar` on every protected page plus an `sm`
  breakpoint. Sign-in itself was working the whole time; the dev log had zero auth errors.
- **Both homepage "Find your first match" buttons pointed at `ctaHref`**, so signed in all four
  homepage buttons went to `/dashboard` and the secondary label was a lie. Only the *primary* CTA had
  ever been session-aware.
- **Verifying auth-gated UI without a session:** write a temporary unauthenticated preview route,
  `curl` it, grep the markup, delete the route. Used twice. Also worth grepping
  `.next/static/chunks/*.css` for new utility classes — Tailwind drops unknown ones silently and the
  build still passes.
- **PostHog browser events are readable from `.next/dev/logs/next-development.log`.** Mark the line
  count before a manual browser pass, then `tail -n +N` and grep event names, `provider`,
  `$anon_distinct_id` and `$current_url` afterwards.

## Current state

- `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Every route dynamic (`ƒ`).
  All three protected routes still 307 to `/login` while signed out.
- **Branch `feat/04-database-schema`** — the name is stale, it now carries all of feature 05 and the
  auth fix. All code is committed through `689d2bb`. Only `context/progress-tracker.md` and
  `context/ui-registry.md` are dirty (this session's `/review` and `/imprint` notes).
- **Browser pass done, 2026-08-01, two full GitHub sign-in cycles.** Confirmed from the dev log:
  route trail `/login → /dashboard → /profile → /find-jobs → /`; `oauth_sign_in_started` ×2 with
  `provider: "github"` (first time that provider has ever run); `$identify` ×2 with distinct
  `$anon_distinct_id`s merging into one identified id; `user_signed_out` ×3; **zero server-side
  errors**. From autocapture: the checkbox toggled, tag Add clicked ~5×, a chip `×` clicked ~2×.
- `ui-registry.md` is at 30 entries and was drift-checked across `components/` and `app/`: zero hex
  values, zero raw Tailwind colour classes, every value a token.

## Next session starts with

1. **Feature 06 — Profile Save Logic.** Delete `mockProfile()` from `app/profile/page.tsx` and read
   the real row. **Handle a missing row** — there is none until first save; pass `null` straight to
   `completeness()`. Wire `actions/profile.ts`, upload to `resumes/{user_id}/resume.pdf` with
   `upsert: true`, store the object **key** in `resume_path`, and render links with
   `createSignedUrl(path, 3600)` at render time. `job_titles_seeking` and `preferred_locations` are
   entered as one comma-separated field and must be split into `text[]` on save. Re-validate PDF type
   and size on the server — `ResumeUpload`'s checks are cosmetic.
2. **Decide session replay before wiring the save.** See open questions — this is the blocking one.
3. Consider renaming or merging the `feat/04-database-schema` branch before more work lands on it.

## Open questions

**Blocking feature 06:**

- **Session replay is recording the profile form and nobody decided that.** 49 `$snapshot` events in
  the browser pass. It is on because `instrumentation-client.ts` sets `defaults: "2026-01-30"`;
  nothing in the context files mentions it. Today it captures mock data — from feature 06 it captures
  real phone numbers, locations, salary expectations and work history as they are typed. Turn it off,
  configure PostHog input masking, or accept it explicitly and record the decision.

**Auth findings from `/review`, reported and not fixed:**

- **The `unstable_rethrow` invariant is violated in three catches** — `startOAuth` and `clearSession`
  in `actions/auth.ts`, and the outer catch in `app/api/auth/callback/route.ts`. `redirect()` sits
  outside the try in both actions so `NEXT_REDIRECT` is not currently swallowed, but `cookies()`
  inside those blocks can raise Next control-flow exceptions.
- The OAuth code-verifier cookie is not deleted when the exchange fails — stale for up to 10 minutes.
- Signed-out visitors see the homepage app-nav links, which 307 straight back to `/login`.

**Still unverified:**

- **Neither error boundary has ever rendered.** Zero `$exception` events. Throw something on purpose.
- **Server-side `user_signed_in` has never been confirmed arriving** — it goes via `posthog-node` so
  it never reaches the browser log. Needs PostHog's Activity view; the `phc_` token is write-only.
- **Google OAuth has not run since the feature-03 fixes** — both browser cycles were GitHub.
- **`ResumeUpload` drag-and-drop and "Add role" are still unexercised** — no distinguishable trace in
  autocapture.
- **Cross-user RLS isolation is still unproven** — `auth.users` holds one user and admin tooling
  refuses `SET ROLE`. Needs a genuine second signed-in account.

**Carried forward:**

- **Rotate the InsForge admin API key** if it was ever committed, pushed or deployed. The `ik_`
  full-access key had been pasted into `NEXT_PUBLIC_INSFORGE_ANON_KEY` and served to browsers before
  being replaced with the correct `anon_` key.

**Small, worth doing when convenient:**

- `Button` size `md` is `h-9` but form controls are `h-10`, so any button on a field row needs an
  explicit `h-10` override (TagInput's Add does). Consider making `md` `h-10` when feature 09 builds
  the search controls rather than overriding per site.
- `ResumePreview.tsx` is listed in `architecture.md` but not built — it lands with feature 06's
  signed-URL render.
- `build-plan.md` feature 06 still says `resume_pdf_url`, `is_complete`, and "completion percentage
  and missing fields calculated and saved". All three are wrong — feature 04 dropped them. The column
  is `resume_path` and completeness is derived. `architecture.md` is the correct one.
