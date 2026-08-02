# Memory — Feature 08: Resume PDF Generation from Profile (built, exercised against the live model)

Last updated: 2026-08-02

Phase 2 is complete. Features 05, 06, 07 and 08 done. Next is Phase 3 — feature 09, Find Jobs
Page (Full UI), the first mock-data UI build since feature 05.

## What was built

- **`lib/resume-generation.ts`** — `generateResumeContent(profile)` returns
  `{ success, content } | { success: false, error }`. Holds the prompt, the zod schema, the
  per-index bullet alignment, and `selectRoles()`. Content is `{ summary, roles }` where each role
  is the profile's own entry spread with model-written `bullets`.
- **`lib/resume-pdf.tsx`** — the react-pdf `Document` plus `renderResumePdf(profile, content)`.
  A4, built-in Helvetica, one `COLOR` object holding the `ui-tokens.md` values. In `lib/` because
  it is not a React DOM component and `components/` is scoped to app UI.
- **`app/api/resume/generate/route.ts`** — `POST`, **no request body**. Reads the caller's own row,
  gates on `completeness().isComplete`, generates, renders, uploads over `{user.id}/resume.pdf`,
  upserts only `{ id, email, resume_path }`.
- **`lib/profile.ts`** gained `isSameFormValues(a, b)` — field-by-field, not `JSON.stringify`.
- **`components/profile/ProfileWorkspace.tsx`** — now also holds `savedValues` and computes
  `generateBlocker: "incomplete" | "unsaved" | null`.
- **`components/profile/ProfileForm.tsx`** — gained an `onSaved` prop so a successful save moves the
  workspace's snapshot.
- **`components/profile/ResumeUpload.tsx`** — Generate wired: inline confirm, both disabled states
  with their reasons, `isGenerating`, own status banner, `router.refresh()`.
- `@react-pdf/renderer@4.5.1` installed. **No `serverExternalPackages` entry needed** — unlike
  `pdf-parse`, it bundles and renders clean under Turbopack.
- Docs updated: `progress-tracker.md`, `ui-registry.md`, `architecture.md`, `build-plan.md`
  (feature 08 correction note), `library-docs.md` (two real corrections — see below).

## Decisions made

- **Overwrite stays, but it is confirmed.** One key, one `resume_path`, no undo — and generating
  destroys the uploaded original that extraction reads. With a resume stored the button does not
  act: it swaps the row into Cancel / Replace resume. Inline, not a dialog — `ui-rules.md` has none
  and this does not earn a Radix dependency.
- **Generate is disabled while the form is ahead of the saved row.** Generation reads the row and the
  form is routinely ahead of it — extraction exists to put unsaved values on screen. Without this,
  Extract → Generate silently builds a resume from the *old* row and overwrites the real one.
- **Gated on `completeness().isComplete`** — the same ten fields the banner reports, re-checked in
  the route. The button carries the reason as muted text; a disabled control that does not say why
  reads as broken.
- **GPT-4o writes prose only.** It returns summary + bullets. Every fact — name, company, title,
  dates, degree, institution, skills — is rendered straight off the row. A model that can restate an
  employer's name can invent one.
- **A failure writes nothing.** Model outage or render error returns before touching storage, so the
  stored resume always survives. This is what makes the overwrite survivable.
- **Bullets fall back per index, never across roles** — shifting them up would attribute one
  employer's work to another.
- **No new PostHog event.** The list stays at seven.

## Problems solved

- **The InsForge SDK's `upload()` takes `(path, file: File | Blob)` — there is no third options
  argument.** `library-docs.md` showed `upload(key, buffer, { contentType, upsert: true })`; none of
  it exists in `@insforge/sdk@1.5.1`. The buffer is wrapped in a `File`. **Fourth installed package
  in three features whose real API did not match the docs — read the `.d.ts` first, every time.**
- **react-pdf's "supported CSS properties" list in `library-docs.md` was a subset.** The real `Style`
  type is `node_modules/@react-pdf/stylesheet/lib/index.d.ts` and includes `borderBottomWidth`,
  `letterSpacing`, `textTransform`, `flexWrap` and `gap` — all of which this document uses.
- **GPT-4o wrote the current role in past tense** despite the rule saying otherwise, because the rule
  sat in the shared instructions with nothing tying it to a specific role. Marking the role itself
  `(CURRENT ROLE — write these bullets in present tense)` fixed it on the next run. **A rule stated
  once at the top is weaker than the same rule attached to the item it governs** — this will matter
  for features 10 and 13.
- **A branch was cut off the wrong base.** HEAD moved from `feat/07` to `main` mid-session, so the
  first `feat/08` branch had none of feature 07. Caught before any code was written, by grepping for
  a file that should have existed. Check `git log` immediately before branching.

## Current state

- `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Every route `ƒ`.
  `/api/resume/generate` is registered and 307s to `/login` anonymously.
- **Feature 08 exercised against the live model end to end.** A temporary route (since deleted,
  confirmed 404) ran the real prompt, schema, renderer and `pdf-parse` over a complete seven-year
  profile fixture: a 3.5KB `%PDF-1.3` that parses back to **one page** with header, contact line
  (protocols stripped), summary, skills, three roles and education. Dates rendered
  `Mar 2022 — Present`, `Jul 2019 — Feb 2022`, `Jan 2018 — Jun 2019`. The role with empty
  responsibilities got **zero** bullets rather than invented ones. No job preferences, salary
  expectation or work authorization anywhere in the output.
- **Nothing in feature 08 has been clicked in a browser**, and it has never read a real `profiles`
  row — only the fixture.
- **Git, needs attention:** `feat/07-ai-profile-extraction` was merged into **local `main`** with
  `--no-ff` (commit `2e83789`). **Not pushed.** Undo with `git reset --hard 51f7798` on main.
  Feature 08 sits **uncommitted** on `feat/08-resume-pdf-generation`, cut off that updated main.
  Nothing from features 06, 07 or 08 has reached `origin/main`.

## Next session starts with

1. **Commit feature 08.** Granular commits in the feature 07 style: deps, then the two `lib/`
   modules, then the route, then the UI wiring, then the docs.
2. **Click through feature 08 in a browser**, in this order: with an incomplete profile confirm the
   button is disabled and says why → complete and save → type one character and confirm it flips to
   "unsaved" → save → Generate → confirm the replace step → check the banner and that View opens the
   new PDF. **This destroys the resume feature 07 has been extracting from** — re-upload a copy
   afterwards if it is worth keeping. It also finally exercises feature 07's UI, which is still
   unobserved.
3. **Decide the push/PR story** for features 06–08 before starting Phase 3.
4. **Feature 09 — Find Jobs Page, full UI with mock data.** No logic. Search controls card, filter
   bar, jobs table, pagination. It deletes the `/find-jobs` `ComingSoon` stub. `context/designs/`
   holds the reference; feature 05 is the pattern for building a full page against a design.

## Open questions

**Feature 08, unverified:**

- **The whole UI is unobserved** — see "Next session starts with".
- **It has never read a real `profiles` row**, only the fixture.
- **The per-index bullet fallback has never run.** It needs a response carrying fewer roles than
  were sent, which the model has not done yet.
- **Single-page output is a content budget, not a guarantee.** react-pdf paginates silently. A
  profile with three long roles at four bullets each may spill; nothing warns if it does.

**Carried forward, still open:**

- **Feature 07's UI is also unobserved** — the Extract button, its loading state, the merge into
  form state and its banner have never been clicked.
- **A real-world resume has never been through extraction.** Only a generated single-column PDF.
- **The comma-separated → `text[]` split has never run.** `job_titles_seeking` and
  `preferred_locations` are both empty in the saved row.
- **`profile_completed` has not been confirmed arriving.** Goes through `posthog-node`; needs
  PostHog's Activity view. Also confirm it does not fire twice.
- **Server-side upload rejection is untested.** `curl -F` a non-PDF and a >5MB file at `/api/resume`
  with a session cookie, bypassing the cosmetic client checks.
- **Neither error boundary has ever rendered.** Zero `$exception` events.
- **Google OAuth has not run since the feature-03 fixes** — the last sign-ins were GitHub.
- **Cross-user isolation is unproven for both RLS and storage.** One user exists and admin tooling
  refuses `SET ROLE`. Storage has no ownership model, so the three `/api/resume*` routes are the only
  enforcement — worth a real test the moment a second account exists.
- **Rotate the InsForge admin API key** if it was ever committed, pushed or deployed. The full-access
  key had been pasted into the public anon-key variable and served to browsers before being replaced.
- **Input masking has not been confirmed in an actual recording.**

**Small, worth doing when convenient:**

- `Button` size `md` is `h-9` but form controls are `h-10`, so any button on a field row needs an
  explicit `h-10`. Consider making `md` `h-10` when feature 09 builds the search controls.
- `tailwindcss@^4` is installed despite `AGENTS.md` saying to lock 3.4. Deliberate (feature 02), but
  the instruction and the lockfile still disagree.
- `progress-tracker.md`'s feature 05 note still calls "Generate Resume from Profile" inert. It is a
  historical statement about feature 05, but it reads as current.
