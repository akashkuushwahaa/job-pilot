# PostHog setup report

PostHog browser analytics, authenticated-user identification, client error tracking, two custom events, and a starter dashboard were added to this Next.js App Router app.

## Installed and initialized

- Installed `posthog-js` `^1.409.5` with npm; the dependency is recorded in `package.json` and `package-lock.json`.
- Browser initialization lives in `instrumentation-client.ts` and reads `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` from the environment.
- Initialization uses the configured host, PostHog defaults, exception autocapture, and development debug logging. No provider or server-side SDK was added; no server route handlers were detected.
- `.env.example` documents the required variables. The real values were configured in `.env.local` during the run and must also be supplied by deployment environments.
- No Content-Security-Policy was present in the inspected app, so no CSP changes were made.

## Events instrumented

| Event | What it measures | File |
|---|---|---|
| `oauth_sign_in_started` | A visitor starts OAuth sign-in with the selected provider. | `components/auth/OAuthButton.tsx` |
| `user_signed_out` | An authenticated user submits the sign-out action. | `components/layout/ComingSoon.tsx` |

The OAuth event is intentionally sent before identity exists and contains only the selected provider. The sign-out event is captured before `posthog.reset()` and follows identification when the authenticated boundary has mounted.

The run did **not** observe events arriving in PostHog. These event definitions describe instrumented call sites, not confirmed ingestion.

## User identification

Identification was wired for authenticated screens. `components/layout/ComingSoon.tsx` calls `posthog.identify(userId, ...)` on mount using the stable InsForge `user.id`, with email and optional profile name stored as person properties. The authenticated pages `app/dashboard/page.tsx`, `app/profile/page.tsx`, and `app/find-jobs/page.tsx` pass the verified session identity into that boundary. Sign-out calls `posthog.reset()` after capturing `user_signed_out`.

No server-side PostHog calls were added, so backend requests do not currently inherit the browser identity. New authenticated client UI outside these pages will need an equivalent identity boundary or must render under the existing one.

## Error tracking

`app/global-error.tsx` is a client global error boundary that calls `posthog.captureException(error)` once for the boundary error while preserving the retry behavior. `instrumentation-client.ts` also enables exception autocapture. The run did not trigger a runtime error, so delivery of an exception to PostHog remains unconfirmed.

## Dashboard

Created dashboard **Analytics basics (wizard)** with daily OAuth sign-in and sign-out trends plus a 14-day ordered OAuth-sign-in-to-sign-out funnel. The dashboard and all three insight tiles were created successfully, but may initially be empty because event arrival was not observed.

[DASHBOARD_URL] https://us.posthog.com/project/493006/dashboard/1935218

## Verification and unresolved items

- `npm install` completed successfully.
- `npm run build` completed successfully, including TypeScript and static generation.
- `npm run lint` completed successfully with no findings.
- The run did not run the test suite, start the app, or verify that events or exceptions arrive in PostHog.
- No build conflict was reported. The earlier initialization handoff recorded a temporary dependency gap, but the later install and review resolved it; the final review found no remaining conflict.

## Before you merge

- [ ] Run the full production build and confirm no type or lint errors were introduced; review the integration files, especially `instrumentation-client.ts`, `app/global-error.tsx`, `components/auth/OAuthButton.tsx`, and `components/layout/ComingSoon.tsx`.
- [ ] Run the test suite and update mocks or fixtures for the PostHog calls in `components/auth/OAuthButton.tsx`, `components/layout/ComingSoon.tsx`, and `app/global-error.tsx` if required.
- [ ] Set `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` from `.env.example` in every deployment environment, not only `.env.local`; inspect `instrumentation-client.ts:3-4` for the exact names.
- [ ] If authenticated client surfaces are added outside the current pages, verify they render under the identity boundary or add equivalent identification; inspect `components/layout/ComingSoon.tsx:19-26` and the callers in `app/dashboard/page.tsx`, `app/profile/page.tsx`, and `app/find-jobs/page.tsx`.
- [ ] After deployment, trigger OAuth sign-in and sign-out and confirm `oauth_sign_in_started` and `user_signed_out` appear in PostHog; inspect `components/auth/OAuthButton.tsx:20` and `components/layout/ComingSoon.tsx:31-32`.
- [ ] Trigger a controlled client rendering error and confirm Error Tracking receives it; inspect `app/global-error.tsx:12-14`.
