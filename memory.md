# Memory — Feature 11: Filter + Sort + Pagination (built, uncommitted, never run in a browser)

Last updated: 2026-08-02

Phase 3 is complete. Features 01–11 done. Next is feature 12, Job Details Page — which also adds
the row `href` the jobs table has been waiting for since feature 09.

**Read this first: feature 11 is uncommitted, and it is sitting on the feature-10 branch.** See Git
under Current state before doing anything else.

## What was built

Feature 11 wires the filter bar, both sorts, the text filter and every pagination control to the
`jobs` read. No new components — feature 09 wrote the option values as the filter and sort keys
precisely so this feature would only add behaviour.

- **`lib/jobs.ts`** — gained `JOBS_PAGE_SIZE`, `parseJobQuery`, `jobsHref`, `toMatchFilter`,
  `toJobSort`, a module-private `quoteFilterValue` / `readJobPage`, and the exported `fetchJobPage`.
  It now owns URL parsing, link building and the filtered/sorted/paged read.
- **`types/index.ts`** — added `JOB_MATCH_FILTERS`, `JOB_SORTS`, `JobMatchFilter`, `JobSort`,
  `JobQuery`.
- **`components/find-jobs/JobFilters.tsx`** — now a Client Component. Markup unchanged; it gained a
  `query` prop and three handlers.
- **`components/find-jobs/JobsPagination.tsx`** — still a Server Component. Takes
  `query` / `totalResults`; `pageSize` is gone as a prop. Module-local `PageControl` renders a
  `Link` when there is somewhere to go and a disabled `Button` when there is not.
- **`components/find-jobs/JobsTable.tsx`** — takes `filtered` and swaps the empty-state sentence.
- **`app/find-jobs/page.tsx`** — takes `searchParams`, calls `parseJobQuery` then `fetchJobPage`,
  and folds the *resolved* page back into one `listQuery` both controls receive.
- Docs updated: `progress-tracker.md`, `architecture.md`, `ui-registry.md`, `build-plan.md`
  (feature 11 correction note).

## Decisions made

- **All four controls live in the URL** — `?q=&match=&sort=&page=` — not in component state. Keeps
  the read in the Server Component (`code-standards.md` forbids fetching in a Client Component) and
  makes refresh, back and a shared link reproduce the same list. The alternative would have put a
  second copy of the query in the browser for the server's to drift from.
- **Every sort ends with `id`, and it is load-bearing.** `found_at` defaults to `now()`, which is
  *transaction* time, so all ten rows of one discovery run share a millisecond — verified against
  the live table. Score ties are just as common. Without a unique final key a paged read repeats one
  row and drops another.
- **Filter text is double-quoted before it reaches PostgREST's `or()`.** Verified both directions —
  see Problems solved.
- **The default sort is Match Score**, matching what the select has displayed since feature 09.
  Feature 10's read was newest-first, so the visible ordering changed with this feature.
- **A `?page=` past the end is clamped**, costing one extra round trip only when the first read came
  back empty against a non-zero total. The controls always get the resolved page, never the
  requested one.
- **The empty state has two sentences.** "No jobs yet, go and search" is wrong for someone whose
  jobs a filter is hiding. No CTA — the filter bar is directly above and is itself the way out.
- **Selects controlled, text input not.** A controlled `<select>` re-renders in place and stays in
  step with the URL for free. The text input keeps `defaultValue` and is never re-seeded: its 300ms
  debounced `replace` lands while the user is still typing, so a value fed back from the server
  would race the keyboard and drop characters. **Do not "fix" this into a controlled input.**
- **Filters `replace`, pagination `push`es.** A history entry per keystroke turns back into a way to
  un-type; paging is a step a user does expect to walk back.
- No new PostHog event. Still seven.

## Problems solved

- **PostgREST's `or()` argument is parsed by PostgREST itself**, so an unquoted comma, dot or
  parenthesis in filter text is read as syntax and fails the whole request — and this page treats a
  read failure as fatal, so it would be a blank page, not a bad result. **This user's own rows
  include a company called "SimVentions, Inc - Glassdoor ✪ 4.6".** Proved both directions through a
  temporary route: six awkward strings all reached `42501 permission denied` (so they parsed), while
  the same text unquoted returned `PGRST100 failed to parse logic tree`.
- **A `PostgrestError` logs as literally `{}`** in `.next/dev/logs/next-development.log`, despite
  carrying `code` / `details` / `hint` / `message`. `readJobPage` now logs `error.code` and
  `error.message` by name. **Do not trust a log line that prints a whole SDK error object.**
- **The MCP `run-raw-sql` tool rejects CTEs with `UNION ALL`** ("could not be parsed and was
  rejected for security reasons"). Use several simple queries with `count(*) FILTER (WHERE …)`.

## Current state

- `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Every route `ƒ`. The temporary
  verification route was deleted and confirmed 404.
- **Verified by execution, without a session:** `parseJobQuery` over eight hostile inputs (unknown
  enums → defaults, `page` of `0` / `-4` / `abc` → 1, `"2.7"` → 2, repeated `?q=` → first value, a
  140-char filter cut to 100); `jobsHref` round trips including `a&b=c?d#e` → `?q=a%26b%3Dc%3Fd%23e`;
  the `or()` quoting with its negative control; and SQL semantics against the live rows —
  `ILIKE '%oracle%'` and `'%ORACLE%'` both match 7 of 20, the comma-bearing company matches 10,
  `match_score >= 70` is **0** rows and `< 70` is 20.
- **Nothing in feature 11 has rendered for a signed-in user.** Every control, the debounce, the
  clamp, both empty-state sentences and `Link` navigation are unexercised.
- **Pagination cannot be exercised by the current data** — 20 rows at 20 per page is exactly one
  page. A 21st row is needed before Previous / Next / page numbers leave their single-page state.
- **The database changed under this session.** Someone ran a search in the browser at 07:50Z while
  the work was in progress — a *different* location (Virginia), so it inserted ten new rows rather
  than deduping. The table now holds **1 profile, 2 `agent_runs`, 20 jobs**, one user. Because
  `match_score >= 70` is 0 rows, **High Match currently renders the filtered empty state** and Low
  Match renders everything — convenient for a browser pass.
- **Git: feature 11 is uncommitted and sitting on `feat/10-adzuna-job-discovery`.** That branch has
  six commits, is not merged and not pushed; `main` is level with `origin/main` at `90de227`.
  Uncommitted: `app/find-jobs/page.tsx`, `components/find-jobs/{JobFilters,JobsPagination,JobsTable}.tsx`,
  `lib/jobs.ts`, `types/index.ts`, and four `context/*.md` files, plus `memory.md`. The saved
  convention is a branch per build-plan feature (`feat/NN-slug` off `main`), which this does not
  follow — decide whether to merge 10 first and re-branch, or commit 11 where it stands.

## Next session starts with

1. **Sort out the git story before writing more code.** Feature 11's changes are uncommitted on the
   feature-10 branch. Either merge 10 to `main` and cut `feat/11-filter-sort-pagination`, or commit
   11 onto the existing branch and merge both. Nothing has ever been pushed.
2. **Browser pass for feature 11.** Type in the filter (watch the 300ms debounce and that the caret
   never jumps), switch both selects, confirm the URL updates and the back button does not un-type,
   hit `?page=99` by hand and confirm it clamps, and check High Match shows the *filtered* empty
   sentence rather than "No jobs yet". To test pagination at all, either add a 21st row or
   temporarily drop `JOBS_PAGE_SIZE`.
3. **Fix the country defect** — add `in` and the other Adzuna markets to `ADZUNA_COUNTRIES` in
   `lib/adzuna.ts`, **and** surface the market actually searched in the result banner (`agent_logs`
   already records it: "Adzuna returned 10 **us** listings"). Delete the ten Indianapolis rows after.
4. **Run the same search twice** — still never done. Two runs have happened but they were different
   searches, so the dedupe path has never executed. Row count must not change, `found_at` must not
   move, `run_id` must move to the new run, a hand-set `company_research` must survive.
5. **Feature 12 — Job Details Page.** Remember the description arrays are empty by design, so render
   only sections that have content. It also adds the table row `href`.

## Open questions

**Feature 11:**

- Nothing has run in a browser. Pagination specifically cannot be tested until a 21st row exists.
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
- **Feature 09's responsive behaviour has never been looked at** — horizontal scroll under 720px,
  the stacking of the search row and filter bar, row hover, select focus rings, the table on a phone.

**Small, worth doing when convenient:**

- `Button` size `md` is `h-9` while form controls are `h-10`, so buttons on a field row carry an
  explicit `h-10`. Two of them.
- `tailwindcss@^4` is installed despite `AGENTS.md` saying to lock 3.4. Deliberate (feature 02), but
  the instruction and the lockfile still disagree.
- The ten Indianapolis rows are still in `jobs`, now joined by ten Virginia ones. Both will skew
  feature 15's stats.
- ESLint suggests `max-w-[1440px]` → `max-w-360` and `min-w-[720px]` → `min-w-180`. Warnings only,
  and the arbitrary values match `ui-registry.md`'s documented page container.
