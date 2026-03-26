# QA-003: Dashboard content risk of stale state for existing users

## Category
State Management / UX Reliability

## Severity
High

## Status
Fixed (Closed)

## Area
Dashboard page server rendering
- `src/app/(dashboard)/dashboard/page.tsx`

## Environment
- Existing users with configured context
- Repeat logins

## Reproduction steps
1. Configure product context in `/settings`.
2. Log out and log back in.
3. Check whether dashboard immediately reflects updated counts/state (context configured, persona/study counts).

## Expected behavior
- Dashboard reflects latest workspace status immediately on each login.

## Actual behavior (risk before)
- Server component could be cached/revalidated in ways that delayed updated display.

## Root cause
- Next.js server rendering defaults may revalidate/cache server component output.

## Fix implemented
- Force dynamic rendering for the dashboard route:
  - `export const dynamic = "force-dynamic";`

## Files/components changed
- Updated: `src/app/(dashboard)/dashboard/page.tsx`

## Regression risk
Medium
- Slight performance impact possible due to forced dynamic rendering, but correctness prioritized for launch.

## Verification
Manual:
- Confirm dashboard responds with `200` after changes.
- Confirm counts change after updating workspace setup (context/personas/studies).

Automated:
- `npm run build` succeeded (no compile errors).

## Test coverage added/updated
- None (manual verification; `npm run build` succeeded)

## Related issues
- QA-002 (onboarding behavior frequency)

## Date / audit reference
Launch-readiness hardening pass (2026-03-26)

