# GoTofu Persona Framework — Research & Design Document

> **Status**: Research & Evaluation Phase — no code will be written until the open questions at the end of this document are answered.

---

## 1. The GoTofu Persona Framework

### What a GoTofu Persona Is

A GoTofu persona is not a demographic profile — it's a **psychologically consistent behavioral simulation model**. The key difference from flat personas: demographics explain only ~1.5% of behavioral variance. What really matters is psychographic depth, narratives, and internal contradictions.

The framework is built in 5 layers:

---

### Layer 1: Identity (Who they are)

Basic demographic data — deliberately *not* overweighted, since demographics alone don't enable behavioral predictions.

| Field | Type | Examples |
|------|-----|-----------|
| name, age, gender, location | string / int | ✅ already implemented |
| occupation | string | ✅ |
| `incomeBracket` | enum | `<25k | 25-50k | 50-100k | 100-250k | 250k+` |
| `educationLevel` | enum | `high_school | vocational | bachelor | master | phd` |
| `companySizePreference` | enum | `solo | startup | smb | enterprise` |
| `yearsExperience` | int | Years of professional experience |

---

### Layer 2: Psychology (How they think)

The core differentiator. This is where GoTofu stands out.

**Big Five / OCEAN** *(all 0–1 floats, already implemented)*:
- `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism`

**Decision-making behavior** *(already implemented)*:
- `decisionMakingStyle`: analytical | intuitive | dependent | avoidant | spontaneous
- `riskTolerance`, `trustPropensity`, `emotionalExpressiveness`

**To be added**:
- `adoptionCurvePosition`: `INNOVATOR | EARLY_ADOPTER | EARLY_MAJORITY | LATE_MAJORITY | LAGGARD` — positions the persona on Rogers' Technology Adoption Curve, extremely useful for product research
- `changeReadiness` (0–1): how open the persona is to behavioral changes / product switches

**Research background**: The SCOPE Framework (2025) shows that full psychological conditioning increases prediction correlation from 0.624 to 0.667 compared to demographics-only approaches. Personality vectors (Big Five) can be reliably encoded in LLMs via prompt engineering.

---

### Layer 3: Behavior (What they do)

| Field | Type | Status |
|------|-----|--------|
| `goals` | string[] | ✅ |
| `frustrations` | string[] | ✅ |
| `behaviors` | string[] | ✅ |
| `coreValues` | string[] (ranked) | ✅ |
| `dayInTheLife` | text narrative | ✅ |
| `techLiteracy` | int 1–5 | ✅ |
| `domainExpertise` | novice/intermediate/expert | ✅ |

---

### Layer 4: Communication (How they speak)

| Field | Type | Status |
|------|-----|--------|
| `communicationStyle` | direct/verbose/analytical/empathetic | ✅ |
| `vocabularyLevel` | casual/professional/academic/technical | ✅ |
| `responseLengthTendency` | short/medium/long | ✅ |
| `directness` | 0–1 | ✅ |
| `criticalFeedbackTendency` | 0–1 | ✅ |
| `tangentTendency` | 0–1 | ✅ |
| `representativeQuote` | text | ✅ |
| `communicationSample` | text | ✅ |

---

### Layer 5: Research Behavior (How they behave in studies)

Not stored separately — computed from Layer 2+4 and displayed in the UI:

**Predicted Sycophancy Score** = `(agreeableness + (1 - criticalFeedbackTendency)) / 2`

- Score > 0.65 → "Agreeable" (Caution: high sycophancy risk)
- Score 0.35–0.65 → "Balanced"
- Score < 0.35 → "Skeptic" (most valuable personas for honest feedback)

**Research background**: Sycophancy is the biggest risk in AI-powered research. LLMs tend to be agreeable and positive. GoTofu already combats this with the 30% skeptic mechanism in the prompt. The Predicted Sycophancy Score makes this visible and filterable for users.

---

### Framework Metadata (New fields for validation)

These fields are especially critical for the **temporal validation strategy** (simulate a study with pre-2025 data, then compare with real post-2025 results):

| Field | Type | Purpose |
|------|-----|-------|
| `dataTemporalRangeStart` | DateTime | Earliest source date used |
| `dataTemporalRangeEnd` | DateTime | Latest source date used |
| `dataSourceTypes` | String[] | Which sources were used (REDDIT, G2_REVIEW, etc.) |
| `confidenceScore` | Float 0–1 | How much real data vs. hallucination |
| `geographicCoverage` | String[] | Countries/regions of source data |
| `frameworkVersion` | String | GoTofu framework version at generation time |

The `confidenceScore` is derived from: Number of DomainKnowledge entries / expected minimum count × source quality score. At 0 DomainKnowledge = 0.0 (pure hallucination). At 20 high-quality sources → 1.0.

---

### Quality Scoring (Extended)

Currently GoTofu has a 16-point system in `computeQualityScore()`. Extension with 6 new checks:

| Check | What it checks | Why it matters |
|-------|-------------|---------------|
| **Personality Extremity** | At least 3 of 5 Big Five with `|trait - 0.5| > 0.2` | Prevents "mediocre" personas |
| **Trait Coherence** | Agreeableness < 0.4 when CriticalFeedback > 0.6 | Internal consistency for skeptics |
| **Backstory Specificity** | Contains proper nouns / specific locations | Specific events, not generic |
| **Values Uniqueness** | No duplicate strings in coreValues | Quality control |
| **Internal Contradiction** | Backstory contains "but/however/despite/although" | CRITICAL RULE from the prompt framework |
| **Data Grounding** | `confidenceScore > 0` | Data-based > prompt-generated |

**Post-Interview Quality Validation** (after batch interviews):
- `sycophancyActualScore`: Sentiment ratio of RESPONDENT messages
- If > 85% positive sentences: flag persona as "sycophancy risk"
- Feedback to framework for future generations

---

### Prompt Weighting (5-Layer Architecture)

The current 5-layer prompt architecture in `generate-personas.ts` is already state-of-the-art. Explicit weighting to build into the prompt:

```
Psychological Depth:     30%  (Personality, motivation, values)
Behavioral Specificity:  25%  (Concrete behaviors, jobs-to-be-done)
Narrative Authenticity:  20%  (Backstory with real events)
Communication Realism:   15%  (Speech style, vocabulary, tonality)
Demographic Grounding:   10%  (Only for positioning — don't stereotype)
```

---

## 2. The Curated Persona Library

### Concept

A global, precomputed pool of synthetic personas — curated by GoTofu, not created by the customer. Customers can filter and import.

**Goal**: 1M+ personas with systematic coverage of the global economy.

**Generation strategy** (build iteratively):
- Phase 1: ~200 industries × 10 job functions × 5 personas = 10,000 personas
- Phase 2: Expand to 100,000 via automated pipelines
- Phase 3: 1M+ through continuous enrichment

**Technical foundation**: The field `isPrebuilt: Boolean` on `PersonaGroup` is *already in the schema* — the library was anticipated in the initial design.

---

### Filter Dimensions

What users should be able to filter in the library:

**Demographic**:
- Age group (18–25, 26–35, 36–45, 46–55, 56+)
- Gender
- Geography / Region
- Income bracket
- Education level

**Professional**:
- Industry (SaaS, Healthcare, Finance, Retail, Education, etc.)
- Job function (Engineering, Marketing, Sales, Operations, etc.)
- Seniority / years of experience
- Company size

**Psychographic** *(this is the differentiator)*:
- Adoption Curve Position (Innovator → Laggard)
- Decision Making Style
- Research Personality (Skeptic / Balanced / Agreeable)
- Tech Literacy (1–5)
- Domain Expertise

**Data Provenance** *(for validation studies)*:
- Source platforms (Reddit, G2, App Store, etc.)
- Time range of source data (for temporal validation)
- Geographic coverage of data
- Confidence score (min. threshold)

**Semantic Search**: "Find personas frustrated with enterprise software onboarding" → pgvector similarity search on the `embedding` field (which already exists in both tables but is not yet used).

---

### Import Flow

1. User searches/filters in the library
2. Selects N personas
3. "Import to my workspace" → creates new PersonaGroup in user's org
4. Copies Persona records with PersonalityProfile
5. Links to original via `sourceReference` JSON (already in schema)
6. User can immediately start studies with them

---

## 3. The Data Sourcing Pipeline

### Overarching Principle

The goal is **data-grounded personas** (high `confidenceScore`) rather than pure LLM hallucination. Persona quality is directly proportional to the quality and relevance of source data.

The existing `DomainKnowledge` table is already perfectly designed for this — with `sourceType`, `publishedAt`, `relevanceScore`, `sentiment`, `embedding` and all necessary provenance fields.

---

### Data Sources — Evaluation and Prioritization

**Tier 1: Immediately available, high quality**

| Source | Strength | Tool | Cost | Bias |
|--------|--------|------|--------|------|
| **Reddit** | Community discussions, authentic language, opinion depth | Reddit Official API | Free (100 req/min) | Tech-skewed |
| **G2 Reviews** | B2B buyers, decision processes, comparisons | Apify Actor | ~$5/1k | B2B/SaaS |
| **Trustpilot** | Consumer sentiment, clear pain points | Apify Actor | ~$5/1k | Consumer goods |
| **Tavily** | News, blogs, industry context | Already integrated | 1k free/mo | English-heavy |

**Tier 2: Medium-term**

| Source | Strength | Tool | Cost |
|--------|--------|------|--------|
| **App Store / Play Store** | Mobile users, short direct statements | Apify Actor | ~$3/1k |
| **Pew Research** | Representative surveys, validated data | CSV download | Free |
| **Product Hunt Comments** | Early adopters, maker mindset | Apify Actor | ~$3/1k |
| **Hacker News** | Developers, deep technical analysis | Public API | Free |

**Tier 3: Long-term**

| Source | Obstacle |
|--------|-----------|
| LinkedIn | ToS issues, high cost for reliable access |
| Twitter/X | API extremely expensive ($100/mo+ for meaningful volume) |
| Bluesky / Mastodon | Growing, liberal APIs — good for the future |

---

### Pipeline Architecture (Concept)

```
User Input (describe target audience)
        ↓
Source Selection Engine
(Which sources are relevant for this audience?)
        ↓
Parallel Scraping Jobs (Inngest fan-out)
    ├── Reddit: relevant subreddits + keywords
    ├── Reviews: G2/Trustpilot for industry/product
    ├── News: Tavily for context + trends
    └── Custom URLs: existing implementation
        ↓
NLP Processing Layer
    ├── Deduplication (SHA-256 content hash)
    ├── Relevance Scoring (embedding similarity to target audience)
    ├── Sentiment Tagging (positive / negative / neutral)
    ├── Embedding Generation (text-embedding-3-small, already in provider.ts)
    └── Temporal Tagging (publishedAt, scrapedAt)
        ↓
DomainKnowledge Storage (schema already fully ready)
        ↓
Persona Generation (existing pipeline — now with richer RAG)
```

---

### NLP Processing: What Can Be Extracted from Text

| Signal | Extraction Method | Output |
|--------|-------------------|--------|
| **Pain Points** | Aspect-Based Sentiment Analysis (BERT) | Ranked pain point list |
| **Goals** | Topic Modeling (LDA / BERTopic) | Job-to-be-done clusters |
| **Personality Signals** | LIWC mapping or LLM extraction | Big Five tendencies |
| **Vocabulary Level** | Syntactic complexity, technical term frequency | casual/professional/technical |
| **Decision Making** | Data-language vs. gut-feeling-language | analytical vs. intuitive |

For GoTofu, an **LLM-based extraction step** (already implemented for URL+text) is the most pragmatic approach. The existing `extractedContextSchema` already provides the correct output structure.

---

### Data Quality Control

| Control | Implementation Idea |
|---------|---------------------|
| Minimum content length | `content.length < 100` → discard |
| Deduplication | SHA-256 hash of normalized text |
| Language | Only `language: 'en'` initially, multilingual later |
| Relevance threshold | Cosine similarity to target audience > 0.3 (pgvector) |
| Temporal tagging | Always save `publishedAt` — critical for validation |
| Source quality score | Reddit: upvote ratio; Reviews: verified purchase flag |

---

### Important Bias Warning

Research shows: LLMs have a strong **WEIRD bias** (Western, Educated, Industrialized, Rich, Democratic):
- White persons overrepresented at 88–99%
- Strong concentration in tech/finance/creative professions
- Geographic concentration on NYC, SF, London

**GoTofu strategy**: Data-grounded generation (high `confidenceScore`) reduces this bias — but doesn't eliminate it. The `geographicCoverage` metadata allows users to consciously decide which sources shape their persona set.

---

## 4. Validation Strategy (How We Prove Quality)

### Two Core Methods (already planned)

1. **Concurrent Validity**: 500 real students vs. 500 synthetic personas — same questions, compare results
2. **Temporal Predictive Validity**: Pre-2025 data → simulate study → compare with real post-2025 results. The `dataTemporalRangeEnd` field is essential for this.

### Additional Validation Approaches

| Method | What It Proves | Effort |
|---------|----------------|---------|
| **Replication of Published Studies** | GoTofu reproduces results from peer-reviewed papers | Medium — public datasets available |
| **Turing Test for Transcripts** | UX researchers can't distinguish real from synthetic interviews | Low — only need to recruit evaluators |
| **Construct Validity** | Skeptic personas are measurably more critical than agreeable personas | Low — purely testable internally |
| **A/B Product Decision Tracking** | Partner companies use GoTofu insights for product decisions → track if correct | High — needs committed partners |
| **WEIRD Bias Audit** | GoTofu produces less bias than competitors with data-grounded personas | Medium — comparable test |
| **Inter-Study Reliability** | Same study 3× → consistent core themes and recommendations | Low — fully automatable |

---

## 5. Open Questions (to clarify before implementation)

### Product / UX
1. Will the library be shown as a separate section in the sidebar, or as part of the personas flow?
2. Is data sourcing automatic (background) or a manual "Enrich" step?
3. Can free-tier users browse the library, or only paid customers?

### Business
4. How are scraping costs (Apify: ~$5/1k reviews) billed to the customer?
5. First version English only — when does multilingual support come?

### Technical
6. Which scraping sources have priority based on customer segment? (B2B → G2 first; Consumer → App Store + Reddit)
7. Is Supabase pgvector performant enough for 1M+ personas with semantic search, or do we need a separate vector store?
8. Evaluate Inngest limits for long-running fan-out pipelines (scraping can take 10–60 minutes)

---

## What Already Exists in Code (don't rebuild)

- **DomainKnowledge Schema**: complete with all sourceTypes (REDDIT, G2_REVIEW, TRUSTPILOT, APP_REVIEW, etc.), provenance fields, embedding vector ✅
- **PersonaDataSource**: provenance link between Persona and Source ✅
- **isPrebuilt on PersonaGroup**: library architecture anticipated ✅
- **Tavily Integration**: basis for data pipeline ✅
- **5-Layer Prompt Architecture**: anti-sycophancy, RAG, differentiation ✅
- **Embedding Columns**: on Persona and DomainKnowledge (just need activation) ✅
- **qualityScore**: 16-point scoring during generation ✅
