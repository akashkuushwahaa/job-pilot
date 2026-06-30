# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 1 — Foundation
**Last completed:** 02 Auth
**Next:** 03 PostHog Initialization

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [ ] 03 PostHog Initialization
- [ ] 04 Database Schema

### Phase 2 — Profile Page

- [ ] 05 Profile Page — Full UI
- [ ] 06 Profile Save Logic
- [ ] 07 AI Profile Extraction from Resume
- [ ] 08 Resume PDF Generation from Profile

### Phase 3 — Find Jobs Page

- [ ] 09 Find Jobs Page — Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [ ] 12 Job Details Page — Full UI
- [ ] 13 Company Research Agent

### Phase 5 — Dashboard

- [ ] 14 Dashboard Page — Full UI
- [ ] 15 Stats Bar — Real Data
- [ ] 16 Recent Activity — Real Data
- [ ] 17 Analytics Charts — PostHog Data

---

## Decisions Made During Build

- Progress tracker must be updated as features are completed or the active next step changes.
- Homepage was built as a static App Router page using existing assets from `public/` and the project token system.
- Auth will use the official `@insforge/sdk` / `@insforge/sdk/ssr` pattern from the refreshed InsForge skill docs.
- Auth uses InsForge SSR helpers with route-handler OAuth initiation, `/api/auth/callback`, `/api/auth/refresh`, and Next 16 `proxy.ts` route protection.

---

## Notes

- 2026-06-27: Homepage production build passed with `npm run build`.
- 2026-06-27: InsForge skill discovery found `insforge/agent-skills@insforge`, but installation/docs fetch was interrupted before auth implementation began.
- 2026-06-27: Refreshed the official InsForge app-code skill from the skills registry and read `auth/sdk-integration.md` plus `auth/ssr-integration.md`.
- 2026-06-27: Live InsForge metadata shows OAuth providers enabled: `github`, `google`; email verification is required with `code`; password minimum is 6; reset password method is `code`; `allowedRedirectUrls` includes `http://localhost:3000/api/auth/callback`.
- 2026-06-27: Auth implementation added Google/GitHub OAuth login, callback exchange, refresh route, sign out, protected routes, and placeholder authenticated pages. Production build and lint passed.
- 2026-06-29: Aligned completed auth flow with `adrianhajdin/job_pilot` reference: OAuth starts through `/api/auth/oauth/[provider]`, callback clears auth cookies on failure, proxy only matches protected routes, and post-login routing sends users with missing/incomplete profiles to `/profile`.
