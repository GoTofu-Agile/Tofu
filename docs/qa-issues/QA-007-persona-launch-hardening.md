# QA-007: Persona section launch hardening (multi-issue pass)

## Category
Functional Bug / UX Issue / Security / Accessibility / Analytics

## Severity
High

## Status
Fixed (Closed)

## Area
Persona section (list, create, detail, import/generation APIs)

## Environment
- Dashboard personas routes
- Persona creation flow
- Persona import/generation APIs

## Description
Launch review found multiple Persona-section issues impacting reliability, trust, and launch observability:
- mismatched persona count limits (UI vs API)
- missing critical user controls (delete group, duplicate persona)
- weak parsing safeguards (PDF and app URL)
- weak discoverability (no list search/filter/sort)
- insufficient launch analytics instrumentation

## Root cause
- Product and engineering drift across multiple creation surfaces with no shared constants.
- Critical server actions lacked corresponding UX controls.
- Validation boundaries were inconsistent between client and server.
- Persona telemetry standards were not fully applied to this feature area.

## Fix implemented
- Unified persona limits with shared constants (`1..100`) across Persona UIs.
- Added Persona list search/filter/sort and empty-filter state.
- Added group delete action (with confirmation) and persona duplicate action.
- Added App Store URL host allowlist checks.
- Added PDF MIME + size guards (10MB cap).
- Removed query-param domainContext override from generation defaults.
- Added Persona analytics events and page-view tracking hooks.
- Added real-time step detail subtext in pipeline progress.

## Files/components changed
- `PERSONA_LAUNCH_AUDIT.md`
- `src/lib/constants/persona-limits.ts`
- `src/lib/analytics/track.ts`
- `src/components/analytics/track-page-view.tsx`
- `src/components/personas/creation/unified-creation-flow.tsx`
- `src/components/personas/creation/persona-chat-bar.tsx`
- `src/components/personas/creation/step-sources.tsx`
- `src/components/personas/creation/step-manual.tsx`
- `src/components/personas/creation/step-templates.tsx`
- `src/components/personas/creation/chat-pipeline-progress.tsx`
- `src/components/personas/generate-personas-button.tsx`
- `src/components/personas/persona-group-actions.tsx`
- `src/components/personas/persona-detail-actions.tsx`
- `src/components/personas/persona-card.tsx`
- `src/app/(dashboard)/personas/page.tsx`
- `src/app/(dashboard)/personas/[groupId]/page.tsx`
- `src/app/(dashboard)/personas/[groupId]/[personaId]/page.tsx`
- `src/app/(dashboard)/personas/actions.ts`
- `src/lib/db/queries/personas.ts`
- `src/app/api/reviews/appstore/route.ts`
- `src/app/api/personas/extract-pdf/route.ts`

## Verification
Manual:
- Persona list search/filter/sort works and displays no-result state.
- Group delete requires confirmation and returns to list.
- Persona duplicate creates a copy and opens detail page.
- Persona source text/icon displays consistently.
- Pipeline step detail text appears under each step and updates by state.

Automated:
- `npm run lint` completed with 0 errors (existing warnings unchanged).

## Test coverage added/updated
- None (manual launch pass + lint validation).

## Regression risk
Medium
- Touches multiple Persona flows, but changes are incremental and preserve existing APIs/data model.

## Related issues
- QA-003 (freshness correctness approach)
- QA-005 (strict lint correctness patterns)

## Date / audit reference
Persona launch hardening pass (2026-03-27)
