-- JobPilot feature 06 — correct the education column shape.
--
-- The original migration declared education as JSONB NOT NULL DEFAULT '[]'::jsonb
-- — an array — while architecture.md, types/index.ts and the delivered design all
-- treat it as a single object: { degree, field, institution, graduation_year }.
--
-- JSONB accepts either, so nothing errored. But a freshly inserted row got '[]',
-- and the profile form does `profile.education ?? EMPTY_EDUCATION`: an empty array
-- is not null, so it passed the array straight into the education inputs and React
-- silently dropped them to uncontrolled. Latent until the first real read.
--
-- Fixed here rather than coerced on read: the table has zero rows, so this costs
-- nothing now and removes a special case every future reader would have to know.
-- Absence of education is now NULL, which is what completeness() already checks.

ALTER TABLE public.profiles
  ALTER COLUMN education DROP DEFAULT,
  ALTER COLUMN education DROP NOT NULL;
