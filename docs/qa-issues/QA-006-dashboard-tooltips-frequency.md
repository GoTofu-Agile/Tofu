# QA-006: Dashboard “How It Works” tooltips show on every login

## Category
UX Issue

## Severity
Medium

## Status
Fixed (Closed)

## Area
Dashboard onboarding affordances
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/dashboard/dashboard-flow-card.tsx`

## Environment
- Returning users (workspace with Product Context configured)
- Repeated logins

## Reproduction steps
1. Set up Product Context in `/settings`.
2. Log out and log back in multiple times.
3. Observe whether “How It Works” step cards show `?` tooltip triggers on each login.

## Expected behavior
- Tooltips should support first-time onboarding but should not intrude repeatedly for existing users.

## Actual behavior (risk before)
- Tooltips were rendered regardless of workspace state, creating persistent onboarding noise.

## Root cause
- Tooltip icon rendering not gated by workspace “first-time” state.

## Fix implemented
- Tooltip triggers only render when `isFirstTime` is true.
- Implemented via a `showTooltip` prop on `DashboardFlowCard`, passed from `dashboard/page.tsx`.

## Files/components changed
- Updated: `src/app/(dashboard)/dashboard/page.tsx`
- Updated: `src/components/dashboard/dashboard-flow-card.tsx`

## Regression risk
Low

## Verification
Manual:
- Existing user with context configured: `?` tooltip triggers do not appear.
- First-time empty workspace: tooltips appear and help explain the flow.

Automated:
- `npm run lint` shows no errors.

## Test coverage added/updated
- None (manual verification; `npm run lint` passes with 0 errors)

## Date / audit reference
Launch-readiness hardening pass (2026-03-26)

