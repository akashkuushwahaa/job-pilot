# Memory — Feature 15: Stats Bar, Real Data

Last updated: 2026-08-03

Features 01–14 are complete and **merged into `main`** (`05c6fcd`). Feature 15 is built and verified
but **uncommitted**, sitting in the working tree of `feat/14-dashboard-page`.

**Three things the last memory got wrong, all checked this session against the live database and
against git:**

- **Feature 13's research agent HAS run — twice, successfully, end to end.** The claim that no
  Browserbase session had ever been created from this codebase is false.
- **`feat/13-company-research` is merged.** So is feature 14. `main` is at "Merge features 13 and 14".
- **The `jobs` table holds 30 rows, not 20**, and two of them carry a complete dossier.

## What was built

**Feature 15 — Stats Bar (Real Data).** `mockStats()` replaced by `fetchDashboardStats()` in
`lib/dashboard.ts`. **No component changed** — feature 14 built the cards against `DashboardStat[]`,
so only the source of the array moved. That split is now proven, which is the strongest signal that
features 16 and 17 will be one-function swaps too.

- **`lib/dashboard.ts`** — `fetchDashboardStats()`, `buildStats()` and `parseStatRows()`, alongside
  the four mock functions features 16 and 17 still own.
- **`types/index.ts`** — `DashboardStat.value` became `string | null`.
- **`components/dashboard/StatCard.tsx`** — renders the em dash with an `sr-only` replacement when
  `value` is null, the treatment `JobInfo` established for an absent fact.
- **`app/dashboard/page.tsx`** — the profile read and the stats read now run concurrently.

## Decisions made

- **Two queries, not four.** One selects `match_score, found_at` for the user's rows; one is a
  `head: true` count with `.not("company_research", "is", null)`. Totals, average, the week bucket
  and both previous-week baselines all fall out of the first result set. The research count stays
  separate because the alternative is selecting `company_research` itself — pulling every dossier on
  the account across the wire to answer a question about how many there are.
- **The average is computed in JS, not by Postgres.** PostgREST exposes aggregate functions only when
  the server enables `db-aggregates-enabled`, and nothing on the client can prove that is on. Left as
  an open question rather than assumed either way.
- **"vs last week" compares the value now against the value seven days ago**, not this week's jobs
  against last week's. Total Jobs Found is cumulative, so that is the only reading of a badge on it
  that is true.
- **Both badges are a relative percentage**, so "+12%" means the same thing on the count as on the
  rate. A percentage-point delta on the match rate would render "+3%" for 79% → 82% — a different
  claim wearing the same badge.
- **No previous value means no badge, and the caption changes with it** — "All time" and "Across all
  jobs". "vs last week" under a number with nothing beside it reads as a missing element.
- **No scored job means no average, and that is not 0%.** A rate of zero is a claim about the quality
  of someone's matches; the absence of one is not.
- **An unscored row counts towards Total Jobs Found and towards nothing else.** `match_score` parses
  as `.nullable().catch(null)`, never `.catch(0)` — folding a missing score in as zero would report a
  worse match rate than the user actually has.
- **A dashboard read failure throws.** A dashboard silently reporting zeroes because a query failed
  is worse than one that says it broke: the user reads "0 jobs found" as their data being gone.

Carried from feature 14 and still load-bearing:

- **There is no charting library.** `build-plan.md` feature 17 names recharts; the three charts are
  static markup plus one `<svg>`, entirely server-rendered. **Confirmed with the developer before
  building.** Feature 17 changes the data source and nothing else.
- **`preserveAspectRatio="none"` + `vector-effect="non-scaling-stroke"`** is what makes the
  hand-rolled line chart responsive without JavaScript. The second attribute is not optional.
- **Whole-number data only gets whole-number axis ticks.** Every series here counts things.

## Problems solved

- **The stats had to be verified against something real, not just against fixtures.** Pulled all 30
  live rows out of Postgres and fed them through the real `parseStatRows` + `buildStats`. Result —
  30 / 51% / 2 / 30 — matches Postgres's own `count(*)`, `avg(match_score)` = 50.67,
  `count(*) FILTER (company_research IS NOT NULL)` = 2 and the 7-day filter exactly. **Do this
  whenever a feature computes a number the database can also compute.**
- **A quoted bash heredoc mangles long markdown**, and this cost time twice. Write the block with a
  file tool and append it with PowerShell `Add-Content`, or edit with a Python heredoc. Same class as
  the PowerShell here-string that broke `git commit -m` in feature 13.
- **`Get-Content | Measure-Object -Line` skips empty lines**, so it under-reports a file's length and
  looks like an append truncated the file. Use `git diff --stat` to confirm an append landed.

## Current state

- `tsc`, lint and `npm run build` all clean. Every route still `ƒ`. `/dashboard` 307s to `/login`
  signed out.
- **Verified by execution:** 25 checks over `buildStats` / `parseStatRows` — a normal account, an
  empty one, a first-week one, a week where the rate fell, an unscored row, the exact seven-day
  boundary, and rows with an unusable `found_at` — then the live-data comparison above.
- **What `/dashboard` will render today:** 30 / 51% / 2 / 30, with **no trend badges**, because all
  30 rows were discovered on one day (2026-08-02) and there is no previous week.
- **Feature 13's research agent ran twice on 2026-08-02**, per `agent_logs`: Voto Consulting
  (16:36:22 → 16:37:18) and Oracle (16:53:24 → 16:54:25). Each read **4 pages** on the real employer
  homepage (`votoconsulting.com`, `oracle.com`) and saved a nine-field dossier carrying 4 `sources`.
  No warnings, no errors. **So the browse phase, both extraction schemas, the synthesis prompt and
  the redirect-to-homepage derivation are all exercised and working.**
- **Git:** `main` @ `05c6fcd` has features 01–14. `feat/14-dashboard-page` @ `011dc38` is pushed and
  merged. Feature 15 is uncommitted **on the feature-14 branch**, which breaks the one-branch-per-
  feature rule — it wants `feat/15-stats-bar` off `main`.

## Next session starts with

1. **Branch and commit feature 15.** `feat/15-stats-bar` off `main`, then move the seven modified
   files onto it. Nothing for feature 15 has been committed.
2. **Open `/dashboard` signed in.** Still never done — every browser pass ran against a temporary
   unauthenticated preview route. Confirm `AppNavbar`, the four real cards and that the completion
   banner stays hidden for this complete profile. **The two PostgREST calls in `fetchDashboardStats`
   have never executed against the live API** — an anonymous request cannot reach the rows, so this
   click is what proves `company_research=not.is.null` is emitted as intended.
3. **Feature 16 — Recent Activity, real data.** Decide the shape first: a research run writes **no
   `agent_runs` row**, so merging searches and researches must read `agent_logs` (or the `jobs` rows)
   rather than `agent_runs` alone. This decision is now overdue.
4. **Feature 17 — the three charts on PostHog data.** Replace the three mock functions in
   `lib/dashboard.ts`; `BarChart` / `LineChart` already take `ChartPoint[]`.
5. **Fix the country defect** — add `in` and the other Adzuna markets to `ADZUNA_COUNTRIES`, surface
   the market actually searched in the result banner, then delete the ten Indianapolis rows.
6. **Run the same search twice** — the dedupe path has still never executed.

## Open questions

**Feature 15:**

- **Are PostgREST aggregate functions enabled on this backend?** If so, `select("match_score.avg()")`
  replaces the row-by-row average and the read stops growing with the account. Needs one live
  authenticated call.
- **No trend badge can render with today's data.** The three tones were confirmed in the browser with
  fixtures; a badge driven by real data has not been seen.
- The ten Indianapolis rows and ten Virginia rows are still in `jobs` and are skewing these numbers
  right now.

**Feature 14:**

- **`/dashboard` has never been opened signed in.**
- Chart category labels use `whitespace-nowrap` and would overlap rather than wrap if a future series
  had long labels in a narrow card.
- The Recent Activity connector is coupled to `space-y-6` via `-bottom-6`; change both together.
- The `pl-10` axis gutter fits ticks up to four characters. Counts in the thousands sit ~2px into the
  card padding — visible, not broken.

**Feature 13 — now much smaller than it was:**

- **Still unseen: the dossier card rendered in a browser**, the `company_researched` PostHog event
  arriving, and the "a re-run may only add" guard holding on a second click of the same job.
- Research runs open no `agent_runs` row — feature 16 must not read that table alone.
- **No rate limiting on `/api/agent/research`.** Each call costs a Browserbase session and two GPT-4o
  calls, and any authenticated user can hammer it. `/api/agent/find` has the same exposure.
- Two concurrent research runs silently degrade one to synthesis-only; the free plan allows one
  session.
- `NOT_THE_EMPLOYER` is hand-maintained and incomplete (`applytojob.com`, `dice.com`,
  `workatastartup.com` are not on it).

**Feature 12:**

- The design's green header badge is now reachable — three rows score 85. Worth confirming it renders.
- The Back to Jobs link drops the list's filter; the browser back button preserves it. Accepted.

**Feature 11:**

- **Pagination is now testable** — 30 rows at 20 per page is two pages. It has still never been
  exercised.
- Should a new search reset the filters? Today it does not.

**Feature 10, still open:**

- **The country defect is unfixed** — India → Indianapolis. Oldest open item.
- **The dedupe path has never executed.**
- The completeness gate, the error banner, the zero-result sentence and Enter-to-submit are all
  unexercised, as is the skip-and-log path for a failed score.
- **`job_found` has never been confirmed arriving** — server-side, needs PostHog's Activity view.
- `gb` and `us` have run. `au` and `ca` have not; `in` is unsupported.

**Carried forward, still open:**

- **Features 07 and 08 have never been clicked in a browser.**
- **The first real click of Generate destroys the uploaded resume feature 07 extracts from.**
- **A real-world resume has never been through extraction.**
- **The comma-separated → `text[]` split has never run.**
- **`profile_completed` has not been confirmed arriving**, and it should fire exactly once.
- **Server-side upload rejection is untested** — a non-PDF and a >5MB file at `/api/resume`.
- **Neither error boundary has ever rendered.** Zero `$exception` events.
- **Google OAuth has not run since the feature-03 fixes** — every sign-in so far has been GitHub.
- **Cross-user isolation is unproven for both RLS and storage.** One user exists.
- **Rotate the InsForge admin API key** if it was ever committed, pushed or deployed. (`.mcp.json` is
  gitignored and the key was not in git history as of feature 13.)
- **Input masking has not been confirmed in an actual recording.**
- **Responsive behaviour has never been looked at on `/find-jobs` or `/find-jobs/[id]`**, or on the
  dossier card. `/dashboard` is still the only page with a real responsive pass.

**Small, worth doing when convenient:**

- `Button` size `md` is `h-9` while form controls are `h-10`, so two buttons carry an explicit
  `h-10`.
- `tailwindcss@^4` is installed despite `AGENTS.md` saying to lock 3.4. Deliberate (feature 02), but
  the instruction and the lockfile still disagree.
- ESLint suggests `max-w-[1440px]` → `max-w-360` and `min-w-[720px]` → `min-w-180`. Warnings only.
