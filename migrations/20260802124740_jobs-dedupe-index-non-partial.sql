-- JobPilot feature 10 — make the jobs dedupe key usable from PostgREST.
--
-- Feature 04 created the dedupe index as a PARTIAL unique index:
--
--   CREATE UNIQUE INDEX jobs_user_source_external_key
--     ON public.jobs (user_id, source, external_id)
--     WHERE external_id IS NOT NULL;
--
-- PostgreSQL infers a partial index for ON CONFLICT only when the statement
-- repeats the index predicate. PostgREST's on_conflict parameter takes column
-- names and emits no WHERE clause, so the upsert feature 10 depends on fails:
--
--   INSERT ... ON CONFLICT (user_id, source, external_id) DO UPDATE ...
--   ERROR: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- Verified against this database before writing this migration: the statement
-- above fails without the predicate and succeeds with it. The index was fine —
-- it just could not be reached through the API the app actually uses.
--
-- Dropping the predicate is behaviour-preserving. Feature 04's comment said the
-- index was partial "so that url-sourced jobs, which have no Adzuna id, are not
-- collapsed onto a single NULL row per user" — but that is not what the
-- predicate was doing. PostgreSQL unique indexes are NULLS DISTINCT by default,
-- so two rows with external_id IS NULL never conflict with each other whether
-- the index is partial or not. The re-created index below is asserted to allow
-- exactly that.

DROP INDEX public.jobs_user_source_external_key;

CREATE UNIQUE INDEX jobs_user_source_external_key
  ON public.jobs (user_id, source, external_id);
