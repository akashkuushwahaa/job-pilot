# Memory — Feature 07: AI Profile Extraction from Resume (built, exercised against the live model)

Last updated: 2026-08-02

Phase 2 is nearly done. Features 05, 06 and 07 complete. Next is feature 08 — Resume PDF Generation.

## What was built

- **`lib/resume-extraction.ts`** — the whole feature. `extractProfileFromResume(pdf: ArrayBuffer)`
  returns `{ success, values } | { success: false, error }`. Holds the 200-char text floor, the
  15,000-char truncation budget, the prompt, the zod schema, and the mapping to form values.
- **`lib/openai.ts`** — `getOpenAI()` (built on first use, returns null when unconfigured rather than
  throwing at import) and `OPENAI_MODEL = "gpt-4o"` pinned so no call site writes it inline.
- **`app/api/resume/extract/route.ts`** — `POST`, **takes no request body**. Reads `resume_path` from
  the caller's own row, `storage.download`s it, extracts, returns form values. Writes nothing.
- **`components/profile/ProfileWorkspace.tsx`** — owns `ProfileFormValues`; renders a fragment of
  `ResumeUpload` + `ProfileForm` so the page's `space-y-6` still applies.
- Rewired: `ResumeUpload` (Extract button, `isExtracting`, own status banner), `ProfileForm` (now
  controlled — `values`/`setValues` are props; keeps only `status`/`isSaving`), `app/profile/page.tsx`.
- `types/index.ts` gained `DEGREE_OPTIONS`/`Degree` (moved out of `ProfileForm.tsx`) and
  `ExtractedFormValues`.
- `openai@7.3.0` and `pdf-parse@2.4.5` installed. `next.config.ts` gained
  `serverExternalPackages: ["pdf-parse"]`.

## Decisions made

- **The PDF is downloaded from storage, never re-posted.** The build plan said "uploaded PDF buffer",
  but the button only exists once `resume_path` is set. The route accepts no key, path or user id
  from the caller — storage still has no ownership model, so this is the only defence.
- **Extraction writes nothing.** No `profiles` write, no `revalidatePath`. A page refresh discards a
  bad extraction entirely, and that is what makes overwriting filled fields safe.
- **Merge rule: named fields win, unnamed fields keep what the user typed.** The response carries only
  keys the resume spoke to, so the merge is a spread. `education` merges key by key; work experience
  replaces the list wholesale.
- **Facts only.** `email`, `work_authorization` and all four Job Preferences are never extracted.
  `ExtractedFormValues` `Omit`s them, so the compiler enforces it rather than discipline.
- **Extraction lives in `lib/`, not `agent/`.** No runId, no `agent_logs`, one request/response — it
  does not meet the agent-function contract.
- **Form state lifted to `ProfileWorkspace`** because two cards now write to it. The page still
  renders it unkeyed, for the feature 06 reason.
- **No new PostHog event.** The list stays at seven.

## Problems solved

- **`pdf-parse@2` is not the API `library-docs.md` documented.** The docs showed
  `import pdf from "pdf-parse"; await pdf(buffer)` — that is v1 and does not exist in the installed
  v2.4.5, which is a `PDFParse` class over pdfjs-dist: `new PDFParse({ data })` → `getText()` →
  `.text`. It needs `serverExternalPackages` and an `await parser.destroy()` in a `finally` or it
  leaks a pdfjs worker per call. `library-docs.md` corrected. **Third time in two features that an
  installed package did not match its documentation — read the `.d.ts` first, every time.**
- **GPT-4o read seven years of experience as four.** "March 2022 — Present" is unresolvable without
  knowing the present, and the model anchored on its own training cutoff. Fixed by putting today's
  date in the prompt; re-ran and it returned 7. **Every dated GPT-4o call in features 10 and 13 will
  hit this** — the rule is now in `library-docs.md`.
- **`max_tokens` is deprecated in openai v7** in favour of `max_completion_tokens`.
- **`json_object` only guarantees valid JSON for a response that completed.** Hitting the token
  ceiling truncates mid-object and `JSON.parse` throws, so `finish_reason === "length"` is logged
  separately to tell a truncation from a malformed response.

## Current state

- `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Every route `ƒ`.
  `/api/resume/extract` is registered and 307s to `/login` anonymously.
- **Feature 07 exercised against the live model.** A temporary route (since deleted, confirmed 404)
  ran the real prompt, schema and mapping over a generated one-page resume: all twelve permitted
  fields correct — dates `YYYY-MM`, `currently_working: true` with `end_date: null`, degree from
  `DEGREE_OPTIONS`, valid `experience_level` enum, no email, no job preferences. A text-free PDF and
  a non-PDF both returned the build plan's exact "Could not extract text from this PDF" message.
- **Nothing in feature 07 has been clicked in a browser.** The UI wiring — button, loading state,
  merge into form state, status banner — is reasoned but unobserved.
- Branch is still **`fix/06-profile-save-review`**. Feature 07 is uncommitted; feature 06 is
  committed through `24c4ee9`. Neither is merged to `main` (`main` was merged in via PR #1).

## Next session starts with

1. **Click through feature 07 in a browser, in this order:** type into a field → press Extract →
   confirm the typing survives. That finally puts eyes on the feature 06 remount fix, which
   extraction now stresses directly. Then extract onto a full profile to watch the overwrite rule,
   refresh without saving to confirm the stored row is untouched, and save afterwards.
2. **Commit feature 07** (branch per feature: `feat/07-ai-profile-extraction` off main, or continue on
   the current branch and decide the merge).
3. **Feature 08 — Resume PDF Generation from Profile.** `POST /api/resume/generate`: GPT-4o writes
   the content at temperature 0.7 / 1000 tokens, `@react-pdf/renderer` renders it with
   `renderToBuffer()`, uploaded over `{user.id}/resume.pdf`. `@react-pdf/renderer` is not installed
   yet. Note the build plan's feature 08 text still says `resume_pdf_url` — that column does not
   exist; it is `resume_path` and it holds a key. `lib/openai.ts` and the extraction module are the
   patterns to follow.

## Open questions

**Feature 07, unverified:**

- **The whole UI is unobserved** — see "Next session starts with".
- **A real-world resume has never been through it.** Only a generated single-column PDF. Multi-column
  layouts and heavy formatting are where pdf-parse's text order gets scrambled.
- **The 800-token ceiling is tight** for three roles with responsibilities. `finish_reason === "length"`
  is logged; if it ever appears, raise the ceiling and update `library-docs.md` rather than diverging.

**Carried forward from feature 06, still open:**

- **The comma-separated → `text[]` split has never run.** `job_titles_seeking` and
  `preferred_locations` are both empty in the saved row. Extraction deliberately leaves them alone,
  so this still needs typing two titles manually and checking the column is a two-element array.
- **`profile_completed` has not been confirmed arriving.** Goes through `posthog-node` and never
  reaches the browser log — needs PostHog's Activity view. Also confirm it does not fire twice.
- **Server-side upload rejection is untested.** `curl -F` a non-PDF and a >5MB file at `/api/resume`
  with a session cookie, bypassing the cosmetic client checks.
- **Neither error boundary has ever rendered.** Zero `$exception` events.
- **Google OAuth has not run since the feature-03 fixes** — the last sign-ins were GitHub.
- **Cross-user isolation is unproven for both RLS and storage.** One user exists and admin tooling
  refuses `SET ROLE`. Storage has no ownership model, so `/api/resume` and `/api/resume/extract` are
  the only enforcement — worth a real test the moment a second account exists.
- **Rotate the InsForge admin API key** if it was ever committed, pushed or deployed. The full-access
  key had been pasted into the public anon-key variable and served to browsers before being replaced.
- **Input masking has not been confirmed in an actual recording.**

**Small, worth doing when convenient:**

- `Button` size `md` is `h-9` but form controls are `h-10`, so any button on a field row needs an
  explicit `h-10`. Consider making `md` `h-10` when feature 09 builds the search controls.
- "Generate Resume from Profile" is still inert — feature 08.
- `tailwindcss@^4` is installed despite `AGENTS.md` saying to lock 3.4. Nothing has broken, but the
  instruction and the lockfile disagree.
