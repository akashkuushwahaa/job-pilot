-- JobPilot feature 04 — database schema.
--
-- Four tables, all strictly per-user: there is no shared or public data in this
-- app, so nothing is granted to `anon` and every policy is scoped to the owner.
--
-- Decisions recorded in context/progress-tracker.md:
--   A  resumes bucket is private; profiles.resume_path holds the object key,
--      not a URL. Signed URLs are generated server-side at render time.
--   B  no trigger on auth.users — the profiles row is created by an app-side
--      upsert on first save, so a bug here can never break OAuth sign-up.
--   C  jobs.external_id holds Adzuna's stable id and is the dedupe key.
--   D  completeness is derived in lib/, so there is no is_complete column.
--   E  no resume-tailoring or cover-letter columns — both are out of scope.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT,
  email               TEXT,
  phone               TEXT,
  location            TEXT,
  current_title       TEXT,
  experience_level    TEXT CHECK (experience_level IN ('junior', 'mid', 'senior', 'lead')),
  years_experience    INTEGER CHECK (years_experience >= 0),
  skills              TEXT[] NOT NULL DEFAULT '{}',
  industries          TEXT[] NOT NULL DEFAULT '{}',
  work_experience     JSONB  NOT NULL DEFAULT '[]'::jsonb,
  education           JSONB  NOT NULL DEFAULT '[]'::jsonb,
  job_titles_seeking  TEXT[] NOT NULL DEFAULT '{}',
  remote_preference   TEXT CHECK (remote_preference IN ('remote', 'onsite', 'hybrid', 'any')),
  preferred_locations TEXT[] NOT NULL DEFAULT '{}',
  salary_expectation  TEXT,
  linkedin_url        TEXT,
  portfolio_url       TEXT,
  work_authorization  TEXT CHECK (work_authorization IN ('citizen', 'permanent_resident', 'visa_required')),
  resume_path         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- ---------------------------------------------------------------------------
-- agent_runs
-- ---------------------------------------------------------------------------

CREATE TABLE public.agent_runs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status             TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  job_title_searched TEXT,
  location_searched  TEXT,
  jobs_found         INTEGER NOT NULL DEFAULT 0 CHECK (jobs_found >= 0),
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ
);

CREATE INDEX agent_runs_user_started_idx
  ON public.agent_runs (user_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------

CREATE TABLE public.jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id             UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source             TEXT NOT NULL CHECK (source IN ('search', 'url')),
  external_id        TEXT,
  source_url         TEXT,
  external_apply_url TEXT,
  title              TEXT NOT NULL,
  company            TEXT NOT NULL,
  location           TEXT,
  salary             TEXT,
  job_type           TEXT,
  about_role         TEXT,
  responsibilities   TEXT[] NOT NULL DEFAULT '{}',
  requirements       TEXT[] NOT NULL DEFAULT '{}',
  nice_to_have       TEXT[] NOT NULL DEFAULT '{}',
  benefits           TEXT[] NOT NULL DEFAULT '{}',
  about_company      TEXT,
  match_score        INTEGER CHECK (match_score BETWEEN 0 AND 100),
  match_reason       TEXT,
  matched_skills     TEXT[] NOT NULL DEFAULT '{}',
  missing_skills     TEXT[] NOT NULL DEFAULT '{}',
  company_research   JSONB,
  found_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Decision C. Partial so that url-sourced jobs, which have no Adzuna id, are not
-- collapsed onto a single NULL row per user. Feature 10 upserts onto this key and
-- must never include company_research in the update list.
CREATE UNIQUE INDEX jobs_user_source_external_key
  ON public.jobs (user_id, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX jobs_user_found_idx ON public.jobs (user_id, found_at DESC);
CREATE INDEX jobs_user_score_idx ON public.jobs (user_id, match_score DESC);
CREATE INDEX jobs_run_idx        ON public.jobs (run_id);

-- ---------------------------------------------------------------------------
-- agent_logs
-- ---------------------------------------------------------------------------

CREATE TABLE public.agent_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  level      TEXT NOT NULL CHECK (level IN ('info', 'success', 'warning', 'error')),
  job_id     UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX agent_logs_user_created_idx ON public.agent_logs (user_id, created_at DESC);
CREATE INDEX agent_logs_run_idx          ON public.agent_logs (run_id, created_at);
CREATE INDEX agent_logs_job_idx          ON public.agent_logs (job_id);

-- ---------------------------------------------------------------------------
-- Privileges
--
-- InsForge grants broad DML on public tables to both anon and authenticated by
-- default. Nothing in this app is readable while signed out, so anon's default
-- privileges are revoked outright rather than left to RLS alone.
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON public.profiles   FROM anon;
REVOKE ALL ON public.agent_runs FROM anon;
REVOKE ALL ON public.jobs       FROM anon;
REVOKE ALL ON public.agent_logs FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_logs TO authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
--
-- One FOR ALL policy per table. Both USING and WITH CHECK are present, so a user
-- can neither read nor write a row they do not own — including re-pointing an
-- existing row at another user, which WITH CHECK rejects on the new value.
-- auth.uid() is wrapped in a subquery so it is evaluated once, not per row.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_owner ON public.profiles
  FOR ALL TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY agent_runs_owner ON public.agent_runs
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY jobs_owner ON public.jobs
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY agent_logs_owner ON public.agent_logs
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
