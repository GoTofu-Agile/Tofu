# QA-008: Persona outputs felt generic and repetitive

## Category
UX Issue / AI Output Quality

## Severity
High

## Status
Fixed (Closed)

## Area
Persona generation engine and persona detail UX

## Description
Generated personas repeatedly used low-signal and cliche phrasing, reducing trust and practical usability.

## Root cause
- Prompt constraints were not strict enough against cliches.
- Quality checks emphasized structural validity more than realism depth.
- No section-level corrective UX when one field was weak.

## Fix implemented
- Expanded anti-cliche prompt constraints and forbidden phrase handling.
- Added style-variation directives and stronger distinctness constraints.
- Added post-generation refinement layer with behavioral realism checks.
- Added section-level regeneration API/UI with tone/depth controls.

## Files/components changed
- `src/lib/ai/generate-personas.ts`
- `src/app/api/personas/regenerate-section/route.ts`
- `src/components/personas/persona-section-refiner.tsx`
- `src/app/(dashboard)/personas/[groupId]/[personaId]/page.tsx`
- `PERSONA_QUALITY_IMPROVEMENTS.md`

## Verification
Manual:
- Generate multiple personas; verify reduced phrase repetition and stronger differentiation.
- Use section refiner controls for quote/backstory/bio/day-in-life and confirm updates persist.

Automated:
- `npm run lint` succeeded with 0 errors.
- `npm run build` succeeded.

## Test coverage added/updated
- None (manual quality pass + lint/build validation).

## Regression risk
Medium
- Prompt and refinement logic changes are significant but scoped to persona generation pipeline.

## Date / audit reference
Persona quality hardening pass (2026-03-27)
