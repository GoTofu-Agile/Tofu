# GoTofu — Synthetic User Interview Platform: Implementation Plan

## Context

GoTofu is a SaaS platform for synthetic user interviews. Customers can create organizations, generate synthetic user personas (prompt-based, from real data, or from their own data), cluster them into groups, and conduct studies (interviews, surveys, focus groups, etc.). Three startup customers (midwives, foreigners in Germany, period planning) need pre-installed persona groups. The app must be minimalist, Apple-like, and scalable (10k+ personas per group).

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-------|
| Framework | **Next.js 15** (App Router) | Full-stack TypeScript, Server Actions, API Routes |
| Language | **TypeScript** (end-to-end) | One language for frontend + backend + AI integration |
| Backend Platform | **Supabase** (All-in-One) | PostgreSQL + Auth + Storage + Realtime in one. Open source. |
| Database | **Supabase PostgreSQL + Prisma ORM + pgvector** | Type-safe queries, JSON columns, vector search, RLS |
| Auth | **Supabase Auth** | Email, OAuth, Magic Links, 2FA. Org management via custom tables + RLS |
| AI | **Vercel AI SDK** | Unified interface for OpenAI, Anthropic, Google — LLM switch = 1 line |
| UI | **shadcn/ui + Tailwind CSS** | Apple-like minimalism, accessible, composable |
| Queue/Jobs | **Inngest** | Serverless background jobs, event-driven, retries, monitoring dashboard |
| Files | **Supabase Storage** | File uploads with RLS-secured buckets, presigned URLs |
| Search | **PostgreSQL Full-Text Search** (MVP) | tsvector is sufficient for 10k+ personas, no extra service |
| Realtime | **Supabase Realtime** | WebSocket-based: Broadcast, Presence, DB Changes |
| Research | **Tavily API** | Web research for domain-specific knowledge |
| Deploy | **Vercel** | Native Next.js support, Edge Functions, CI/CD built-in |

---

## Why Next.js + Supabase

| Criterion | Next.js + Supabase | Laravel |
|-----------|-------------------|---------|
| AI SDKs | Official SDKs for OpenAI, Anthropic, Google | No official PHP SDKs |
| LLM Switch | Vercel AI SDK: change 1 import | Build custom HTTP wrappers |
| Languages | 1 (TypeScript) | 2 (PHP + TypeScript) |
| Backend Services | Supabase = DB + Auth + Storage + Realtime in 1 | Separate services for everything |
| Data Isolation | Supabase RLS (DB-level security) | Application-level WHERE clauses |
| Open Source | Supabase is open source (self-hostable) | Laravel yes, but Forge/Vapor not |
| Finding Engineers | Easier for AI projects | Harder |

---

## Project Structure

```
gotofu/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (auth)/                       # Auth pages (Supabase Auth)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── callback/route.ts         # OAuth Callback
│   │   ├── (dashboard)/                  # Authenticated Layout Group
│   │   │   ├── layout.tsx                # Sidebar + TopBar + OrgSwitcher
│   │   │   ├── page.tsx                  # Dashboard
│   │   │   ├── personas/
│   │   │   │   ├── page.tsx              # Persona Groups Overview
│   │   │   │   ├── [groupId]/
│   │   │   │   │   ├── page.tsx          # Group Detail + Persona Grid
│   │   │   │   │   └── [personaId]/page.tsx  # Persona Detail
│   │   │   │   └── create/page.tsx       # Generation Wizard
│   │   │   ├── studies/
│   │   │   │   ├── page.tsx              # Studies Overview
│   │   │   │   ├── create/page.tsx       # Study Creation Wizard
│   │   │   │   ├── [studyId]/
│   │   │   │   │   ├── page.tsx          # Study Detail + Sessions
│   │   │   │   │   ├── sessions/[sessionId]/page.tsx  # Session Transcript
│   │   │   │   │   └── results/page.tsx  # Analysis Dashboard
│   │   │   ├── uploads/page.tsx          # Upload Manager
│   │   │   └── settings/
│   │   │       ├── page.tsx              # Org Settings
│   │   │       └── members/page.tsx      # Member Management
│   │   ├── api/                          # API Routes
│   │   │   ├── inngest/route.ts          # Inngest webhook endpoint
│   │   │   └── uploads/route.ts          # File upload endpoint
│   │   ├── layout.tsx                    # Root Layout (Supabase Provider)
│   │   └── page.tsx                      # Landing Page
│   ├── components/
│   │   ├── ui/                           # shadcn/ui base components
│   │   ├── personas/                     # PersonaCard, PersonaGrid, FilterBuilder, GenerationWizard
│   │   ├── studies/                      # StudyWizard, SessionViewer, StudyTypeSelector
│   │   ├── analysis/                     # ResultsDashboard, SentimentChart, ThemeCloud
│   │   └── layout/                       # Sidebar, TopBar, OrgSwitcher
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # Browser Supabase Client
│   │   │   ├── server.ts                # Server-side Supabase Client
│   │   │   └── middleware.ts            # Auth Middleware (Session Refresh)
│   │   ├── ai/
│   │   │   ├── provider.ts              # Vercel AI SDK Provider Config
│   │   │   ├── prompts/                 # Prompt Templates
│   │   │   ├── bias-detector.ts
│   │   │   └── quality-checker.ts
│   │   ├── db/
│   │   │   ├── prisma.ts                # Prisma Client Singleton
│   │   │   └── queries/                 # Typed Query Functions
│   │   ├── research/
│   │   │   └── tavily.ts                # Tavily API Client
│   │   ├── uploads/                     # File Processing
│   │   ├── inngest/
│   │   │   ├── client.ts                # Inngest Client
│   │   │   └── functions/               # Background Job Definitions
│   │   └── utils/
│   │       ├── constants.ts
│   │       └── validation.ts            # Zod Schemas
│   ├── hooks/                           # React Hooks
│   └── types/
├── prisma/
│   ├── schema.prisma                    # Database Schema
│   ├── migrations/
│   └── seed.ts                          # Pre-built Groups Seeder
├── public/
├── .env.example
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## LLM-Agnostic Architecture (Vercel AI SDK)

> **Note**: Supabase handles Auth, Storage, Realtime, and DB.
> The Vercel AI SDK handles LLM integration — completely separate concerns.

The Vercel AI SDK solves the provider lock-in problem **out of the box**:

```typescript
// lib/ai/provider.ts
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

const providers = {
  openai: () => openai(process.env.OPENAI_MODEL || 'gpt-4o'),
  claude: () => anthropic(process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514'),
  gemini: () => google(process.env.GEMINI_MODEL || 'gemini-2.0-flash'),
} as const;

export function getModel() {
  const provider = process.env.LLM_PROVIDER || 'openai';
  return providers[provider]();
}
```

```typescript
// Usage anywhere in the code — provider-agnostic:
import { generateObject, generateText, streamText } from 'ai';
import { getModel } from '@/lib/ai/provider';

const result = await generateObject({
  model: getModel(),                    // ← OpenAI, Claude, or Gemini
  schema: personaSchema,                // ← Zod Schema = type-safe JSON output
  prompt: 'Generate a midwife persona...',
});
```

### Switching providers = 1 line in .env
```bash
LLM_PROVIDER=claude          # Switch from OpenAI to Claude
ANTHROPIC_API_KEY=sk-ant-... # Set key — done
```

### Multimodal-Ready
The Vercel AI SDK already supports multimodal (images, PDFs):
```typescript
const result = await generateText({
  model: getModel(),
  messages: [{ role: 'user', content: [
    { type: 'text', text: 'Analyze this survey screenshot' },
    { type: 'image', image: imageBuffer },
  ]}],
});
```

---

## Database Schema (Prisma)

*(Full Prisma schema omitted for brevity — see `prisma/schema.prisma`)*

Core models: User, Organization, OrganizationMember, OrganizationInvitation, PersonaGroup, Persona, PersonalityProfile, PersonaAttribute, Study, StudyPersonaGroup, Session, SessionMessage, SessionResponse, Upload, AnalysisReport, DomainKnowledge, Tag, UsageLog.

Key enums: SourceType, StudyType, StudyStatus, SessionStatus, MessageRole, UploadType, ProcessingStatus, OrgRole.

---

## Persona Source Types (Labels)

| Label | Description | How Generated |
|-------|-------------|---------------|
| **Prompt Generated** | User creates via prompt through our UI | LLM (via Vercel AI SDK — OpenAI/Claude/Gemini) + optional domain research |
| **Based on Real Data** | Curated by GoTofu or researched via Tavily | Tavily API → RAG → LLM synthesizes personas |
| **Based on Your Data** | User uploads own data (surveys, transcripts) | File processing → data extraction → LLM enriches → personas |

---

## Persona Generation Framework

### Architecture Principles (based on competitor research)
- **Diversity by Design**: Every batch must produce diverse personas (not cookie-cutter)
- **Domain Grounding via RAG**: Every persona based on real domain knowledge
- **Big Five as Behavioral Anchor**: Personality profile drives interview behavior
- **Quality Scoring**: Every persona gets a score (0-1) based on consistency, specificity, distinctiveness, domain grounding
- **Bias Transparency**: System measures and reports representational bias

### Prompt Architecture (5 Layers)
1. **System Context** — Define role ("demographic simulation engine")
2. **Domain Knowledge (RAG)** — Top-k chunks from `DomainKnowledge` table
3. **Group Constraints** — Demographic distribution, location, characteristics
4. **Differentiation Directive** — "Generate a persona that differs from [existing ones]"
5. **Output Schema** — Zod Schema → type-safe JSON (via `generateObject`)

### Big Five Integration in Sessions
Personality actively drives response behavior:
- High Openness → more creative, abstract answers
- High Conscientiousness → structured, detailed answers
- High Extraversion → longer answers, anecdotes
- High Agreeableness → more positive ratings (sycophancy risk — mitigated via prompt)
- High Neuroticism → more emotional answers, shares fears/frustrations

### Bias Detection System
- **Demographic Distribution** — Comparison with known population statistics
- **Filter Bias** — Warning when filters exclude too much
- **Response Bias** — Detects unrealistic Big Five distributions
- **Representational Gaps** — Identifies underrepresented subgroups

---

## Persona Generation: Technical Pipeline (Detail)

### Pipeline 1: Survey Data → Personas

```
CSV/Excel Upload
     ↓
[1] Schema Parsing — Detect question types (Likert, Multiple Choice, Open-Ended)
     ↓
[2] LLM-Based Clustering — Send survey data in chunks to LLM,
     │  identify archetype clusters (typically 5-12 clusters)
     ↓
[3] Cluster Summary — Per cluster: representative quotes, median scores, pain points
     ↓
[4] LLM Synthesis (via generateObject + Zod Schema):
     │  Prompt 1: Attribute Extraction (Demographics, Goals, Pain Points)
     │  Prompt 2: Big Five Personality Profiling
     │  Prompt 3: Narrative Synthesis (coherent persona story)
     ↓
[5] Quality Check — Completeness, Zod Validation, Consistency (LLM-Judge)
     ↓
[6] Deduplication — Embedding Cosine Similarity via pgvector
     ↓
[7] Distribution Validation — Check demographic distribution
```

### Pipeline 2: Interview Transcripts → Personas

```
Text/PDF Upload
     ↓
[1] Text Extraction — PDF parser / read plain text
     ↓
[2] LLM-Based Analysis:
     │  a) Speaker/Voice Segmentation
     │  b) Theme Extraction — Topics, Pain Points, Goals
     │  c) Sentiment Analysis
     ↓
[3] Persona Synthesis (3-Turn):
     │  Turn 1: Extract characteristics (with quotes)
     │  Turn 2: Construct narrative
     │  Turn 3: Validate against source
     ↓
[4] Quality Validation — Citation Coverage, Zero Contradictions (LLM-Judge)
```

### Pipeline 3: Web Research → Personas (Tavily)

```
Domain description (e.g., "midwives in Germany")
     ↓
[1] Tavily API → Web search + content extraction
     ↓
[2] Domain Knowledge Assembly → DomainKnowledge table + embeddings
     ↓
[3] RAG — Top-k chunks as context
     ↓
[4] LLM Synthesis with domain grounding (5-layer prompts)
     ↓
[5] Quality + Diversity Checks
```

### Batch Processing & Cost Optimization

| Strategy | Savings | Details |
|-----------|-----------|---------|
| **Batch API** | 50% | Async processing, ~30-60min for 10k |
| **Prompt Caching** | 90% on cached content | Cache system prompt once |
| **Structured Output** | No retries | Zod Schema = guaranteed valid JSON |
| **Inngest Concurrency** | Controlled | Rate limiting per provider built-in |

**Cost estimate (10,000 Personas):**
- Batch + cache optimized: **~$60-70** (Claude Sonnet) or **~$50** (GPT-4o-mini)
- Per persona: ~$0.006-0.007

### Quality Assurance at Scale

1. **Completeness** — Zod Schema Validation (TypeScript-native)
2. **Consistency** — LLM-Judge checks Big Five vs. Narrative
3. **Diversity** — Embedding Cosine Distance via pgvector (min ≥ 0.35)
4. **Data Grounding** — LLM-Judge checks source data reference
5. **Deduplication** — String hash (exact) + pgvector cosine (semantic > 0.92)
6. **Distribution** — Check demographic distribution statistically

---

## Study/Session Flow (User Journey)

### Terminology
- **Study** = Research project (e.g., "Midwife needs Q1 2026")
- **Session** = Individual run with one persona
- **Study Types**: Interview, Survey, Focus Group, Usability Test, Card Sort

### Flow
```
1. Create study → Choose type → Title, description, research objectives
     ↓
2. Configure interview guide / survey questions
     ↓
3. Assign persona group(s) → Sample size → Optional filtering
     ↓
4. Bias check review (warnings if filters are biased)
     ↓
5. Start study → Inngest dispatches background jobs
     ↓
6. Live progress via SSE ("42/80 sessions completed")
     ↓
7. Review sessions → Transcripts → Follow-up questions
     ↓
8. Analysis dashboard → Themes, sentiment, demographics
     ↓
9. Export (PDF/CSV)
```

### Follow-up Feature
- Ask individual personas again after the session
- Session history is carried forward (persona "remembers")
- Group follow-ups also possible

---

## Dashboard & Navigation (Apple-like Design)

### Sidebar Navigation
```
┌─────────────────────────┐
│  Dashboard              │
│  Personas               │
│     └ Groups            │
│  Studies                │
│  Analysis               │
│  Uploads                │
│  Settings               │
│                         │
│  ─── Workspace ───────  │
│  [Org Switcher]         │
│  Personal / Org Name    │
└─────────────────────────┘
```

### Design Principles
- **Restraint & Clarity**: No unnecessary decorations
- **Whitespace**: Apple-typical generous white space
- **Progressive Disclosure**: Summaries first, details on demand
- **Bento-Grid Layout**: Modular info blocks on the dashboard
- **Virtual Scrolling**: TanStack Virtual for 10k+ lists

---

## Key Packages

| Package | Purpose |
|---------|-------|
| `next` 15.x | Framework |
| `@supabase/supabase-js` + `@supabase/ssr` | Auth + Storage + Realtime |
| `@prisma/client` + `prisma` | ORM + Migrations (uses Supabase PostgreSQL) |
| `ai` + `@ai-sdk/openai` + `@ai-sdk/anthropic` + `@ai-sdk/google` | LLM Integration |
| `inngest` | Background Jobs + Event System |
| `tailwindcss` | Styling |
| `shadcn/ui` (via CLI) | UI Components |
| `zod` | Schema Validation (Frontend + Backend) |
| `@tanstack/react-query` | Client-side Data Fetching |
| `@tanstack/react-virtual` | Virtual Scrolling for large lists |
| `papaparse` | CSV Parsing |
| `pdf-parse` | PDF Text Extraction |
| `recharts` or `@nivo/core` | Charts for Analysis |
| `vitest` | Unit Tests |
| `playwright` | E2E Tests |

---

## Background Jobs (Inngest)

```typescript
// lib/inngest/functions/generate-persona-batch.ts
export const generatePersonaBatch = inngest.createFunction(
  {
    id: 'generate-persona-batch',
    concurrency: { limit: 5 },        // Max 5 parallel LLM calls
    retries: 3,
  },
  { event: 'persona/batch.requested' },
  async ({ event, step }) => {
    const { groupId, count, config } = event.data;

    // Step 1: Load domain knowledge
    const context = await step.run('load-context', async () => {
      return prisma.domainKnowledge.findMany({
        where: { personaGroupId: groupId },
      });
    });

    // Step 2: Generate personas (fan-out)
    const personas = [];
    for (let i = 0; i < count; i++) {
      const persona = await step.run(`generate-${i}`, async () => {
        return generateObject({
          model: getModel(),
          schema: personaSchema,
          prompt: buildPersonaPrompt(config, context, i),
        });
      });
      personas.push(persona);
    }

    // Step 3: Quality check + save
    await step.run('save-personas', async () => {
      await prisma.persona.createMany({ data: personas });
    });

    return { generated: personas.length };
  }
);
```

---

## Phased Implementation

### Phase 1: Foundation (Weeks 1-3)
**Goal**: Auth, org management, DB structure, deployable skeleton

1. Initialize Next.js 15 project (App Router, TypeScript)
2. Create Supabase project + enable pgvector extension
3. Supabase Auth setup (Email + OAuth, Middleware for session refresh)
4. Create Prisma schema + migration against Supabase PostgreSQL
5. Build org management (Organization, Members, Invitations + RLS Policies)
6. shadcn/ui + Tailwind CSS setup
7. Dashboard layout (Sidebar, TopBar, OrgSwitcher)
8. Dashboard page (Empty state with onboarding)
9. Inngest setup (Background job infrastructure)
10. `.env.example` with all keys
11. Vercel deployment pipeline

**Deliverable**: Users can register, create orgs, invite members, switch workspaces.

### Phase 2: Persona Engine (Weeks 4-7)
**Goal**: Persona generation, browsing, filtering, pre-built groups

1. Vercel AI SDK setup + Provider config (OpenAI as default)
2. Tavily client for web research
3. Prompt templates + generation pipeline
4. Inngest Functions (generate-persona-batch, generate-single-persona)
5. PersonaGroup + Persona CRUD (Server Actions + Pages)
6. Persona browsing UI (Grid, Table, Detail Panel)
7. Filter system (Zod-based filter schemas + URL state)
8. BiasDetector + BiasIndicator component
9. Big Five profile generation + PersonalityRadar chart
10. GenerationWizard (Multi-step form)
11. **Seed 3 pre-built groups**: Midwives, foreigners, period planning (50-100 personas each)
12. Tagging system
13. Embedding generation + pgvector similarity search

**Deliverable**: Users can generate, browse, filter, manage personas.

### Phase 3: Upload & Data Processing (Weeks 8-9)
**Goal**: Users can upload own data → generate personas

1. File upload UI (Drag & Drop + Progress)
2. Supabase Storage upload with RLS-secured buckets
3. File processors (CSV, Excel, PDF, Transcript)
4. Column mapping UI for tabular data
5. Inngest Functions (process-upload, extract-personas-from-upload)
6. Upload Manager page with status tracking

**Deliverable**: Users can upload own data and generate personas from it.

### Phase 4: Study & Session System (Weeks 10-13)
**Goal**: Create studies, run sessions

1. Study creation wizard (multi-step)
2. Interview guide builder + survey question builder
3. Persona group assignment with sample size + filtering
4. Inngest Functions (run-interview-session, run-survey-session)
5. Multi-turn conversation pipeline (streamText for realtime)
6. Supabase Realtime for progress feed (Broadcast Channel)
7. SessionViewer (Transcript component)
8. Follow-up session functionality
9. Token usage + cost tracking

**Deliverable**: Complete study lifecycle.

### Phase 5: Analysis & Reporting (Weeks 14-16)
**Goal**: Aggregated analysis, export

1. Inngest Function (aggregate-study-results)
2. LLM-based theme extraction + sentiment analysis
3. Results dashboard with charts (Recharts/Nivo)
4. Demographic breakdown
5. PDF + CSV export
6. Analysis Hub page

**Deliverable**: Visual analysis with export.

### Phase 6: Polish & Scale (Weeks 17-20)
**Goal**: Production readiness

1. Performance optimization (React Virtual, Query Caching)
2. Usage metering + billing (Stripe)
3. Onboarding flow
4. Notifications (Email via Resend)
5. Error monitoring (Sentry)
6. Security audit
7. Production hardening

---

## Multi-Engineer Collaboration & Version Control

### Git Workflow
- **Trunk-based** with `main` + feature branches (`feature/persona-generation`)
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- **PR Reviews** required before merge
- **CI**: Vercel Preview Deployments + tests on every push

### Code Organization for Teams
- **Feature-based structure**: One engineer works on `personas/`, another on `studies/`
- **Shared lib/**: AI, DB, Utils are shared — but stable and interface-based
- **Zod Schemas**: Clear data contracts between frontend and backend

### Swappable Architecture
| Component | Current | Swappable for |
|------------|---------|-------------------|
| LLM | OpenAI GPT-4o | Claude, Gemini, Llama — change 1 import |
| Backend | Supabase (DB+Auth+Storage+RT) | Self-hosted Supabase, or individual services separately |
| Auth | Supabase Auth | Clerk, NextAuth.js, Auth0 |
| Database | Supabase PostgreSQL + Prisma | Neon, Railway, self-hosted PG |
| Queue | Inngest | BullMQ, Trigger.dev, QStash |
| Storage | Supabase Storage | S3, GCS, Vercel Blob |
| Realtime | Supabase Realtime | Pusher, Ably, SSE |
| Search | PostgreSQL tsvector | Meilisearch, Elasticsearch |
| Research | Tavily | Serper, SerpAPI |
| Deploy | Vercel | AWS, Railway, Fly.io |

---

## Competitor Insights (Research Summary)

### Direct Competitors
- **Synthetic Users** (syntheticusers.com) — Multi-agent architecture, Big Five Personality Modeling
- **Delve AI** — AI market research with persona generation
- **Uxia** — Design feedback without recruiting

### Key Learnings
- **Persona Hub** (Tencent): 1 billion personas from web data, text-to-persona approach
- **PolyPersona**: Persona-conditioned survey responses
- **PersonaFuse**: Dynamic persona calibration
- **Nielsen Norman Group**: Synthetic users only for hypothesis generation, not as replacement

### Quality Risks + Mitigation
- LLM Sycophancy → Big Five Personality Prompting mitigates
- Representational Bias → Active bias detection + distribution validation
- Shallow Insights → Domain grounding via RAG + real data

---

## Verification & Testing

### End-to-End Test Scenario
1. Register → Create org → Invite teammate
2. Create persona group → "Prompt Generated" → Generate 10 midwife personas
3. Open pre-built group → Set filters → Check bias check
4. Create study → Interview → 5 questions → Assign group → Start
5. Follow progress → Review sessions → Follow-up
6. Analysis → Themes, sentiment → PDF Export

### Technical Tests
- `vitest` — Unit tests for AI pipeline, prompt builder, quality checker
- `playwright` — E2E tests for user flows
- Inngest Dev Server — Test background jobs locally
- Mock AI Responses — Deterministic tests without API costs

### Dev Commands
```bash
npm install
cp .env.example .env.local      # Fill in Supabase URL + Keys
npx supabase start              # Local Supabase instance (optional)
npx prisma migrate dev          # DB migrations
npx prisma db seed              # Seed pre-built groups
npx inngest-cli dev             # Background job dev server
npm run dev                     # Next.js dev server
npm run test                    # Vitest
npx playwright test             # E2E tests
```

---

## What I Focus On When Building (Best Practices)

- **Clean Architecture**: lib/ for business logic, app/ for routing, components/ for UI
- **Type Safety End-to-End**: Zod schemas validate input, Prisma generates types, TypeScript everywhere
- **Interface-First**: Vercel AI SDK = provider-agnostic, Prisma = DB-agnostic
- **Security**: Supabase Auth + RLS for data isolation, Server Actions validate with Zod, no client-side secrets
- **Performance**: React Virtual, TanStack Query caching, Prisma connection pooling
- **Testability**: Inngest functions are unit-testable, AI calls mockable
- **Accessibility**: shadcn/ui based on base-ui — ARIA-compliant
- **Cost Control**: Token tracking per request, rate limiting per org
- **Bias Awareness**: Active bias detection in persona generation and filtering
- **Multi-Engineer Ready**: Feature-based folder structure, Zod contracts, conventional commits
- **No Vendor Lock-in**: LLM, Auth, DB, Queue, Storage — all swappable
