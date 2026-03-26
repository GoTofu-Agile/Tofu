# QA-002: Dashboard tour auto-opens every login

## Category
UX Issue

## Severity
High

## Status
Fixed (Closed)

## Area
Dashboard (product tour + onboarding persistence)
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/dashboard/dashboard-tour.tsx`

## Environment
- Logged-in user dashboard
- Multiple logins / refreshes

## Reproduction steps
1. Log in.
2. Observe “Product tour” quick walkthrough behavior.
3. Log out and log in again (or refresh and re-auth).

## Expected behavior
- Tour should guide first-time users, but should not intrude repeatedly for existing users.
- Re-opening should be intentional.

## Actual behavior (before)
- Tour could re-open too often because dismissal state wasn’t persisted per workspace.

## Root cause
- `useState`-only open behavior without workspace-scoped persistence.
- No durable “dismissed” marker stored per org/workspace.

## Fix implemented
- Persist dismissal in `localStorage` per workspace:
  - key: `tofu:dashboard-tour:dismissed:${orgId}`
- Auto-open only when:
  - `defaultOpen` is true (first-time workspace state)
  - and user has not dismissed tour in localStorage.
- Close/dismiss updates localStorage on open state changes.

## Files/components changed
- Updated: `src/components/dashboard/dashboard-tour.tsx`
- Updated: `src/app/(dashboard)/dashboard/page.tsx` to pass `orgId` and gate with first-time state.

## Regression risk
Low

## Verification
Manual:
- First-time state: tour auto-opens once.
- After dismiss/finish: tour does not auto-open again on subsequent logins.

Automated:
- `npm run lint` passes with 0 errors.

## Related issues
- QA-003 (dashboard freshness) for state correctness across sessions.

## Date / audit reference
Launch-readiness hardening pass (2026-03-26)

