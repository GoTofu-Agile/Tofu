# GoTofu — Engineering Vision & Architecture

> Internal document for the engineering team.
> Last updated: 2026-03-16

---

## Table of Contents

1. [Repository Structure & Setup](#1-repository-structure--setup)
2. [Landing Page & Deployment Architecture](#2-landing-page--deployment-architecture)
3. [Synthetic User Groups](#3-synthetic-user-groups)
4. [Study-First Interview Workflow](#4-study-first-interview-workflow)

---

## 1. Repository Structure & Setup

### GitHub

**Repository:** [github.com/habibidani/gotofu](https://github.com/habibidani/gotofu) (private)

```bash
git clone git@github.com:habibidani/gotofu.git
cd gotofu
npm install
```

### Environment Setup

Copy `.env.example` to both `.env` and `.env.local` (both needed — `.env.local` for Next.js runtime, `.env` for Prisma CLI):

```
DATABASE_URL=...                        # PostgreSQL connection string (Supabase)
NEXT_PUBLIC_SUPABASE_URL=...            # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...       # Supabase public anon key
SUPABASE_SERVICE_ROLE_KEY=...           # Supabase service role key (server-only)
LLM_PROVIDER=openai                     # "openai" | "anthropic" | "google"
OPENAI_API_KEY=...                      # Or ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY
TAVILY_API_KEY=...                      # Optional — without it, personas are prompt-only (no web research)
GOTOFU_ADMIN_EMAILS=email1@...,email2@... # Comma-separated, no spaces
NEXT_PUBLIC_APP_URL=http://localhost:3004
```

### Running Locally

```bash
npm run dev              # Starts on port 3004
npx prisma db push       # Push schema to Supabase (reads .env)
npx prisma generate      # Regenerate Prisma client
npx next build           # Verify production build
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Database | PostgreSQL (Supabase) + Prisma v5.22.0 |
| Auth | Supabase Auth (OAuth + Email/Password) |
| LLM | Vercel AI SDK v6 — LLM-agnostic (OpenAI, Claude, Gemini via env var) |
| Web Research | Tavily SDK (Reddit, forums, app stores, reviews) |
| Background Jobs | Inngest v3.52.6 |
| UI Components | shadcn/ui v4 (**base-ui, NOT Radix** — no `asChild` prop) |
| Styling | Tailwind CSS v4 (OKLch color space) |
| Icons | Lucide React |
| Validation | Zod v4 (`issues` not `errors`) |
| HTTP Client | React Query v5 |
| Toasts | Sonner v2 |
| Fonts | Geist + Geist Mono (via next/font) |

### Gotchas

- **shadcn/ui v4**: base-ui, NOT Radix — `asChild` prop does not exist
- **Prisma v5**: Stay on v5.22.0 — v6+ requires Node 20.19+, we're on 20.11.1
- **Zod v4**: Use `error.issues` not `error.errors`
- **Next.js 16**: `middleware.ts` shows deprecation warning but still works
- **Port 3004**: Configured in `package.json`, not the default 3000
- **`.env` vs `.env.local`**: Both need `DATABASE_URL` — Prisma reads `.env`, Next.js reads `.env.local`
- **pdf-parse**: Must use `require()` not ESM `import` — causes `Property 'default'` error otherwise
- **Supabase Email Confirmation**: Disabled (Authentication → Email → Confirm email → OFF) — needed for invite flow

### Directory Structure

```
/
├── prisma/
│   └── schema.prisma                    ← Database schema (20+ models)
│
├── public/                              ← Static assets (SVGs, favicon)
│
├── src/
│   ├── app/                             ← Next.js App Router
│   │   │
│   │   ├── page.tsx                     ← Landing page orchestrator
│   │   ├── globals.css                  ← Theme variables + Tailwind config
│   │   ├── layout.tsx                   ← Root layout (fonts, metadata)
│   │   ├── favicon.ico
│   │   │
│   │   ├── (auth)/                      ← Auth route group (public)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── callback/route.ts        ← OAuth callback handler
│   │   │   ├── accept-invite/[token]/   ← Invite link acceptance
│   │   │   ├── actions.ts              ← login(), signup(), signOut(), signInWithOAuth()
│   │   │   └── layout.tsx              ← Centered card layout
│   │   │
│   │   ├── (dashboard)/                 ← Protected route group (auth required)
│   │   │   ├── dashboard/page.tsx       ← Overview stats + onboarding checklist
│   │   │   ├── personas/
│   │   │   │   ├── page.tsx             ← Persona groups grid
│   │   │   │   ├── new/page.tsx         ← Multi-method creation entry point
│   │   │   │   ├── [groupId]/page.tsx   ← Group detail + persona cards
│   │   │   │   ├── [groupId]/[personaId]/page.tsx  ← Full persona profile
│   │   │   │   └── actions.ts           ← createGroup, deleteGroup
│   │   │   ├── studies/
│   │   │   │   ├── page.tsx             ← Studies listing
│   │   │   │   ├── new/page.tsx         ← Study creation
│   │   │   │   ├── [studyId]/page.tsx   ← Study detail + sessions
│   │   │   │   ├── [studyId]/[sessionId]/page.tsx  ← Interview transcript
│   │   │   │   ├── [studyId]/compare/page.tsx      ← Cross-session comparison
│   │   │   │   └── actions.ts           ← createStudy, startSession, endSession, runBatch
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx             ← Workspace settings + AI product context chat
│   │   │   │   └── members/page.tsx     ← Member management, invites, roles
│   │   │   ├── admin/page.tsx           ← GoTofu admin panel (gated via GOTOFU_ADMIN_EMAILS)
│   │   │   ├── uploads/page.tsx         ← Upload manager (placeholder)
│   │   │   └── layout.tsx               ← Dashboard layout (sidebar + topbar)
│   │   │
│   │   └── api/                         ← API routes
│   │       ├── chat/route.ts            ← Multi-turn interview streaming
│   │       ├── org/setup/route.ts       ← AI org setup (freetext → structured fields)
│   │       ├── personas/
│   │       │   ├── generate/route.ts    ← Streaming persona generation (NDJSON)
│   │       │   ├── extract/route.ts     ← Freetext → structured context
│   │       │   ├── extract-pdf/route.ts ← LinkedIn PDF → structured context
│   │       │   └── extract-url/route.ts ← Company URL (Tavily scrape) → context
│   │       ├── research/
│   │       │   ├── route.ts             ← Tavily web research (streaming NDJSON)
│   │       │   └── quick/route.ts       ← Quick auto-research (1-2 queries)
│   │       ├── studies/
│   │       │   ├── setup/route.ts       ← AI study quick-setup (title + guide + groups)
│   │       │   ├── generate-guide/route.ts  ← Interview guide generation
│   │       │   └── [studyId]/
│   │       │       ├── run-batch/route.ts   ← Batch interview trigger
│   │       │       ├── status/route.ts      ← Live batch status polling
│   │       │       └── export/route.ts      ← CSV transcript export
│   │       ├── accept-invite/route.ts   ← Invite token acceptance
│   │       ├── uploads/route.ts         ← File upload handling
│   │       └── inngest/route.ts         ← Inngest webhook endpoint
│   │
│   ├── components/
│   │   ├── landing/                     ← Landing page sections (see Section 2)
│   │   │   ├── navbar.tsx
│   │   │   ├── hero.tsx
│   │   │   ├── how-it-works.tsx
│   │   │   ├── features.tsx
│   │   │   ├── roadmap.tsx
│   │   │   ├── cta-section.tsx
│   │   │   └── footer.tsx
│   │   ├── personas/
│   │   │   ├── persona-card.tsx         ← Persona display card
│   │   │   └── creation/               ← Multi-step persona creation wizard
│   │   │       ├── unified-creation-flow.tsx  ← Wizard orchestrator
│   │   │       ├── step-method-picker.tsx     ← 6-method selection grid
│   │   │       ├── step-describe.tsx          ← Freetext description
│   │   │       ├── step-review.tsx            ← Review extracted context
│   │   │       ├── step-sources.tsx           ← Data sources + persona count
│   │   │       ├── step-progress.tsx          ← Real-time generation progress
│   │   │       ├── step-url.tsx               ← Company URL input
│   │   │       └── generate-personas-button.tsx
│   │   ├── studies/
│   │   │   ├── create-study-form.tsx    ← Multi-mode creation (Quick Start + Manual)
│   │   │   ├── interview-chat.tsx       ← Chat UI (useChat + streaming)
│   │   │   ├── study-session-list.tsx   ← Session grid
│   │   │   ├── study-persona-list.tsx   ← Assigned personas
│   │   │   ├── batch-run-button.tsx     ← Batch execution + progress polling
│   │   │   └── insights-panel.tsx       ← Auto-generated insights display
│   │   ├── org/
│   │   │   └── org-setup-chat.tsx       ← AI product context setup chat
│   │   ├── layout/
│   │   │   ├── sidebar.tsx              ← Main navigation + active workspace
│   │   │   ├── topbar.tsx               ← Header bar
│   │   │   └── org-switcher.tsx         ← Workspace switcher dropdown
│   │   ├── ui/                          ← shadcn/ui base components
│   │   │   ├── button.tsx, card.tsx, dialog.tsx, input.tsx, select.tsx
│   │   │   ├── table.tsx, tabs.tsx, textarea.tsx, badge.tsx
│   │   │   ├── dropdown-menu.tsx, sheet.tsx, skeleton.tsx
│   │   │   ├── avatar.tsx, label.tsx, progress.tsx, separator.tsx
│   │   │   ├── sonner.tsx, tooltip.tsx
│   │   │   └── ...
│   │   └── analysis/                    ← Analysis components (placeholder)
│   │
│   ├── lib/                             ← Business logic & utilities
│   │   ├── ai/
│   │   │   ├── provider.ts             ← getModel() — LLM provider switch
│   │   │   ├── generate-personas.ts    ← Core generation (RAG, anti-sycophancy, streaming)
│   │   │   └── prompts/                ← System prompt templates
│   │   ├── db/
│   │   │   ├── prisma.ts              ← Prisma client singleton
│   │   │   └── queries/
│   │   │       ├── users.ts           ← User CRUD
│   │   │       ├── organizations.ts   ← Org management + getOrgProductContext()
│   │   │       ├── personas.ts        ← PersonaGroup + Persona CRUD
│   │   │       └── studies.ts         ← Study + Session queries
│   │   ├── inngest/
│   │   │   ├── client.ts             ← Inngest client config
│   │   │   └── functions/
│   │   │       ├── run-batch-interview.ts  ← Batch interview executor
│   │   │       └── generate-insights.ts    ← Auto-insights from transcripts
│   │   ├── supabase/
│   │   │   ├── client.ts             ← Client-side Supabase
│   │   │   ├── server.ts             ← Server-side Supabase
│   │   │   └── middleware.ts          ← Auth middleware (session refresh + redirect)
│   │   ├── research/
│   │   │   ├── tavily.ts             ← Tavily client + source detection
│   │   │   └── build-queries.ts      ← Product info → Tavily search queries
│   │   ├── validation/
│   │   │   └── schemas.ts            ← Zod schemas (50+ validators)
│   │   ├── constants/
│   │   │   └── source-labels.ts      ← Source type badge config
│   │   ├── uploads/                   ← File upload handling
│   │   ├── auth.ts                    ← requireAuth(), requireAuthWithOrgs(), getActiveOrgId()
│   │   └── utils.ts                   ← cn() helper (clsx + tailwind-merge)
│   │
│   ├── types/                          ← TypeScript type definitions
│   ├── hooks/                          ← Custom React hooks
│   └── middleware.ts                   ← Root middleware (auth check + public route whitelist)
│
├── docs/
│   └── ENGINEERING-VISION.md           ← This document
│
├── next.config.ts                      ← Next.js configuration
├── tsconfig.json                       ← TypeScript config
├── package.json                        ← Dependencies + scripts (port 3004)
├── postcss.config.mjs                  ← PostCSS (Tailwind)
├── eslint.config.mjs                   ← ESLint config
├── components.json                     ← shadcn/ui config
├── CLAUDE.md                           ← Instructions for Claude Code agents
└── PLAN.md                             ← Implementation plan
```

### Where to Find Things (Quick Reference)

| I need to... | Look here |
|--------------|-----------|
| Change the database schema | `prisma/schema.prisma` |
| Add a new page | `src/app/(dashboard)/[new-route]/page.tsx` |
| Add a new API endpoint | `src/app/api/[new-route]/route.ts` |
| Add a UI component | `npx shadcn@latest add [component]` → `src/components/ui/` |
| Change LLM provider logic | `src/lib/ai/provider.ts` |
| Modify persona generation | `src/lib/ai/generate-personas.ts` |
| Edit system prompts | `src/lib/ai/prompts/` |
| Write a database query | `src/lib/db/queries/` |
| Add a background job | `src/lib/inngest/functions/` |
| Change auth behavior | `src/lib/supabase/middleware.ts` + `src/lib/auth.ts` |
| Add validation | `src/lib/validation/schemas.ts` |
| Change the landing page | `src/components/landing/` |
| Edit global styles/theme | `src/app/globals.css` |

---

## 2. Landing Page & Deployment Architecture

### Landing Page Location

The public-facing landing page lives in the main repo:

```
src/
├── app/
│   └── page.tsx                          ← Orchestrator (imports all sections)
│
├── components/
│   └── landing/
│       ├── navbar.tsx                    ← Sticky nav (logo, links, Sign in/Get started)
│       ├── hero.tsx                      ← Hero section (headline, subtitle, product mockup)
│       ├── how-it-works.tsx              ← 3-step flow (Define → Generate → Run)
│       ├── features.tsx                  ← 6 feature cards grid
│       ├── roadmap.tsx                   ← Upcoming features with status badges
│       ├── cta-section.tsx               ← Final call-to-action
│       └── footer.tsx                    ← Footer with copyright
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PLAN                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  gotofu.io                    app.gotofu.io                 │
│  ──────────                   ─────────────                 │
│  Public landing page          Dashboard / App               │
│                                                             │
│  • Marketing website          • Auth (login/signup)         │
│  • Product info               • Dashboard                   │
│  • How it works               • Persona creation            │
│  • Features                   • Studies & interviews        │
│  • Roadmap                    • Settings                    │
│  • Pricing (future)           • Admin panel                 │
│                                                             │
│  Routes:                      Routes:                       │
│  /              (landing)     /login, /signup                │
│  /#how-it-works               /callback                     │
│  /#features                   /dashboard                    │
│  /#roadmap                    /personas/**                   │
│                               /studies/**                    │
│                               /settings/**                  │
│                               /admin                        │
│                               /uploads                      │
│                                                             │
│  CTAs link to:                                              │
│  "Get started" → app.gotofu.io/signup                      │
│  "Sign in"     → app.gotofu.io/login                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CURRENT STATE:                                             │
│  Everything runs on localhost:3004 as one Next.js app.      │
│  The landing page (/) and the dashboard (/dashboard) are    │
│  in the same repo and deployment.                           │
│                                                             │
│  PRODUCTION GOAL:                                           │
│  Split into two domains:                                    │
│  • gotofu.io serves the landing page (public, no auth)      │
│  • app.gotofu.io serves the dashboard (auth required)       │
│                                                             │
│  OPTIONS:                                                   │
│  A) Same Next.js app, domain routing via Vercel/middleware   │
│  B) Separate deployments (landing = static, app = dynamic)  │
│                                                             │
│  Recommendation: Option A for now (simpler), Option B       │
│  when landing page needs its own deploy cycle or CMS.       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Landing Page Nav Links

| Link | Target | Type |
|------|--------|------|
| "How it works" | `#how-it-works` | Anchor scroll |
| "Features" | `#features` | Anchor scroll |
| "Roadmap" | `#roadmap` | Anchor scroll |
| "Sign in" | `/login` (→ `app.gotofu.io/login` in prod) | Page navigation |
| "Get started" | `/signup` (→ `app.gotofu.io/signup` in prod) | Page navigation |

### Key Styling Details

- **Framework**: Tailwind CSS v4 (OKLch color space)
- **Components**: shadcn/ui v4 (base-ui, NOT Radix)
- **Font**: Geist + Geist Mono (Google Fonts via next/font)
- **Dark mode**: Supported via `.dark` class
- **Responsive**: Mobile-first, breakpoints at sm/md/lg

---

## 3. Synthetic User Groups

### Problem

Most synthetic user tools generate **one AI persona at a time**. This is fundamentally wrong for user research. You never interview one person and call it research. You need a **diverse panel** that surfaces patterns, contradictions, and edge cases.

### Our Approach

GoTofu creates **groups** of synthetic users (we call them PersonaGroups). A group represents a market segment or target audience — a panel of personas (minimum 3, no upper limit) with shared domain context but diverse individual profiles.

### Why This Matters

| Single Persona | Persona Group |
|---------------|---------------|
| One perspective | Diverse panel (age, gender, attitude) |
| Echo chamber risk | Anti-sycophancy enforced (~30% skeptics) |
| No pattern detection | Cross-persona insight extraction |
| One-off use | Reusable across multiple studies |
| No provenance | Full data source tracking |

### Data Model

```
PersonaGroup
├── id                  (cuid)
├── organizationId      (tenant isolation)
├── name                ("Early adopters for fitness app")
├── description
├── domainContext        (shared context for all personas in group)
├── sourceType           (PROMPT_GENERATED | DATA_BASED | UPLOAD_BASED)
├── personaCount         (denormalized count, minimum 3)
├── generationConfig     (JSON — creation parameters)
├── isPrebuilt           (template flag, for future marketplace)
│
└── personas[]           (1:N relationship)
    ├── id
    ├── Demographics
    │   ├── name, age, gender, location
    │   ├── occupation, incomeLevel, educationLevel
    │   └── techLiteracy, domainExpertise
    ├── Personality (separate PersonalityProfile model)
    │   ├── Big Five scores (openness, conscientiousness, extraversion,
    │   │                    agreeableness, neuroticism) — each 0.0-1.0
    │   ├── communicationStyle (e.g. "direct and analytical")
    │   ├── responseLength ("concise" | "moderate" | "verbose")
    │   └── vocabularyLevel ("simple" | "moderate" | "technical")
    ├── Narrative
    │   ├── bio, backstory
    │   ├── dayInLife
    │   ├── representativeQuote
    │   └── archetype (e.g. "The Skeptical Power User")
    ├── Research Context
    │   ├── goals[], frustrations[], behaviors[]
    │   ├── coreValues[]
    │   └── communicationSamples (JSON)
    ├── llmSystemPrompt   (auto-generated — drives interview behavior)
    ├── qualityScore       (float, 0-1 — 16-attribute weighted check)
    └── isActive           (soft delete flag)
```

### Provenance Chain

```
Tavily Web Research
    ↓
DomainKnowledge (source URL, domain, publication date, content)
    ↓ (attached to PersonaGroup)
PersonaDataSource (junction: Persona ↔ DomainKnowledge)
    ↓
Persona (informed by specific sources)
```

Every persona can be traced back to the exact Reddit threads, forum posts, or app reviews that informed its creation.

### 6 Creation Methods

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERSONA CREATION METHODS                     │
├──────────────┬──────────────────┬──────────────┬───────────────┤
│ Method       │ Input            │ Source Type  │ Data Source   │
├──────────────┼──────────────────┼──────────────┼───────────────┤
│ AI Generate  │ Freetext prompt  │ PROMPT_GEN.  │ AI only       │
│ Deep Search  │ Prompt + Tavily  │ DATA_BASED   │ Reddit/forums │
│ LinkedIn PDF │ PDF upload       │ UPLOAD_BASED │ Own data      │
│ Company URL  │ URL → scrape     │ UPLOAD_BASED │ Own data      │
│ Manual       │ Form fields      │ UPLOAD_BASED │ Own data      │
│ Templates    │ Pre-built panels │ —            │ Coming soon   │
└──────────────┴──────────────────┴──────────────┴───────────────┘
```

### Generation Flow (Sequential)

```
For each persona i = 0 to count-1:

  ┌─────────────────────────────────┐
  │ Build prompt with:              │
  │ • Domain context (group-level)  │
  │ • RAG data (DomainKnowledge)    │
  │ • Diversity constraints         │
  │ • Anti-sycophancy rules:        │
  │   - ~30% skeptics               │
  │   - ~30% balanced               │
  │   - ~40% agreeable              │
  │ • Previous personas (diff check)│
  └──────────┬──────────────────────┘
             ↓
  ┌─────────────────────────────────┐
  │ LLM generateObject()           │
  │ → Full persona with 60+ fields │
  └──────────┬──────────────────────┘
             ↓
  ┌─────────────────────────────────┐
  │ Quality scoring (16 checks)    │
  │ Build llmSystemPrompt          │
  │ Create PersonalityProfile      │
  │ Link to DomainKnowledge sources│
  │ Save to database               │
  └──────────┬──────────────────────┘
             ↓
  ┌─────────────────────────────────┐
  │ Add to previousPersonas[]      │
  │ → Next persona sees all prior  │
  │   to ensure differentiation    │
  └─────────────────────────────────┘
```

Key: **Generation is sequential, not parallel.** Each persona is aware of all previously generated personas to maximize diversity.

### Source Labels (UI)

Persona groups display a badge indicating data quality:

| Badge | Source Type | Color |
|-------|-----------|-------|
| "Prompted" | PROMPT_GENERATED | Gray |
| "Data Backed" | DATA_BASED | Green |
| "Own Data" | UPLOAD_BASED | Blue |

---

## 4. Study-First Interview Workflow

### Problem

Without structure, AI interviews are just chatbot conversations. You need a research framework: a question, a method, and a way to compare results across personas.

### Our Approach

GoTofu uses a **study-first** workflow: define what you want to learn → assign your persona panel → run interviews (manual or batch) → extract insights automatically.

### Why Study-First?

1. **Structure drives quality.** The study defines the research question. The AI generates an interview guide (6-10 questions) that structures every conversation.
2. **Comparability.** All personas in a study answer the same core questions, making cross-persona analysis meaningful.
3. **Batch capability.** You can't automate hundreds of interviews without a shared framework.
4. **Insight extraction.** The auto-insights system analyzes all transcripts through the lens of the study's research goal.

### Data Model

```
Study
├── id, organizationId
├── title               ("Understanding onboarding friction")
├── description
├── type                 (INTERVIEW | SURVEY | FOCUS_GROUP | USABILITY_TEST | CARD_SORT)
├── status               (DRAFT | ACTIVE | COMPLETED | ARCHIVED)
├── interviewGuide       (text — 6-10 structured questions)
├── completedCount       (denormalized — how many sessions done)
│
├── personaGroups[]      (N:M via StudyPersonaGroup)
│   └── StudyPersonaGroup
│       ├── studyId
│       ├── personaGroupId
│       ├── sampleSize      (optional — use N from this group)
│       └── filterCriteria   (optional — JSON filter)
│
├── sessions[]           (1:N — one per persona)
│   └── Session
│       ├── studyId
│       ├── personaId
│       ├── status          (PENDING | RUNNING | COMPLETED | FAILED | FOLLOW_UP)
│       ├── startedAt, completedAt, durationMs
│       └── messages[]
│           └── SessionMessage
│               ├── role     (SYSTEM | INTERVIEWER | RESPONDENT)
│               ├── content
│               └── sequence (ordering)
│
└── reports[]            (1:N)
    └── AnalysisReport
        ├── summary          (2-3 sentence overview)
        ├── themes[]         (name, description, frequency, sentiment)
        ├── keyQuotes[]      (quote, persona, context, theme)
        ├── sentimentBreakdown (positive%, negative%, neutral%)
        └── recommendations[] (text, priority, evidence)
```

### Complete Flow

```
                         STUDY-FIRST WORKFLOW
═══════════════════════════════════════════════════════════════

STEP 1: CREATE STUDY
─────────────────────────────────────────────────────────────
User Input:  "I want to understand why users abandon our
              onboarding flow after step 3"

     ┌──────────────────────────────────────────────┐
     │ POST /api/studies/setup                      │
     │                                              │
     │ Input: user description + org product context│
     │ + available persona groups                   │
     │                                              │
     │ AI generates:                                │
     │ • Study title                                │
     │ • Interview guide (6-10 questions)           │
     │ • Suggested persona group IDs                │
     └──────────────────┬───────────────────────────┘
                        ↓
     ┌──────────────────────────────────────────────┐
     │ User reviews & edits:                        │
     │ • Title                                      │
     │ • Interview guide (can regenerate)            │
     │ • Select persona groups                       │
     │                                              │
     │ → Creates Study (status=DRAFT)               │
     │ → Creates StudyPersonaGroup records           │
     └──────────────────┬───────────────────────────┘
                        ↓
STEP 2: REVIEW PANEL
─────────────────────────────────────────────────────────────
     ┌──────────────────────────────────────────────┐
     │ Study Detail Page                            │
     │                                              │
     │ Shows all personas from assigned groups:     │
     │ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
     │ │ Sarah P.│ │ Mike T. │ │ Aisha K.│ ...     │
     │ │ Skeptic │ │Balanced │ │Agreeable│         │
     │ │ Age 34  │ │ Age 28  │ │ Age 41  │         │
     │ └─────────┘ └─────────┘ └─────────┘        │
     │                                              │
     │ Interview Guide shown in collapsible panel   │
     │ [Run All Interviews] button                  │
     └──────────────────┬───────────────────────────┘
                        ↓
STEP 3: RUN INTERVIEWS
─────────────────────────────────────────────────────────────

  MODE A: MANUAL (1-on-1)              MODE B: BATCH (all at once)
  ─────────────────────────             ───────────────────────────
  Click persona → Chat UI              Click "Run All Interviews"
       ↓                                    ↓
  User types question                  Inngest event: study/run-batch
       ↓                                    ↓
  POST /api/chat                       Inngest function loads study
  (streaming response)                      ↓
       ↓                               For each pending persona:
  Persona responds in-character         ┌────────────────────────┐
  (Big Five, comm style,                │ Create Session         │
   interview modifiers)                 │ Build system prompt    │
       ↓                               │ Loop 5-8 turns:        │
  Messages saved to DB                  │  • Ask guide question  │
  (INTERVIEWER + RESPONDENT)            │  • Generate follow-up  │
       ↓                               │  • Get persona response│
  User ends interview                   │  • Save messages       │
  → Session COMPLETED                   │ Complete session       │
                                        └────────────────────────┘
                                             ↓
                                        Max 3 concurrent interviews
                                        Live polling every 3s:
                                        → progress bar + current name
                                             ↓
                                        All done → auto-trigger
                                        insight generation

STEP 4: EXTRACT INSIGHTS
─────────────────────────────────────────────────────────────
     ┌──────────────────────────────────────────────┐
     │ Inngest: study/generate-insights             │
     │                                              │
     │ Load all completed session transcripts       │
     │ Format as:                                   │
     │   --- Interview with Sarah P. (PM, 34) ---   │
     │   Interviewer: What frustrates you about...  │
     │   Sarah: Honestly, the onboarding is...      │
     │                                              │
     │ LLM analyzes → generateObject():             │
     │ • Summary (2-3 sentences)                    │
     │ • Themes (name, frequency, sentiment)        │
     │ • Key quotes (5-10, with attribution)        │
     │ • Sentiment (positive/negative/neutral %)    │
     │ • Recommendations (priority + evidence)      │
     │                                              │
     │ → Saved as AnalysisReport                    │
     └──────────────────────────────────────────────┘
```

### Interview Guide Generation

The AI generates structured interview guides following these principles:

```
Question Structure:
1. Warm-up question (general, easy to answer)
2-3. General experience questions
4-5. Specific behavior/pain point questions
6-7. Emotional/motivation questions
8-9. Forward-looking questions
10. Wrap-up / anything else

Rules:
• Open-ended only (no yes/no questions)
• Focus on past behavior, not hypothetical futures
• Ask about specific situations ("Tell me about the last time...")
• No leading questions
• No product pitching within questions
```

### Batch Interview: Follow-Up Logic

Batch interviews don't just read questions sequentially. The follow-up system:

```
┌──────────────────────────────────────────────────┐
│ generateFollowUp()                               │
│                                                  │
│ Input:                                           │
│ • Conversation history so far                    │
│ • Remaining guide questions                      │
│ • Full interview guide for context               │
│                                                  │
│ LLM decides:                                     │
│ • Probe deeper on current topic? (follow-up)     │
│ • Move to next guide question?                   │
│ • Ask something contextual?                      │
│                                                  │
│ → Natural conversation flow, not Q&A list        │
└──────────────────────────────────────────────────┘
```

### Study Types

| Type | Status | Description |
|------|--------|-------------|
| `INTERVIEW` | **Implemented** | Multi-turn conversational interviews |
| `SURVEY` | Planned | Structured questionnaires at scale |
| `FOCUS_GROUP` | Planned | Multi-persona group discussions |
| `USABILITY_TEST` | Planned | Personas walk through prototypes |
| `CARD_SORT` | Planned | Information architecture testing |

---

## Mental Model (Summary)

```
┌─────────────────────────────────────────────────────────────┐
│                     GoTofu Architecture                      │
│                                                             │
│  WHO do you want to talk to?                                │
│  └─→ PersonaGroup (diverse panel, 3+ personas)              │
│      └─→ 6 creation methods                                │
│      └─→ Anti-sycophancy (30% skeptics)                    │
│      └─→ Data provenance tracking                          │
│                                                             │
│  WHAT do you want to learn?                                 │
│  └─→ Study (research question + interview guide)            │
│      └─→ AI-generated guide (6-10 questions)               │
│      └─→ 5 study types (Interview implemented)             │
│                                                             │
│  CONNECT them                                               │
│  └─→ StudyPersonaGroup (N:M junction)                       │
│                                                             │
│  RUN it                                                     │
│  └─→ Sessions (1 per persona)                               │
│      └─→ Manual: real-time chat                            │
│      └─→ Batch: Inngest background jobs (max 3 concurrent) │
│                                                             │
│  LEARN from it                                              │
│  └─→ AnalysisReport                                         │
│      └─→ Themes, quotes, sentiment, recommendations        │
│                                                             │
│  WHERE users find us                                        │
│  └─→ gotofu.io (landing page)                              │
│  └─→ app.gotofu.io (dashboard)                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
