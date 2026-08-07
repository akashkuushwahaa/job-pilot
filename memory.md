# Memory — Feature 14: Dashboard Page, Full UI (built, reviewed, fixed)

Last updated: 2026-08-03

Phase 5 has started. Features 01–14 are complete. Feature 14 was built, reviewed with `/review`, and
all six findings were fixed in the same session.

Two things carry forward and neither is about feature 14:

- **Feature 13's research agent has still never run.** No Browserbase session has ever been created
  from this codebase. `feat/13-company-research` is still unmerged.
- **Feature 14 has never been seen signed in.** Both browser passes ran against a temporary
  unauthenticated preview route, so `requireUser()`, `AppNavbar` in place and the completion banner
  on the real `/dashboard` are unexercised.

## What was built

`/dashboard` — four stat cards, a Recent Activity timeline and three charts, on mock data. This
deleted the last `ComingSoon` usage, and the component with it.

- **`lib/charts.ts`** — new. `chartScale` (axis ceiling + five ticks), `plotPercent` (bar heights),
  `smoothLinePath` (Catmull-Rom → cubic Béziers), `hasPlottableData` (the empty-state decision).
- **`lib/dashboard.ts`** — new. Five mock functions, one per surface, so features 15/16/17 each
  replace exactly one and touch no component.
- **`components/dashboard/`** — new: `StatsBar`, `StatCard`, `RecentActivity`, `ChartCard`,
  `BarChart`, `LineChart`.
- **`types/index.ts`** — added `DashboardStat`, `ActivityEntry`, `ActivityKind`, `ChartPoint`.
- **`lib/profile.ts`** — gained `fetchProfile()`; `/profile` and `/dashboard` both use it now.
- **`components/layout/ComingSoon.tsx`** — deleted, no callers left.
- Docs updated: `progress-tracker.md`, `ui-registry.md`, `architecture.md`, `build-plan.md`,
  `ui-tokens.md`.

## Decisions made

- **No charting library — recharts was not installed.** `build-plan.md` feature 17 names it. The
  three charts are static (no tooltips, legends or brushing), every recharts default would need
  overriding to reach the design, and it would make all three Client Components. Built as markup plus
  one `<svg>` instead. **Confirmed with the developer before building, because feature 17 inherits
  it.** Same call as feature 01 on cva and feature 05 on the shadcn CLI.
- **Feature 17 changes the data source and nothing else.** `BarChart` / `LineChart` take
  `ChartPoint[]`; swap the mock functions for PostHog reads.
- **Chart geometry lives in `lib/charts.ts`, not in components** — an axis ceiling or a Bézier
  control point can be wrong in ways a screenshot does not reveal, so it has to be runnable.
- **Whole-number data only gets whole-number ticks.** Every series here counts things.
- **`preserveAspectRatio="none"` + `vector-effect="non-scaling-stroke"`** is what makes a hand-rolled
  line chart responsive without JavaScript. The second attribute is not optional.
- **Zero Client Components**, like feature 12's job details page.
- **Two of build-plan 14's five surfaces were from the cut feature set** — the fourth stat card is
  Jobs This Week not Cover Letters Generated, and the third chart is Company Research Activity not
  Resume Tailoring Activity. Design + feature 15 + feature 17 against one stale line each.
- **`AnalyticsCharts.tsx` was not built** — the design does not group the three charts, so it would
  have had to render two non-adjacent parts of the page.
- **The completion banner renders only when the profile is incomplete.**

## Problems solved

- **`ui-tokens.md`'s Activity Dots and Dashboard Chart Colors tables were both stale**, naming resume
  tailoring and cover letters, and the chart table listed raw hex for colours that all had exact
  tokens. Both rewritten in tokens.
- **The design's activity dots encode nothing** — purple on rows 1 and 4, blue on 2, green on 3 and
  5, across two entry types, with purple being the out-of-scope tailoring colour. Built to
  `build-plan.md` feature 16's two-colour rule instead.
- **A `cat >> file << 'EOF'` heredoc got mangled by the shell, twice.** Same class of failure as
  feature 13's PowerShell here-string in `git commit -m`. **Write multi-line content with a file
  tool, then append it** — do not pass prose through a shell heredoc. Also: Git Bash's `/tmp` is not
  visible to a Windows `python`, so anything crossing between them needs an absolute Windows path.

## Review fixes — the ones that are rules, not patches

- **One non-finite value silently destroyed an entire chart.** `NaN` / `Infinity` propagated straight
  through: the ceiling went `NaN`, all five ticks rendered the literal "NaN", a bar's height became
  the invalid CSS `"NaN%"`, and the line's `d` attribute stopped parsing so the curve vanished.
  Nothing threw, nothing logged. These functions are the boundary feature 17 feeds from PostHog. Now
  coerced to zero with one log per series. **Found by probing the functions, not by reading them.**
  New `architecture.md` invariant.
- **A negative trend rendered green.** `StatCard` hardcoded the success colours while the sign logic
  beside it already anticipated negatives — the code handled the sign in one place and not the other.
  Three tones now. The red pair is `bg-error/10` + `text-error-dark`, because `--color-error` on its
  own tint is 3.3:1. **Fourth time on this project: a fill colour is not the colour that goes on top
  of it.**
- **An axis with no marks under it reads as a chart that failed to draw.** `ChartCard` takes
  `emptyMessage` and replaces the whole frame. `build-plan.md` assigns chart empty states to feature
  17, but `ui-rules.md`'s rule is project-wide and an all-zero series is reachable immediately.
- **A hardcoded tick array beside a derived ceiling.** The all-zero branch returned
  `ticks: [0,1,2,3,4]` next to `ceiling: TICK_COUNT` — the two agreed only by coincidence of step 1.
  Both derive from one step now.
- **The profile read was duplicated verbatim** across `/dashboard` and `/profile`. Extracted to
  `fetchProfile()`. `architecture.md` scopes `app/` to pages, not data access.
- **A const array nothing validates against is a list with no reader.** `ACTIVITY_KINDS` became a
  plain union; `JOB_MATCH_FILTERS` stays an array because the URL parser checks an untrusted string
  against it.

## Current state

- `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Every route still `ƒ`.
- **Verified by execution:** 45 checks on the original chart maths, then 32 more after the fixes. The
  three design series produce byte-identical axes before and after the hardening. Across fourteen
  maxima from 1 to 4321 the ceiling is never below the max, there are always five ticks, the last
  tick is always the ceiling and every tick is whole. Non-finite input now yields a finite axis, a 0%
  bar and a null path rather than poisoning the render.
- **Verified in a browser, twice.** First pass at 1470/834/414px: layout matches the design, the
  stats bar goes 4 → 2 → 1, the curve and its stroke weight survive the width change. One real defect
  found there — the score buckets wrapped at their hyphen, fixed with `whitespace-nowrap`. Second
  pass after the review fixes: all four trend states side by side, both chart empty states, and the
  populated dashboard re-rendered to confirm the `ChartCard` restructure broke nothing. Console clean
  both times.
- `/dashboard` still 307s to `/login` signed out. Both temporary preview routes deleted, 404
  confirmed.
- **Git:** feature 14 is **uncommitted** — this is the next action. `feat/13-company-research` is
  still unmerged. Database untouched this session: still 1 profile, 2 `agent_runs`, 20 jobs.

## Next session starts with

1. **Commit feature 14**, then decide the branch. It was built on `feat/13-company-research`, so
   feature 13's two commits and feature 14's changes are stacked on one branch — split them, or merge
   13 first. Repo convention: one feature branch per build-plan feature, `feat/NN-slug` off main.
2. **Run the research agent once, for real** — still the single biggest gap in the project. Pick a
   job whose `source_url` reaches a server-rendered posting, click Research Company, and watch the
   redirect, the backfill, the browse, the nine sections and the `company_researched` event. Then
   re-click to confirm the add-only guard.
3. **Open `/dashboard` signed in** — the one thing feature 14 could not verify.
4. **Fix the country defect** — add `in` and the other Adzuna markets to `ADZUNA_COUNTRIES` and
   surface the market actually searched. Delete the ten Indianapolis rows after.
5. **Run the same search twice** — the dedupe path has still never executed.
6. **Feature 15 — Stats Bar, real data.** Replace `mockStats()` with four counts against the user's
   own rows. Nothing else changes.

## Open questions

**Feature 14:**

- **`/dashboard` has never been opened signed in.** See above.
- **Feature 15 must decide what "vs last week" means when there is no previous week.** A first-week
  user has nothing to compare against; `DashboardStat.trend` is nullable for exactly this, but the
  rule is not written down.
- **Feature 16 needs `agent_runs` and researched jobs merged**, and research runs still open no
  `agent_runs` row — see below. That decision is now due.
- The `pl-10` axis gutter fits ticks up to four characters. Real counts in the thousands would sit
  2px into the card padding — visible but not broken.

**Feature 13, still open:**

- **Nothing has run.** The biggest gap in the project.
- **Research runs open no `agent_runs` row**, so features 15 and 16 will not see them. Decide before
  feature 16: widen `agent_runs`, or have those features read `agent_logs` too.
- **No rate limiting on `/api/agent/research`.** Each call costs a Browserbase session and two GPT-4o
  calls. Same exposure `/api/agent/find` has.
- **Two research runs at once will degrade one of them** — the free plan allows a single session.
- The `NOT_THE_EMPLOYER` list is hand-maintained and certainly incomplete.

**Feature 12:**

- **The design's green header badge is unreachable with current data** (top score 65).
- The Back to Jobs link drops the list's filter; the browser back button preserves it. Accepted.

**Feature 11:**

- **Pagination cannot be tested until a 21st row exists** — 20 rows at 20 per page is one page.
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
  dossier card. `/dashboard` is now the only page that has had a real responsive pass.

**Small, worth doing when convenient:**

- `Button` size `md` is `h-9` while form controls are `h-10`, so two buttons carry an explicit
  `h-10`.
- `tailwindcss@^4` is installed despite `AGENTS.md` saying to lock 3.4. Deliberate (feature 02), but
  the instruction and the lockfile still disagree.
- The ten Indianapolis rows are still in `jobs`, now joined by ten Virginia ones. Both will skew
  feature 15's stats — which is now the next feature.
- ESLint suggests `max-w-[1440px]` → `max-w-360` and `min-w-[720px]` → `min-w-180`. Warnings only,
  and `/dashboard` adds one more instance.
