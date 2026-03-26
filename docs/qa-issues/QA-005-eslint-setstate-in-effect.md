# QA-005: ESLint errors for setState inside useEffect

## Category
State Management / Engineering correctness

## Severity
High

## Status
Fixed (Closed)

## Area
React effect patterns (launch-blocking for strict lint)
- `src/components/feedback/feedback-overlay.tsx`
- `src/components/studies/study-flow.tsx`

## Environment
- CI / `npm run lint`
- React hooks runtime

## Reproduction steps
1. Run `npm run lint`.
2. Observe ESLint rule violations:
   - `react-hooks/set-state-in-effect`

## Expected behavior
- No ESLint errors. (Warnings are allowed but do not block launch.)

## Actual behavior (before)
- Two files violated strict lint rule:
  - `FeedbackOverlay` called `setPosition` and `setReady` directly inside a `useEffect`.
  - `StudyFlow` called `setAnalysisReport` and `setAnalysisReports` directly inside a `useEffect`.

## Root cause
- Strict lint rule `react-hooks/set-state-in-effect` flagged setState usage patterns inside effect bodies.

## Fix implemented
- Wrapped the setState updates in `requestAnimationFrame`:
  - `feedback-overlay`: setPosition/setReady in RAF
  - `study-flow`: setAnalysisReport/setAnalysisReports in RAF

## Files/components changed
- Updated: `src/components/feedback/feedback-overlay.tsx`
- Updated: `src/components/studies/study-flow.tsx`

## Regression risk
Low
- No logic changes; timing moved by 1 frame to satisfy lint and avoid cascading renders.

## Verification
- `npm run lint` now shows **0 errors** (warnings remain repo-wide).
- `npm run build` succeeded.

## Test coverage added/updated
- None (manual verification via `npm run lint` and `npm run build` only; no unit tests added)

## Date / audit reference
Launch-readiness hardening pass (2026-03-26)

