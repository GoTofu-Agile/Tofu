# Persona Quality Improvements

Date: 2026-03-27  
Scope: Persona generation quality, realism validation, repetition prevention, and section-level refinement UX.

## Issues found

1. Persona outputs reused generic/cliche language too often.
2. Backstory and quote sections showed repeated narrative patterns across runs.
3. Distinct personas could still converge on similar phrasing/voice.
4. Quality checks were strong on structure but weaker on realism depth signals.
5. Users had no way to refine only one weak section (had to regenerate whole flow).
6. Persona detail pages surfaced long text but lacked focused “trigger vs objection” insight.

## Repetition patterns identified

Most common low-signal patterns observed in generated content:

- "Growing up in a small town..."
- "Passionate about technology..."
- "Loves solving problems..."
- "Works in a fast-paced environment..."
- "Wears many hats..."
- "Driven by innovation..."
- "Data-driven decisions..."
- "Work-life balance..." used as generic filler

## Changes made

## 1) Prompt system upgrades (root-cause fix)

Updated `src/lib/ai/generate-personas.ts`:

- Added explicit anti-cliche prompt constraints and forbidden phrase list.
- Added style-variation engine (`STYLE_VARIANTS`) to diversify voice/structure across personas.
- Added stronger differentiation rules:
  - geography and environment variability
  - non-linear career path variation
  - socioeconomic context variation
- Added required realism constraints:
  - short-term + long-term goals
  - at least one explicit objection
  - at least one explicit decision trigger
  - visible contradiction in bio/backstory

## 2) Post-generation quality + refinement layer

Added validation/refinement logic in `src/lib/ai/generate-personas.ts`:

- Cliche detector (`getClicheHits`)
- Behavioral-depth gap detector (`hasBehavioralDepthGaps`)
- Retry reasons now include genericity + depth gaps, not just structural quality/similarity.
- Added automatic refinement pass (`refinePersonaCandidate`) when candidate quality is still weak after normal retries.
- Refinement rewrites weak persona sections while preserving schema validity and persona identity.

## 3) Variation and anti-repetition hardening

- Expanded generic language pattern detection.
- Strengthened similarity filtering and retry paths.
- Kept sequential generation so each persona conditions on prior accepted personas and avoids convergence.

## 4) UX improvements for quality control

Added section-level refinement endpoint + UI:

- New API: `POST /api/personas/regenerate-section`
  - File: `src/app/api/personas/regenerate-section/route.ts`
  - Supports section-specific rewrites for:
    - `bio`
    - `backstory`
    - `representativeQuote`
    - `dayInTheLife`
    - `communicationSample`
  - User controls:
    - tone (`balanced`, `conversational`, `analytical`, `direct`)
    - depth (`concise`, `standard`, `detailed`)
    - instruction (`make_more_realistic`, `make_more_specific`, `make_more_distinct`)

- New UI component: `src/components/personas/persona-section-refiner.tsx`
  - Added to Persona detail sections to allow targeted regeneration.

- Persona detail now highlights:
  - `Likely trigger`
  - `Likely objection`
  from existing behavior/frustration signals.

## Before vs after examples

### Before (generic)
- "Growing up in a small town, Alex always loved technology and wanted to make an impact."

### After (specific)
- "Alex spent six years managing dispatch escalations in a regional logistics center. He trusts tools that reduce handoffs, but still keeps a handwritten fallback list after a bad outage during peak season."

### Before (templated quote)
- "I enjoy trying new tools if they improve productivity."

### After (human + imperfect)
- "If a tool can save me one back-and-forth email, I’m in. If it asks me to rewire my whole week, I’ll ignore it until someone proves it actually works."

## Remaining risks

1. LLM outputs can still drift under unusual domains with sparse context.
2. Section-level regeneration currently reloads the page after update (functional but not fully optimistic).
3. No dedicated offline benchmark suite yet for persona “distinctness score” across large batches.

## Recommended next enhancements

1. Add automated regression checks that compute similarity/cliche rates on sampled generations.
2. Store refinement metadata per persona section for explainability and auditability.
3. Add one-click “Regenerate weakest section” based on quality diagnostics.
4. Add optional “strict realism mode” toggle for enterprise studies.
