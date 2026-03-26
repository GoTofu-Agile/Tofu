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
- Any scenario that triggers Next.js error boundary for dashboard

## Reproduction steps
1. Force an error boundary render (e.g., simulate thrown error in dashboard data path).
2. Observe the buttons/CTAs rendered on the error screen.

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

## Date / audit reference
Launch-readiness hardening pass (2026-03-26)

