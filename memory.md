# Memory — Feature 12: Job Details Page (shipped, reviewed, fixed)

Last updated: 2026-08-02

Phase 4 is half done. Features 01–12 are complete and **merged to `main`**. Next is feature 13,
Company Research Agent — which wires the Research Company button feature 12 shipped inert **and**
backfills the job description (see the Feature 13 note in `build-plan.md`; it is not optional).

Feature 12 has now had a `/review` pass and a partial browser pass. Nine findings were fixed, plus a
tenth raised from the browser. See "Review fixes" below — several are rules, not one-off patches.

## What was built

`/find-jobs/[id]` — the whole job rendered from its `jobs` row. Zero Client Components; everything is
static or a `Link`.

- **`app/find-jobs/[id]/page.tsx`** — new. `max-w-4xl` reading column (following `/profile`, not the
  1440px container `/find-jobs` uses), a Back to Jobs link, then a `space-y-6` stack of five cards.
- **`components/job-details/`** — new folder, five components matching `architecture.md` name for
  name: `JobInfo` (header card + the four fact cards, as one fragment), `MatchScore` (AI reasoning
  card + skills card), `JobDescription`, `CompanyResearch`, `JobActions`.
- **`lib/jobs.ts`** — gained `JOB_DETAIL_COLUMNS`, a module-private `JobDetailSchema` and the
  exported `fetchJob`.
- **`lib/utils.ts`** — gained `matchBadge` and `formatJobType`.
- **`types/index.ts`** — gained `JobDetail`.
- **`components/find-jobs/JobsTable.tsx`** — the row `href` feature 09 left out has landed.
- Docs updated: `progress-tracker.md`, `ui-registry.md`, `architecture.md`, `build-plan.md`
  (feature 12 correction note).

## Decisions made

- **The match badge is not the match bar, and the two must stay separate functions.** `matchBadge()`
  keys on `MATCH_THRESHOLD` (70) per `ui-tokens.md`'s Status Badges table; `matchScoreFill()` keys on
  the design's 90/80 bands. That is why the design draws an 85% badge *green* while an 85 bar is
  *blue*. They answer different questions — "did it clear the bar" vs "where in the range does it
  sit". **Do not collapse them.**
- **Missing skills are purple, not red.** `build-plan.md` said "red/orange badges"; `ui-tokens.md`
  and the design both say `bg-accent-muted` / `text-accent`. Two sources beat one, and a gap skill is
  what feature 13 turns into a strategy, not an error. The plan was corrected.
- **`company_research` is not selected by the read at all.** Feature 12 draws the empty state only.
  Feature 13 must add the column to the select, the dossier markup and the button handler *together*
  — otherwise there is a window where the card reports "No research yet" over a dossier that exists.
- **The Research Company button is inert.** Same full-UI-then-wire split features 09 and 10 made on
  Find Jobs. The design draws it active and the empty-state copy tells the user to click it, so it is
  not disabled; it is documented instead.
- **Every section renders only if it has content, and whole cards can return `null`.** No
  `match_reason` → no reasoning card. Both skill arrays empty → no skills card. Nothing in any
  description column → no Job Description card. Feature 10 warned this page would be thinner than the
  design; the honest way to be thinner is to render less, not to render empty headings.
- **A malformed id is a 404, not an error page.** `fetchJob` shape-checks the uuid before querying.
  A missing row returns null → `notFound()`; a read failure or an unparseable row throws.
- **The row link is one link, not five.** A `<tr>` cannot wrap an `<a>`, so the company name is the
  link with `before:absolute before:inset-0` stretching it over a `relative` row. Accessible name is
  "Company — Title" via an `sr-only` span. The focus ring moved onto the pseudo-element, because
  `focus-within:bg-surface-secondary` is a 1.04:1 change and is not a focus indicator.
- **An absent fact is `—` plus an `sr-only` "Not stated".** An em dash alone is announced as
  "em dash", and with `job_type` null on every row this is the common case, not the edge one.
- No new PostHog event. Still seven.

## Problems solved

- **PostgREST answers a malformed uuid with `22P02 invalid input syntax for type uuid`**, which
  arrives as a *read failure* — so a hand-typed `/find-jobs/nope` would have rendered the error
  boundary instead of a 404. Reproduced accidentally by passing a non-uuid `user_id` during
  verification. The id guard in `fetchJob` is what prevents it.
- **Tailwind escapes colons in the emitted selector.** A grep for `before:content-['']` and
  `focus-visible:before:ring-accent` reported them missing from the CSS; the real selectors are
  `.before\:content-\[\'\'\]` and `focus-visible\:before\:ring-accent`, and all ten new classes were
  present. **Check the escaping before concluding Tailwind dropped a class.**
- **JSX collapses a newline into a space.** `{company}` on one line and `&apos;s` on the next
  rendered "Marlabs LLC 's". Caught by reading the markup back, not by review.

## Current state

- `npx tsc --noEmit`, `npm run lint` and `npm run build` all clean. Every route `ƒ`,
  `/find-jobs/[id]` registered. Both temporary verification routes deleted and confirmed 404.
- **Verified by execution:** the parse path over seven shapes against a row copied verbatim from the
  live table (null arrays → `[]`, undefined text → `null`, extra keys stripped, missing title /
  string score / bare string all rejected); the id guard with a discriminating negative control —
  `nope`, `1' OR '1'='1`, `" "` and a truncated uuid all returned 404 **without touching the
  database**, while two well-formed uuids reached PostgREST and came back `42501 permission denied`;
  `matchBadge` at 69/70/85; `formatJobType` over all six inputs; the rendered markup over three job
  shapes including a bare row that correctly dropped four elements; one `<a>` per table row with the
  right href; and all ten new selectors present in the emitted CSS.
- **The page has now rendered for a signed-in user, once.** Clicking a row through works — that pass
  is what surfaced the truncated-description complaint. **Still unexercised:** the back link, View
  Job Post and Apply Now actually opening Adzuna, the not-found page for a valid-but-absent uuid, the
  loading skeleton, responsive stacking, and the keyboard focus ring on a row.
- **The page cannot look like its design, and that is the data, not the page.** Live table: top
  `match_score` is **65**, so every job renders the grey Low Match badge and the green one is
  unreachable; `job_type` is null on all 20 rows, so Job Type always reads `—`; every salary is a
  single figure because `salary_min == salary_max`; and the four description arrays are empty by
  feature 10's design, so Job Description is one paragraph. **Do not "fix" the page to match the
  picture.**
- Database unchanged this session: 1 profile, 2 `agent_runs`, 20 jobs, one user.
- **Git: features 10, 11 and 12 are all merged to `main`** (`f79e529 Merge feature 12: job details
  page UI`). The review fixes live on `fix/12-review-findings`, branched off that merge and pushed.

## Review fixes — the ones that are rules, not patches

- **`notFound()` needs a `not-found.tsx` with `AppNavbar`.** Without one Next serves a bare 404 with
  no navigation, which is the dead-end `architecture.md` made an invariant. `not-found.tsx` takes no
  props, so it reads the session itself via the cached `getSessionUser()`.
- **Any row link into a protected dynamic route gets `prefetch={false}`.** Twenty rows defaulted to
  twenty `requireUser()` calls and twenty job reads fired by scrolling. `loading.tsx` is what keeps
  the click immediate instead — and it costs the route its hard 404 (streamed headers ⇒ 200 +
  `robots: noindex`), which is free behind auth.
- **A fill colour is not the colour that goes on top of it.** Third time this project has hit it:
  `text-success` on its own tint was 2.4:1 → `text-success-foreground`; gap chips were 4.2:1 →
  `text-accent-dark`. `DossierPreview` still has the old pairing — noted in `ui-tokens.md`.
- **Third-party URLs are scheme-checked before they become `href`s.** `safeExternalUrl()` gates both
  job URLs inside `JobDetailSchema`, so `JobDetail` only ever carries http/https.
- **Text the app displays but did not author, and cannot show in full, says who cut it and where the
  rest is.** Silence reads as a bug — it was reported as one.
- **Never run `next build` while `next dev` owns the same `.next`.** It rewrites `.next/server`,
  `.next/static` and `BUILD_ID` under the live server, and the dev worker dies with `Jest worker
  encountered N child process exceptions` — **no application error is logged**, so it looks like a
  bug in whichever route was requested. That cost real time this session. Also: the dev log prints
  12-hour time with no AM/PM, so a `02:13` entry is 14:13.

## Next session starts with

1. **Merge `fix/12-review-findings` into `main`.** It is pushed but not merged.
2. **Finish the browser pass for features 11 and 12.** For 11: type in the filter (watch the 300ms
   debounce and that the caret never jumps), switch both selects, confirm the back button does not
   un-type, hit `?page=99` and confirm it clamps, and check High Match shows the *filtered* empty
   sentence. For 12: Back to Jobs, both external links, a valid-but-absent uuid for the not-found
   page, and the loading skeleton. **Pagination still cannot be exercised** — 20 rows at 20 per page
   is one page, so a 21st row or a lowered `JOBS_PAGE_SIZE` is needed.
3. **Fix the country defect** — add `in` and the other Adzuna markets to `ADZUNA_COUNTRIES` in
   `lib/adzuna.ts`, **and** surface the market actually searched in the result banner (`agent_logs`
   already records it: "Adzuna returned 10 **us** listings"). Delete the ten Indianapolis rows after.
4. **Run the same search twice** — still never done. Two runs have happened but they were different
   searches, so the dedupe path has never executed. Row count must not change, `found_at` must not
   move, `run_id` must move to the new run, a hand-set `company_research` must survive.
5. **Feature 13 — Company Research Agent.** It must add `company_research` to the select, the
   nine-field dossier markup and the button handler together, and it needs a `"use client"` boundary
   in `CompanyResearch` for the first time.

## Open questions

**Feature 12:**

- Nothing has run in a browser.
- **The design's header badge is unreachable with current data** (top score 65). Confirm the green
  variant renders once a job scores 70+.
- The Back to Jobs link points at bare `/find-jobs` and drops the list's filter. The browser back
  button preserves it. Judged acceptable; revisit if it reads as a bug in the browser pass.

**Feature 11:**

- Nothing has run in a browser. Pagination cannot be tested until a 21st row exists.
- Should a new search reset the filters? Today it does not: with `match=high` active, a search can
  report "Found 10 jobs" above a table saying "No jobs match these filters". Judged honest and left
  alone, but it will look like a bug the first time someone hits it.

**Feature 10, still open:**

- **The country defect is unfixed** — an unsupported country returns confidently wrong results
  (India → Indianapolis). Oldest open item.
- **The dedupe path has never executed.**
- **The completeness gate, the error banner, the zero-result sentence and Enter-to-submit** are all
  unexercised, as is the skip-and-log path for a failed score (no score has ever failed).
- **`job_found` has never been confirmed arriving** — server-side through `posthog-node`, needs
  PostHog's Activity view.
- `gb` and `us` have run. `au` and `ca` have not; `in` is unsupported.

**Carried forward, still open:**

- **Features 07 and 08 have never been clicked in a browser.** Extract, Generate, the confirm step,
  the two disabled states, `ResumePreview` after a generated resume.
- **The first real click of Generate destroys the uploaded resume feature 07 extracts from.**
- **A real-world resume has never been through extraction** — only a generated single-column PDF.
- **The comma-separated → `text[]` split has never run.**
- **`profile_completed` has not been confirmed arriving**, and it should fire exactly once.
- **Server-side upload rejection is untested** — `curl -F` a non-PDF and a >5MB file at
  `/api/resume` with a session cookie.
- **Neither error boundary has ever rendered.** Zero `$exception` events.
- **Google OAuth has not run since the feature-03 fixes** — every sign-in so far has been GitHub.
- **Cross-user isolation is unproven for both RLS and storage.** One user exists and admin tooling
  refuses `SET ROLE`. Storage has no ownership model, so the three `/api/resume*` routes are the
  only enforcement.
- **Rotate the InsForge admin API key** if it was ever committed, pushed or deployed. The
  full-access key had been pasted into the public anon-key variable and served to browsers before
  being replaced.
- **Input masking has not been confirmed in an actual recording.**
- **Responsive behaviour has never been looked at on `/find-jobs` or `/find-jobs/[id]`** — horizontal
  scroll under 720px, the stacking of the search row, filter bar, job header row and fact grid, row
  hover, select focus rings, and how the table reads on a phone.

**Small, worth doing when convenient:**

- `Button` size `md` is `h-9` while form controls are `h-10`, so buttons on a field row carry an
  explicit `h-10`. Two of them.
- `tailwindcss@^4` is installed despite `AGENTS.md` saying to lock 3.4. Deliberate (feature 02), but
  the instruction and the lockfile still disagree.
- The ten Indianapolis rows are still in `jobs`, now joined by ten Virginia ones. Both will skew
  feature 15's stats.
- ESLint suggests `max-w-[1440px]` → `max-w-360` and `min-w-[720px]` → `min-w-180`. Warnings only,
  and the arbitrary values match `ui-registry.md`'s documented page container.
