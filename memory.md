# Memory — Features 15 and 16: Dashboard on Real Data

Last updated: 2026-08-03

Phase 5 is three quarters done. Features 01–14 are merged into `main`; features 15 and 16 are built,
verified, committed and pushed on `feat/16-recent-activity` — **six commits ahead of `main` and not
yet merged.** Only feature 17 remains.

## What was built

**Feature 15 — Stats Bar (Real Data).** `mockStats()` → `fetchDashboardStats()` in
`lib/dashboard.ts`. Two queries: one selecting `match_score, found_at` for the user's rows, one
`head: true` count filtered on `company_research`. `DashboardStat.value` became `string | null` and
`StatCard` renders an em dash with an `sr-only` replacement for it.

**Feature 16 — Recent Activity (Real Data).** `mockActivity()` → `fetchRecentActivity()`, merging
completed `agent_runs` with researched `jobs`. This needed a schema change first — see below.

- `migrations/20260803090000_jobs-researched-at.sql` — **applied to the live database and read
  back.** Adds `jobs.researched_at`, backfills the two existing dossier rows from the last
  `agent_logs` line of each research run, and adds a partial index on
  `(user_id, researched_at DESC)`.
- `agent/research.ts` — `saveDossier` now writes `researched_at` in the same statement as the
  dossier.
- `agent/adzuna.ts` — `researched_at` documented alongside `company_research` and `found_at` in the
  upsert-omission list.

**Neither feature changed a single component.** Feature 14 built `StatsBar` against
`DashboardStat[]` and `RecentActivity` against `ActivityEntry[]`, so both features swapped a data
source and nothing else. That split is now proven twice and feature 17 should be the same shape.

## Decisions made

- **A `jobs` row had no timestamp for its dossier, and `found_at` could not stand in.** `found_at` is
  when the job was *discovered*; on the live rows that is **seven to nine hours before** the research
  actually ran (Oracle: found 07:33:54, researched 16:54:25). Sorting the feed on it would have put
  the oldest research entry first and rendered "Yesterday" under a run that finished minutes earlier.
  Hence the new column.
- **The timestamp is a column, not a string match on `agent_logs`.** Deriving it from the "Saved a
  company dossier for X" message was rejected twice over: `agent/logs.ts` is explicitly allowed to
  fail silently, so a run can succeed while writing no log row at all, and keying on prose a future
  edit can reword is the failure mode `JobDescription` already documents.
- **`researched_at` never appears in the discovery upsert.** A re-discovery that reset it would move
  a research entry to the moment the job was re-found. Now an `architecture.md` invariant.
- **Only `completed` runs become activity entries.** This account has one failed run; "Found 0 jobs
  for Frontend Developer" is a different claim from "that search failed", and a failure entry would
  need a third dot colour that neither the design nor `ui-tokens.md` defines.
- **Zero is a real outcome** — "No jobs found for X", not "Found 0 jobs". Singular gets "1 job".
- **Entry ids are namespaced** (`run-…` / `job-…`) since the halves come from different tables, and
  an exact timestamp tie breaks on id so the order cannot shift between requests.
- **Each activity source is read to the full display limit before merging**, otherwise five searches
  and no research would show three entries.
- **"vs last week" compares the value now against the value seven days ago**, not this week's jobs
  against last week's — Total Jobs Found is cumulative. Both badges are a *relative* percentage so
  "+12%" means one thing on the count and on the rate.
- **No previous value → no badge and a different caption** ("All time" / "Across all jobs"). **No
  scored job → no average**, rendered as an em dash. 0% is a claim about match quality; the absence
  of a rate is not.
- **The match-rate average is computed in JS over the rows**, because PostgREST exposes aggregate
  functions only when the server enables them and the client cannot prove that.
- **A dashboard read failure throws** rather than degrading to zeroes — a user reads "0 jobs found"
  as their data being gone.

## Problems solved

- **Verify a computed number against the database, not just against fixtures.** For both features the
  real rows were pulled out of Postgres and fed through the real functions. Feature 15 produced
  30 / 51% / 2 / 30, matching `count(*)`, `avg(match_score)` = 50.67 and both filters exactly.
  Feature 16 produced the exact five-entry feed, newest first, with the failed run absent. **Do this
  whenever a feature computes something the database can also compute.**
- **A quoted bash heredoc mangles long markdown**, and this cost time repeatedly. Write the block
  with a file tool and append it with PowerShell `Add-Content`, or edit with a Python heredoc. Same
  class as the PowerShell here-string that broke `git commit -m` in feature 13 — **use `git commit -F`
  with a message file, always.**
- **`Get-Content | Measure-Object -Line` skips empty lines**, so it under-reports a file's length and
  looks like an append truncated it. Use `git diff --stat` to confirm an append landed.

## Current state

- `tsc`, lint and `npm run build` all clean. Every route still `ƒ`. `/dashboard` 307s to `/login`
  signed out. Working tree clean.
- **Verified by execution:** 25 checks over `buildStats` / `parseStatRows`, 15 over `buildActivity`,
  then the live-row comparison for each.
- **What `/dashboard` will render today:** stat cards 30 / 51% / 2 / 30 with **no trend badges** (all
  30 rows were discovered on one day, so there is no previous week), and this feed:
  Researched Oracle → Researched Voto Consulting LLC → Found 10 jobs for Frontend Developer → Found
  10 jobs for Software Developer → Found 10 jobs for Backend Developer.
- **Live database:** 30 jobs (1 user), 2 with a complete nine-field dossier and a backfilled
  `researched_at`; 4 `agent_runs` — 3 completed, 1 failed.
- **Feature 13's research agent has run twice, end to end**, on 2026-08-02: Voto Consulting
  (16:36:22 → 16:37:18) and Oracle (16:53:24 → 16:54:25), each reading 4 pages on the real employer
  homepage and saving a dossier with 4 `sources`. The browse phase, both extraction schemas, the
  synthesis prompt and the redirect-to-homepage derivation are all exercised and working.

**Git:**

- `main` @ `05c6fcd` — features 01–14.
- `feat/15-stats-bar` @ `c6d2761` — pushed, unmerged.
- `feat/16-recent-activity` @ `7526e3d` — pushed, unmerged, **contains features 15 and 16 together**
  (it was branched off 15, not off `main`, because 16 builds on 15's `lib/dashboard.ts`). Merging 16
  brings 15 with it.
- `chore/ignore-agent-docs` @ `f8b762c` — unrelated work. **Its uncommitted `.gitignore` change is in
  `stash@{0}`** ("WIP chore/ignore-agent-docs: add .claude to .gitignore"); `git stash pop` after
  checking that branch out.

## Next session starts with

1. **Open `/dashboard` signed in.** Still never done — every browser pass ran against a temporary
   unauthenticated preview route. **Six PostgREST calls across features 15 and 16 have never executed
   against the live API**, because an anonymous request cannot reach the rows. What is untested is
   whether the SDK emits `company_research=not.is.null`, `researched_at=not.is.null` and
   `status=eq.completed` as intended — the questions themselves are already proven right against the
   database. One visit closes it for both features.
2. **Feature 17 — Analytics Charts on PostHog data.** The last feature in the build plan. Replace
   `mockResearchActivity()`, `mockJobsFound()` and `mockScoreDistribution()` in `lib/dashboard.ts`;
   `BarChart` and `LineChart` already take `ChartPoint[]` and already have empty states. Note that
   `job_found` and `company_researched` have **never been confirmed arriving in PostHog**, so
   verifying the source comes before writing the queries.
3. **Merge `feat/16-recent-activity` into `main`** once the signed-in pass has passed. It carries 15.
4. **Fix the country defect** — add `in` and the other Adzuna markets to `ADZUNA_COUNTRIES`, surface
   the market actually searched in the result banner, then delete the ten Indianapolis rows.
5. **Run the same search twice** — the dedupe path has still never executed. Now also worth checking
   that `researched_at` survives a re-discovery, which is the new column's version of the same rule.

## Open questions

**Feature 17 (next):**

- **Have `job_found` and `company_researched` ever actually reached PostHog?** Both are server-side
  captures inside `after()`. Feature 17's three charts read them, so if they are not arriving the
  charts will render empty states over data that exists in Postgres. Check PostHog's Activity view
  before building.
- The score-distribution chart could be computed from `jobs.match_score` directly rather than from
  PostHog events — worth deciding which source is authoritative, since Postgres has the rows and
  PostHog has only what was captured.

**Features 15 and 16:**

- **Are PostgREST aggregate functions enabled on this backend?** If so, `select("match_score.avg()")`
  replaces the row-by-row average and the stats read stops growing with the account.
- **No trend badge can render with today's data** — every row was discovered on one day. The three
  tones were confirmed in the browser with fixtures; a badge driven by real data has not been seen.
- A failed search produces no activity entry at all. Reconsider if failures become common.
- The ten Indianapolis rows and ten Virginia rows are still in `jobs` and are skewing the stat cards
  right now.

**Feature 14:**

- Chart category labels use `whitespace-nowrap` and would overlap rather than wrap if a future series
  had long labels in a narrow card.
- The Recent Activity connector is coupled to `space-y-6` via `-bottom-6`; change both together.
- The `pl-10` axis gutter fits ticks up to four characters.

**Feature 13 — much smaller than it was:**

- **Still unseen: the dossier card rendered in a browser**, the `company_researched` event arriving,
  and the "a re-run may only add" guard holding on a second click of the same job.
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

- **Pagination is now testable** — 30 rows at 20 per page is two pages — and has still never been
  exercised.
- Should a new search reset the filters? Today it does not.

**Feature 10, still open:**

- **The country defect is unfixed** — India → Indianapolis. Oldest open item.
- **The dedupe path has never executed.**
- The completeness gate, the error banner, the zero-result sentence and Enter-to-submit are all
  unexercised, as is the skip-and-log path for a failed score.
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
