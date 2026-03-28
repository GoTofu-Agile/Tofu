# Persona Launch Audit

Date: 2026-03-27  
Scope: Persona list, creation flow, generation, group detail, persona detail, related import/research APIs.

## Summary of issues found

1. Persona count constraints were inconsistent across UI (up to 500) vs backend/API validation (max 100).  
2. Persona quick-create data source menu exposed misleading options (CVs) in chat flow where no direct CV ingestion happens.  
3. Group detail generation accepted `domainContext` from query string, which could override stored context unexpectedly.  
4. App Store review ingestion accepted any URL host, not just Apple App Store domains.  
5. PDF extraction flow lacked strict MIME/size guardrails before parsing content.  
6. Persona group management lacked an accessible, user-facing delete action in group detail.  
7. Persona detail lacked quick duplicate action for fast iteration/testing.  
8. Persona funnel had limited analytics instrumentation for launch diagnostics.  
9. Persona list lacked first-class search/filter/sort controls and “no match” state.  
10. Pipeline progress lacked subtext explaining what each stage was parsing in real time.

## Improvements implemented

### UX and product improvements
- Added persona list controls for:
  - search by name/context
  - source filter
  - sorting by newest/name/persona count
- Added explicit “no matching groups” state.
- Added source visibility under persona names (and icons for source type).
- Added real-time detail text under each pipeline stage describing what is being parsed.
- Added group-level destructive action:
  - delete group with confirmation and redirect.
- Added persona-level productivity action:
  - duplicate persona from detail page.

### Engineering and reliability improvements
- Introduced shared persona limits constants (`1..100`) and aligned creation UIs to backend caps.
- Removed misleading quick-create “CVs” source from chat bar to prevent false expectations.
- Stopped trusting query-param `domainContext` in group detail generation.
- Hardened App Store ingestion endpoint with host allowlist validation:
  - `apps.apple.com`, `itunes.apple.com`.
- Hardened PDF extraction endpoint with:
  - MIME allowlist for PDF
  - max file size guard (10MB).

### Analytics improvements
- Added client analytics utility (`trackEvent`) with event fan-out hooks.
- Added launch-critical Persona events:
  - `persona_section_viewed`
  - `persona_create_started`
  - `persona_create_completed`
  - `persona_create_failed`
  - `persona_generation_started`
  - `persona_generation_completed`
  - `persona_generation_failed`
  - `persona_create_method_selected`
  - `persona_import_used`
  - `persona_group_delete_confirmed`
  - `persona_duplicate_clicked`
- Added page view tracking for:
  - persona list
  - persona group detail
  - persona detail
  - persona create flow.

## Bugs fixed (issue → root cause → fix)

### 1) Count mismatch caused invalid generation attempts
- **Issue:** Users could pick up to 500 personas in some controls, but API rejects >100.
- **Root cause:** UI slider/dropdown limits diverged from zod/API constraints.
- **Fix:** Added centralized constants and aligned all persona creation inputs to `1..100`.

### 2) Potential unsafe URL ingestion in App Store scraping
- **Issue:** Any URL could be passed to reviews ingestion endpoint.
- **Root cause:** Only `z.string().url()` validation existed (no host constraint).
- **Fix:** Added explicit App Store host allowlist validation and user-facing error.

### 3) PDF ingestion lacked resource safeguards
- **Issue:** PDF route parsed file without file type/size checks.
- **Root cause:** No pre-parse MIME/size validation branch.
- **Fix:** Added PDF MIME allowlist and 10MB size cap before parsing.

### 4) Group generation could be influenced by URL query context
- **Issue:** Group detail used query `domainContext` when generating personas.
- **Root cause:** Trusting optional search params for generation context.
- **Fix:** Generation now uses stored group context only.

### 5) Missing launch-critical management actions
- **Issue:** Group delete and persona duplicate were not surfaced where users work.
- **Root cause:** Server actions existed (delete), but no user-facing controls.
- **Fix:** Added group delete action UI and persona duplicate action UI with feedback.

## Files changed (high level)

- `src/lib/constants/persona-limits.ts`
- `src/lib/analytics/track.ts`
- `src/components/analytics/track-page-view.tsx`
- `src/components/personas/creation/persona-chat-bar.tsx`
- `src/components/personas/creation/step-sources.tsx`
- `src/components/personas/creation/step-manual.tsx`
- `src/components/personas/creation/step-templates.tsx`
- `src/components/personas/creation/unified-creation-flow.tsx`
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

## Remaining risks / follow-ups

1. Persona inline editing/rename UX is still limited and would benefit from dedicated edit flows.  
2. Bulk actions for persona cards (bulk archive/delete/tag) are not implemented.  
3. Server-side analytics persistence is still minimal; current instrumentation is primarily client-side telemetry hooks.  
4. Generation idempotency controls (prevent accidental repeated runs for same group) can be expanded further.  
5. Additional automated test coverage should be added for persona actions and API guards.

## Recommended future enhancements (post-launch)

- Add explicit regenerate/version history for persona outputs.
- Add persona compare mode and bulk operations.
- Add server-side event pipeline for analytics with stable event schema.
- Add richer retry UX per pipeline step with direct “retry failed step” affordances.
- Add dedicated permissions-based controls for destructive actions in list/grid views.
