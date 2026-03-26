# QA-004: Dashboard error CTA used invalid Button/Link composition

## Category
Accessibility

## Severity
High

## Status
Fixed (Closed)

## Area
Dashboard error state
- `src/app/(dashboard)/error.tsx`

## Environment
- Dashboard route error boundary
- Triggered when `src/app/(dashboard)/layout.tsx` throws due to `organizations.length === 0`

## Reproduction steps
1. Log in with an account that has no organizations (so `organizations.length === 0` in `src/app/(dashboard)/layout.tsx`).
2. Navigate to `/dashboard`.
3. Observe the buttons/CTAs rendered on the dashboard error screen.

## Expected behavior
- Error screen CTAs should be semantically correct and accessible.
- Clickable actions should use a consistent element type (e.g., `<Link>` styled as button).

## Actual behavior (before)
- One CTA used `Button render={<Link .../>}>` which can lead to invalid DOM composition depending on Base UI button implementation.

## Root cause
- Incorrect component composition for interactive elements in error UI.

## Fix implemented
- Replaced the problematic CTA with a proper `next/link` styled using `buttonVariants({ variant: "outline" })`.

## Files/components changed
- Updated: `src/app/(dashboard)/error.tsx`

## Regression risk
Low

## Verification
Manual:
- Error page buttons remain clickable and readable.
Automated:
- `npm run lint` reports no errors.

## Test coverage added/updated
- None (manual verification; `npm run lint` passes with 0 errors)

## Date / audit reference
Launch-readiness hardening pass (2026-03-26)

