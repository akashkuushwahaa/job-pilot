# Build Plan

## Core Principle

Full page UI built with mock data first — verified visually before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

---

## Phase 1 — Foundation

### 01 Homepage

Build the complete homepage UI.

**UI:**

- Navbar — logo, Dashboard, Find Jobs, Profile links, Start for free button
- Hero section — headline, subheadline, Get Started CTA and Find Your First Match CTA
- Dashboard preview screenshot embedded below hero
- Features section — three value props with descriptions
- Testimonial section
- Bottom CTA section
- Footer

**Logic:**

- Get Started and Start for free → /login if not authenticated, /dashboard if authenticated

---

### 02 Auth

InsForge authentication — Google and GitHub OAuth.

**UI:**

- Login page — Google OAuth button, GitHub OAuth button

**Logic:**

- Google OAuth via InsForge
- GitHub OAuth via InsForge
- OAuth callback handler
- Session management
- Middleware protecting /dashboard, /profile, /find-jobs, /find-jobs/[id]
- After login → redirect to /dashboard

---

### 03 PostHog Initialization

Set up PostHog before any events fire. Must be done before any agent features.

**Logic:**

- Create lib/posthog-client.ts — PostHog browser client, initialized with NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST
- Create lib/posthog-server.ts — PostHog server client with flushAt: 1 and flushInterval: 0
- Initialize PostHog in root app layout — wraps entire app
- posthog.identify() called after successful login with user ID
- posthog.reset() called on logout

---

### 04 Database Schema

All InsForge tables and storage bucket created before any data is written.

**Logic:**

- Create `profiles` table with all columns from architecture.md
- Create `agent_runs` table
- Create `jobs` table with all columns including:
  - tailored fields
  - company_research jsonb column
  - source values: 'search' | 'url'
- Create `agent_logs` table
- Create `resumes` storage bucket with authenticated access only
- Row level security policies on all four tables — always filter by user_id

---

## Phase 2 — Profile Page

### 05 Profile Page — Full UI

Build the complete profile page UI with mock data. No save logic yet.

**UI:**

- Profile needs attention banner at top — completion percentage ring, missing field tags highlighted (e.g. PHONE, LOCATION, EDUCATION)
- Resume section — drag and drop upload area, "Click to upload or drag and drop" text, PDF only note, Select Resume button, Generate Resume from Profile button below
- Profile Information form with clearly labeled sections:
  - Personal Info — Full Name, Email (pre-filled, not editable), Phone Number, Location, LinkedIn URL, Portfolio/GitHub, Work Authorization dropdown
  - Professional Info — Current Job Title, Experience Level dropdown, Years of Experience, Skills tag input with Add button, Industries tag input with Add button
  - Work Experience — up to 3 roles, each with Company Name, Job Title, Start Date, End Date, Currently working here checkbox, Key Responsibilities textarea. Add role button.
  - Education — Highest Degree dropdown, Field of Study, Institution Name, Graduation Year
  - Job Preferences — Job Titles Seeking, Remote Preference dropdown, Salary Expectation, Preferred Locations, Cover Letter Tone dropdown
- Save Profile button at bottom

---

### 06 Profile Save Logic

Wire profile form to InsForge DB.

**Logic:**

- Server Action in actions/profile.ts saves all form fields to profiles table
- Resume PDF uploaded to InsForge Storage at resumes/{user_id}/resume.pdf, overwriting in place
- The object **key** saved to `profiles.resume_path` after upload
- Form pre-fills with existing data on return visits
- revalidatePath('/profile') called after save

> Corrected against feature 04. This section previously said `resume_pdf_url`, `is_complete`, and
> "completion percentage and missing fields calculated and saved". None of those columns exist —
> the bucket is private so the column holds a key not a URL, and completeness is derived by
> `lib/completeness.ts` rather than stored. `architecture.md` is authoritative.

---

### 07 AI Profile Extraction from Resume

Extract from Resume button — GPT-4o reads uploaded PDF and auto-fills profile form fields.

**UI:**

- Extract from Resume button appears after resume is uploaded
- Loading state while processing
- Form fields populate automatically after extraction
- User reviews and edits if needed before saving

**Logic:**

- pdf-parse extracts raw text from uploaded PDF buffer
- If extracted text is empty or too short — return error: "Could not extract text from this PDF. Please try a different file."
- GPT-4o reads extracted text and returns structured JSON matching all profile field names
- Form fields populated with extracted data
- User saves manually after reviewing

---

### 08 Resume PDF Generation from Profile

Generate a clean professional PDF resume from current profile data using GPT-4o.

**Logic:**

- POST /api/resume/generate
- Reads current profile data from profiles table
- GPT-4o generates professional resume content:
  - Professional summary paragraph
  - Polished work experience bullet points
  - Clean professional language throughout
- @react-pdf/renderer renders GPT-4o output into clean single-page PDF using renderToBuffer()
- Buffer uploaded to InsForge Storage at resumes/{user_id}/resume.pdf with upsert: true
- resume_pdf_url updated in profiles table

> Corrected against features 04 and 08. `resume_pdf_url` does not exist — the column is
> `resume_path` and it holds an object key, because the bucket is private. `upload()` has no
> `upsert` option either; writing the same key replaces the object. Two rules the plan does not
> state were added in feature 08: generation reads the **saved row**, so the button is disabled
> while the form is ahead of it, and it is gated on `completeness().isComplete` — generating from a
> thin profile would overwrite a real uploaded resume with a near-empty document.
> `architecture.md` is authoritative.

---

## Phase 3 — Find Jobs Page

### 09 Find Jobs Page — Full UI

Build the complete Find Jobs page UI with mock data. No logic yet.

**UI:**

- Search controls card at top:
  - JOB TITLE label + input with search icon placeholder "Frontend Engineer"
  - LOCATION label + input placeholder "Remote, New York..."
  - Find Jobs button with search icon
  - Success message area below controls — green banner: "Found 8 jobs and saved 4 strong matches."
- Job list section below:
  - Filter bar: text search input "Filter by company or role...", All Matches dropdown, Match Score sort dropdown
  - Jobs table with columns: COMPANY, ROLE, MATCH SCORE (color coded progress bar + percentage), SALARY EST., SOURCE (Search/URL badge), DATE FOUND
  - Pagination — "Showing 1 to 6 of 24 results", Previous, page numbers, Next

> Corrected against the design and `project-overview.md` in feature 09. **The SOURCE column was not
> built.** `context/designs/find-jobs.png` does not draw it, and it could only ever hold one value:
> `jobs.source` is `'search' | 'url'`, discovery is Adzuna-only, and "URL input for manual job
> import" is listed under Features Out of Scope. A column with one constant value is noise. The
> "Jobs by Adzuna" credit `project-overview.md` requires on job listings carries the same
> information and is rendered under the jobs card instead. **"Showing 1 to 6 of 24 results" against
> eight page buttons is also not self-consistent** — 24 results at 6 per page is four pages. The
> component derives its page count from the totals, and the mock totals 48 so the design's ellipsis
> and page 8 still render.

---

### 10 Adzuna Job Discovery

Agent calls Adzuna API to find jobs matching user's search criteria, scores them against user profile, saves to DB.

**Logic:**

- POST /api/agent/find receives jobTitle and location from client
- Call Adzuna API:
  - GET https://api.adzuna.com/v1/api/jobs/{country}/search/1
  - params: what={jobTitle}, where={location}, results_per_page=10, app_id, app_key
  - Detect country from location input — default to 'us'
- For each job returned:
  - Extract title, company, location, salary, description snippet, redirect_url
  - GPT-4o scores job against user profile:
    - matchScore — integer 0-100
    - matchReason — one paragraph explanation
    - matchedSkills — skills user has that job requires
    - missingSkills — skills job requires that user lacks
  - Save complete record to jobs table:
    - source: 'search'
    - run_id from agent_runs record
    - All structured fields saved
- Create agent_run record in DB
- After all jobs saved — update agent_run with total count, return success message to frontend

**PostHog events:** `job_search_started`, `job_found`

> Corrected against the live Adzuna API and the delivered feature 10.
> **`where` is omitted entirely when the location is empty** rather than sent blank, and the country
> is detected only from an explicit country name — never from a city, because a wrong country
> returns zero results silently rather than erroring.
> **The description arrays are not filled.** Adzuna's `description` is a 500-character snippet that
> cuts off mid-sentence, so `about_role` takes it verbatim and `responsibilities`, `requirements`,
> `nice_to_have`, `benefits` and `about_company` stay empty. Feature 12 must render only the sections
> that have content.
> **Two rules the plan does not state** were settled here: the search is gated on
> `completeness(profile).isComplete`, the same gate feature 08 puts on Generate, because a score
> against a near-empty profile is meaningless; and a job whose GPT-4o scoring fails is logged to
> `agent_logs` and skipped rather than saved unscored.
> **Feature 10 also took the plain jobs read** that this plan leaves to feature 11 — deleting
> `mockJobs()` and reading the user's own rows, newest first. Without it the success banner reports
> jobs that the six mock rows underneath contradict, and the feature cannot be seen working at all.
> Feature 11 still owns the filter, both sorts and pagination.
> `architecture.md` is authoritative.

---

### 11 Filter + Sort + Pagination

Wire filter tabs, sort dropdown, text search, and pagination to real InsForge DB data.

**Logic:**

- All Matches tab — all jobs for current user
- High Match filter — jobs with match_score >= 70
- Low Match filter — jobs with match_score < 70
- Sort by Match Score — order by match_score descending
- Sort by Newest — order by found_at descending
- Sort by Oldest — order by found_at ascending
- Text search — filter by company name or job title (case insensitive)
- Pagination — 20 jobs per page, total count shown

> Corrected against the delivered feature 11.
> **All four controls live in the URL**, not in component state — `?q=&match=&sort=&page=`. The read
> stays in the Server Component that renders the page, and a refresh, the back button and a shared
> link all reproduce the same list. `lib/jobs.ts` owns parsing, link building and the read.
> **The default sort is Match Score**, which is what the select has read since feature 09. Feature
> 10's plain read was newest-first, so the visible ordering changes with this feature.
> **Every sort ends with `id`.** `found_at` is transaction time, so all ten rows of one run share a
> millisecond, and score ties are common — without a unique final key a paged read repeats rows.
> **Three rules the plan does not state** were settled here: filter text is double-quoted before it
> reaches PostgREST's `or()` (an unquoted comma fails the whole request, and this user's data has a
> company named "SimVentions, Inc"); a `?page=` beyond the last page is clamped rather than rendered
> as an empty list; and the empty state carries different copy when filters are active, because
> "search for some jobs" is the wrong thing to say to someone whose jobs a filter is hiding.
> `architecture.md` is authoritative.

---

## Phase 4 — Job Details Page

### 12 Job Details Page — Full UI

Build the complete job details page UI. Job data from DB is already available from Phase 3 — wire real data for all job info and match sections immediately. Company research section shows empty state only.

**UI:**

- Back to Jobs link
- Job header — company logo placeholder, job title, company name, match score badge with percentage, View Job Post button (links to redirect_url)
- Info cards row — Salary Est., Location, Job Type, Date Found
- AI Match Reasoning section — match reason paragraph from GPT-4o
- Required Skills vs Your Profile — matched skills as green badges, missing skills as red/orange badges
- Job Description section — description content from Adzuna
- Company Research card — empty state with Research Company button. After research: structured dossier with company overview, tech stack, culture, why this role, interview prep
- Apply Now button (links to redirect_url, opens in new tab)

> Corrected against `context/designs/job-details.png`, `ui-tokens.md` and the live rows in feature 12.
> **Missing skills are purple, not "red/orange".** `ui-tokens.md`'s Skills Badges table pairs them
> with `bg-accent-muted` / `text-accent` and the design draws purple — and semantically a gap skill is
> what feature 13 turns into a strategy, not an error.
> **The match badge is keyed on `MATCH_THRESHOLD`, not on the score bar's bands.** `matchBadge()` and
> `matchScoreFill()` both live in `lib/utils.ts` and must stay separate: the design draws an 85%
> badge green while an 85 bar is blue.
> **Every section renders only if it has content, and the whole Job Description card can disappear.**
> Feature 10 leaves `responsibilities`, `requirements`, `nice_to_have`, `benefits` and
> `about_company` empty, so the page is thinner than the design draws it. It renders less rather than
> rendering empty headings.
> **`company_research` is not read at all.** Feature 12 draws the empty state; feature 13 adds the
> column to the select, the dossier markup and the button's handler together, so there is never a
> card that reports "No research yet" over a dossier that exists. The Research Company button is
> inert until then — the same full-UI-then-wire split features 09 and 10 made on Find Jobs.
> **Feature 12 also added the table row `href`** that feature 09 deliberately left out.
> `architecture.md` is authoritative.

---

# Feature 13 — Company Research Agent (Updated)

Agent researches the company using their public website and builds a structured dossier using a single Browserbase session. Three data sources fused together: company website content, job description from DB, user profile from DB.

**Logic:**

- POST /api/agent/research receives jobId
- Load job data from DB — extract company_name, job description, matched_skills, missing_skills
- Load user profile from DB — skills, experience, work history
- Derive company homepage URL by following the Adzuna redirect with server-side fetch() — no browser needed for this step:
  - fetch(redirect_url, { redirect: "follow" }) follows HTTP redirects natively before the browser opens
  - Use response.url as the real employer job page URL
  - Strip subdomain from response.url hostname (e.g. jobs.stripe.com → stripe.com)
  - Construct homepage URL as https://{rootDomain}
  - If response.url still contains "adzuna.com" or fetch throws — fall back to https://www.{company}.com (company name from DB)
  - If Stagehand gets no meaningful content (oneLiner and productSummary empty) — skip browser research entirely, proceed to GPT-4o synthesis with job description and profile only
- Open single Browserbase session with Stagehand
  **Stagehand homepage extraction:**

```typescript
const homepage = await stagehand.extract({
  instruction:
    "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.",
  schema: z.object({
    oneLiner: z.string().describe("What the company does in one sentence"),
    productSummary: z
      .string()
      .describe("What they build/sell and who it's for"),
    signals: z
      .array(z.string())
      .describe("Funding, notable customers, scale, mission, recent news"),
    pageLinks: z
      .array(
        z.object({
          url: z.string(),
          kind: z.enum([
            "about",
            "careers",
            "blog",
            "engineering",
            "product",
            "team",
            "other",
          ]),
        }),
      )
      .describe("Internal links worth visiting"),
  }),
});
```

If oneLiner and productSummary are empty — bail to synthesis with job description and profile only.

**Stagehand sub-page extraction (max 3 pages — prefer about/blog/engineering/product over careers):**

```typescript
const page = await stagehand.extract({
  instruction:
    "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.",
  schema: z.object({
    keyPoints: z.array(z.string()),
    technologies: z
      .array(z.string())
      .describe("Specific languages, frameworks, tools, platforms"),
    valuesOrCulture: z
      .array(z.string())
      .describe("Stated values, working style, team norms"),
    notable: z
      .array(z.string())
      .describe("Customers, funding, scale, projects, awards"),
  }),
});
```

- Close Browserbase session after homepage + max 3 sub-pages
  **GPT-4o synthesis (runs after browser closes):**

System prompt:

```
You are a sharp career strategist preparing a candidate to apply for a specific role.
You are given (a) research collected from the company's own website, (b) the job posting,
and (c) the candidate's profile. Produce a concise, concrete briefing that gives this
specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent
  funding, customers, headcount, or facts. If research was thin, infer carefully from
  the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this
  company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly
  and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind
  of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON.
```

User prompt feeds three data sources:

```
COMPANY RESEARCH (from their website): {companyResearch}
JOB POSTING: title, company, description, matched_skills, missing_skills
CANDIDATE PROFILE: current_title, years_experience, experience_level, skills, work_experience
```

Temperature: 0.4

**Dossier shape saved to jobs.company_research jsonb:**

```json
{
  "companyOverview": "string",
  "techStack": ["string"],
  "culture": ["string"],
  "whyThisRole": "string",
  "yourEdge": ["string"],
  "gapsToAddress": ["string"],
  "smartQuestions": ["string"],
  "interviewPrep": ["string"],
  "sources": ["string"]
}
```

- Save complete dossier to jobs.company_research jsonb column
- Always return a dossier — never fail silently. If browser research failed, GPT-4o synthesizes from job description and profile alone.
  **PostHog event:** `company_researched` — { userId, jobId, company }

> **Added in feature 12 — feature 13 also backfills the job description.**
> `about_role` holds Adzuna's 500-character snippet, which stops mid-word on **every** job (verified:
> 20 of 20 rows, all exactly 500 characters, all ending in `…`). That leaves
> `project-overview.md`'s "Job details page displays clean structured job information" unmet for
> every listing, and `responsibilities` / `requirements` / `nice_to_have` / `benefits` /
> `about_company` permanently empty.
>
> Feature 13 is the feature that closes it, because it is **already specified to follow the Adzuna
> redirect with `fetch(redirect_url, { redirect: "follow" })`** and land on the real employer job
> page before the browser session even opens. Extract the posting body on that hop and write it back
> to `about_role` and the four bullet columns. Building a second scraper for this would duplicate the
> redirect-follow that is already in this feature's plan.
>
> Two rules carry over from feature 10 and are not negotiable: **write no field the page did not
> actually state** — a section that is not in the posting stays empty rather than being synthesised —
> and the upsert must still never touch `found_at` or `company_research`.
>
> Until then, feature 12 renders the snippet with a note naming Adzuna as the truncator and a link to
> the original posting. **Delete that note in the same change that fills the column**, or it will
> claim a truncation that no longer exists.

---

## Job Details UI — Company Research Card (Updated)

The Company Research card on the job details page must render all 9 fields:

- **Company Overview** — paragraph
- **Tech Stack** — tag list
- **Culture** — bullet list
- **Why This Role** — paragraph
- **Your Edge** — bullet list (highlight — specific to this candidate)
- **Gaps to Address** — bullet list (reframed as strategy, not weaknesses)
- **Smart Questions** — bullet list (questions to ask in interview)
- **Interview Prep** — bullet list
- **Sources** — small text, links to pages researched

## Phase 5 — Dashboard

### 14 Dashboard Page — Full UI

Build the complete dashboard UI with mock data.
**UI:**

- Four stat cards: Total Jobs Found, Avg. Match Rate, Companies Researched, Cover Letters Generated — all showing mock numbers with trend indicators
- Recent Activity card — list of 5 activity entries with colored dots and timestamps
- Resume Tailoring Activity — bar chart (mock data, days of week)
- Jobs Found Over Time — line chart (mock data, days of week)
- Match Score Distribution — bar chart (mock data, score ranges 50-60%, 60-70%, 70-80%, 80-90%, 90-100%)
- Incomplete profile banner at top if profile not complete

---

### 15 Stats Bar — Real Data

Wire four stat cards to real InsForge DB data for current user.

**Logic:**

- Total Jobs Found — COUNT of jobs where user_id = current user
- Avg. Match Rate — AVG of match_score across all user jobs
- Companies Researched — COUNT of jobs where company_research IS NOT NULL and user_id = current user
- Jobs This Week — COUNT of jobs found in last 7 days

---

### 16 Recent Activity — Real Data

Wire recent activity list to real InsForge DB data for current user.

**Logic:**

- Query agent_runs table — most recent runs for current user
- Query jobs table — most recent company research entries for current user
- Merge and sort all by created_at descending — take last 5-10 entries
- Format each into human readable string:
  - agent_run completed → "Found X jobs for [jobTitle] — [time ago]"
  - company_research populated → "Researched [company] — [time ago]"
- Color coded dot per entry type — info blue, success green

---

### 17 Analytics Charts — PostHog Data

Wire three dashboard charts to real PostHog event data for current user.

**Logic:**

- Jobs Found Over Time — query PostHog for job_found events where distinctId = current userId, last 30 days, group by day
- Match Score Distribution — query PostHog for job_found events, extract matchScore property, group into ranges: 50-60, 60-70, 70-80, 80-90, 90-100
- Company Research Activity — query PostHog for company_researched events where distinctId = current userId, last 7 days, group by day
- All three charts rendered with recharts
- Empty state shown for each chart when no data exists yet

---

## Feature Count

| Phase                 | Features |
| --------------------- | -------- |
| Phase 1 — Foundation  | 4        |
| Phase 2 — Profile     | 4        |
| Phase 3 — Find Jobs   | 3        |
| Phase 4 — Job Details | 2        |
| Phase 5 — Dashboard   | 4        |
| **Total**             | **17**   |
