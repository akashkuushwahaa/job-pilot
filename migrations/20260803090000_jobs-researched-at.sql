-- JobPilot feature 16 — give a company dossier a time of its own.
--
-- The Recent Activity feed merges two kinds of event and sorts them together:
-- a completed search ("Found 12 jobs for React Developer") and a completed
-- research run ("Researched Stripe"). A search has agent_runs.completed_at. A
-- research run had nothing.
--
-- build-plan.md feature 16 says to "query jobs table — most recent company
-- research entries" and "merge and sort all by created_at descending", which
-- assumes a jobs row knows when its dossier was written. It does not:
--
--   found_at          when the job was DISCOVERED
--   company_research  the dossier, with no timestamp inside it
--
-- Those are hours apart in real data. The Oracle row on this database was found
-- at 07:33:54 and researched at 16:54:25 — using found_at would have dated the
-- activity entry nine hours early, sorted it into the wrong place in the feed,
-- and rendered "Yesterday" under a run that finished minutes ago. A feed whose
-- timestamps are wrong is worse than no feed.
--
-- The alternative considered and rejected: derive the time from agent_logs by
-- string-matching the "Saved a company dossier for X" message. agent/logs.ts is
-- explicitly allowed to fail silently, so a research run can succeed while
-- writing no log row at all — and keying on prose that a future edit can reword
-- is the failure mode this project already documented in JobDescription.
--
-- Nullable with no default, deliberately. A row's dossier and its timestamp are
-- written together by agent/research.ts, so "has a dossier but no researched_at"
-- only describes the two rows that predate this migration, and the backfill
-- below closes those.

ALTER TABLE public.jobs
  ADD COLUMN researched_at timestamptz;

COMMENT ON COLUMN public.jobs.researched_at IS
  'When the research agent last saved a dossier to company_research. Null when no dossier exists. Distinct from found_at, which is when the job was discovered.';

-- Backfill the rows that already carry a dossier. agent_logs holds one row per
-- phase of a research run, all sharing the job_id, so the LAST of them is the
-- save that completed the run. This is a one-off recovery of history that was
-- not recorded at the time, not the mechanism the app relies on going forward.
UPDATE public.jobs AS j
SET researched_at = l.finished_at
FROM (
  SELECT job_id, max(created_at) AS finished_at
  FROM public.agent_logs
  WHERE job_id IS NOT NULL
  GROUP BY job_id
) AS l
WHERE j.id = l.job_id
  AND j.company_research IS NOT NULL
  AND j.researched_at IS NULL;

-- The feed reads the newest researched rows for one user, so the index carries
-- the user first and orders by the same column and direction the query does.
CREATE INDEX jobs_user_researched_at_idx
  ON public.jobs (user_id, researched_at DESC)
  WHERE researched_at IS NOT NULL;
