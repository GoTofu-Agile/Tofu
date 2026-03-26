# QA-001: Dashboard flow tooltips nested inside clickable cards

## Category
Accessibility

## Severity
High

## Status
Fixed (Closed)

## Area
Dashboard (How It Works cards)
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/dashboard/dashboard-flow-card.tsx`

## Environment
- Next.js app (dashboard)
- Keyboard + screen reader navigation

## Reproduction steps
1. Go to `/dashboard`.
2. Hover or focus the `?` tooltip icon inside the “How It Works” step cards.
3. Try clicking the card background vs clicking the tooltip icon.
4. Use keyboard only: Tab into the card, then tab into the tooltip trigger.

## Expected behavior
- Tooltip icon should be interactable without breaking semantics.
- Card should navigate reliably via keyboard/screen reader.
- No invalid nested interactive elements.

## Actual behavior (before)
- Tooltip trigger was rendered as a real button inside a clickable `Link`-wrapped card.
- This creates invalid DOM nesting and can break keyboard focus/activation and screen reader interpretation.

## Root cause
- Invalid component composition: tooltip trigger (button) nested inside a parent clickable link/card.

## Fix implemented
- Introduced `DashboardFlowCard` which renders the card as a keyboard-accessible `div` (`role="link"`, `tabIndex`, key handlers).
- Tooltip trigger is no longer nested inside a link element.

## Files/components changed
- Added: `src/components/dashboard/dashboard-flow-card.tsx`
- Updated: `src/app/(dashboard)/dashboard/page.tsx` to use `DashboardFlowCard`

## Regression risk
Low

## Verification
Manual:
- Confirm `?` tooltip appears on hover/focus.
- Confirm card navigation works from keyboard (Enter/Space).

Automated:
- `npm run lint` (no errors)

## Related issues
- QA-006 (tooltip frequency gating) for onboarding noise reduction
- QA-002 (tour auto-open frequency) for onboarding persistence control

## Test coverage added/updated
- None (manual keyboard + hover verification; `npm run lint` passed with no errors)

## Date / audit reference
Launch-readiness hardening pass (2026-03-26)

