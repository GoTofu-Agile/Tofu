# Persona Backstory Fix

Date: 2026-03-27

## Previous issues

- Backstories used pronouns heavily, creating narrative-style generic output.
- Repeated tropes appeared frequently (e.g., "growing up in a small town").
- Different personas shared similar origin/education/early-exposure patterns.
- Backstories lacked a compact, factual, consistently structured format.
- Narrative tone and cliché phrasing reduced trust and realism.

## Fixes applied

## 1) Updated backstory prompt rules (strict format)

In `src/lib/ai/generate-personas.ts`, the generation prompt now enforces:

- No pronouns in backstory text.
- No banned phrases:
  - `growing up`
  - `passionate about`
  - `has always been interested in`
  - `from a young age`
  - `loves to`
- No narrative storytelling style.
- Exactly 6 labeled lines:
  - `Origin:`
  - `Education:`
  - `Early exposure:`
  - `Career path:`
  - `Current situation:`
  - `Key life factors:`

## 2) Diversity constraints for backstory differentiation

Backstory generation now includes explicit variation constraints:

- geography/environment variation
- education path variation
- early exposure type variation
- career trajectory variation
- socioeconomic/life-constraint realism

## 3) Similarity detection + regeneration

Added post-generation checks:

- backstory line-count and required-label validation
- banned phrase detection
- pronoun detection
- line-pattern similarity checks against previous personas for:
  - origin
  - education
  - early exposure
- overall backstory similarity threshold checks

If any check fails, backstory is auto-rewritten via strict rewrite pass.

## 4) Language filter

Added automatic pronoun sanitizer before validation:

- removes disallowed pronouns
- normalizes spacing/punctuation artifacts after replacement

If backstory still fails constraints, rewrite loop is triggered.

## 5) Compact structure enforcement

Backstory quality gate now requires:

- 5–7 lines maximum (target is exactly 6 from prompt)
- required labeled sections
- no overlapping filler lines
- each line contributes distinct factual information

## Before vs After examples

### Before
"Growing up in a small town, Alex was always passionate about technology and loved solving problems."

### After
"Origin: Logistics-heavy port district in Busan with dense shift-work economy.  
Education: Two-year network systems diploma after one gap year in warehouse operations.  
Early exposure: Night-shift IT desk role resolving scanner outages for cross-border shipments.  
Career path: Helpdesk to operations analyst to customer implementation specialist in B2B SaaS.  
Current situation: Mid-level implementation lead balancing aggressive rollout targets with limited QA support.  
Key life factors: Household income volatility, repeated overtime cycles, high sensitivity to workflow disruption."

## Implementation files

- `src/lib/ai/generate-personas.ts`

## Remaining risks

- LLM variance can still produce edge-case awkward phrasing after pronoun stripping.
- Further improvement opportunity: add offline automated batch-quality tests that score backstory distinctness across 20+ outputs.

