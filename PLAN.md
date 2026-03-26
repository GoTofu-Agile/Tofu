# GoTofu — Synthetic User Interview Platform: Implementierungsplan

## Context

GoTofu ist eine SaaS-Plattform für synthetische User-Interviews. Kunden können Organisationen erstellen, synthetische User-Personas generieren (prompt-basiert, auf echten Daten oder eigenen Daten), diese in Gruppen clustern und damit Studies durchführen (Interviews, Surveys, Focus Groups etc.). Drei Startup-Kunden (Hebammen, Ausländer in Deutschland, Perioden-Planning) brauchen vorinstallierte Persona-Gruppen. Die App muss minimalistisch, Apple-like und skalierbar sein (10k+ Personas pro Gruppe).

---

## Tech Stack

| Layer | Technologie | Warum |
|-------|------------|-------|
| Framework | **Next.js 15** (App Router) | Full-Stack TypeScript, Server Actions, API Routes |
| Language | **TypeScript** (end-to-end) | Eine Sprache für Frontend + Backend + AI-Integration |
| Backend Platform | **Supabase** (All-in-One) | PostgreSQL + Auth + Storage + Realtime in einem. Open Source. |
| Database | **Supabase PostgreSQL + Prisma ORM + pgvector** | Type-safe Queries, JSON-Columns, Vector-Search, RLS |
| Auth | **Supabase Auth** | Email, OAuth, Magic Links, 2FA. Org-Management via Custom Tables + RLS |
| AI | **Vercel AI SDK** | Unified Interface für OpenAI, Anthropic, Google — LLM-Switch = 1 Zeile |
| UI | **shadcn/ui + Tailwind CSS** | Apple-like Minimalism, accessible, composable |
| Queue/Jobs | **Inngest** | Serverless Background Jobs, Event-driven, Retries, Monitoring-Dashboard |
| Files | **Supabase Storage** | File Uploads mit RLS-gesicherten Buckets, presigned URLs |
| Search | **PostgreSQL Full-Text Search** (MVP) | tsvector reicht für 10k+ Personas, kein extra Service |
| Realtime | **Supabase Realtime** | WebSocket-basiert: Broadcast, Presence, DB Changes |
| Research | **Tavily API** | Web-Research für domain-spezifisches Wissen |
| Deploy | **Vercel** | Native Next.js Support, Edge Functions, CI/CD built-in |

---

## Warum Next.js + Supabase

| Kriterium | Next.js + Supabase | Laravel |
|-----------|-------------------|---------|
| AI SDKs | Offizielle SDKs für OpenAI, Anthropic, Google | Keine offiziellen PHP SDKs |
| LLM-Switch | Vercel AI SDK: 1 Import ändern | Eigene HTTP-Wrapper bauen |
| Sprachen | 1 (TypeScript) | 2 (PHP + TypeScript) |
| Backend Services | Supabase = DB + Auth + Storage + Realtime in 1 | Separate Services für alles |
| Data Isolation | Supabase RLS (DB-Level Security) | Application-Level WHERE clauses |
| Open Source | Supabase ist open source (self-hostbar) | Laravel ja, aber Forge/Vapor nicht |
| Engineers finden | Einfacher für AI-Projekte | Schwieriger |

---

## Projekt-Struktur

```
gotofu/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (auth)/                       # Auth-Pages (Supabase Auth)
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
│   │   ├── ui/                           # shadcn/ui Base-Components
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
│   │   │   │   ├── persona-generation.ts
│   │   │   │   ├── interview.ts
│   │   │   │   └── analysis.ts
│   │   │   ├── bias-detector.ts
│   │   │   └── quality-checker.ts
│   │   ├── db/
│   │   │   ├── prisma.ts                # Prisma Client Singleton
│   │   │   └── queries/                 # Typed Query Functions
│   │   │       ├── personas.ts
│   │   │       ├── studies.ts
│   │   │       └── sessions.ts
│   │   ├── research/
│   │   │   └── tavily.ts                # Tavily API Client
│   │   ├── uploads/
│   │   │   ├── processor.ts             # File Processing Factory
│   │   │   ├── csv-processor.ts
│   │   │   ├── pdf-processor.ts
│   │   │   └── transcript-processor.ts
│   │   ├── inngest/
│   │   │   ├── client.ts                # Inngest Client
│   │   │   └── functions/               # Background Job Definitions
│   │   │       ├── generate-persona-batch.ts
│   │   │       ├── run-interview-session.ts
│   │   │       ├── process-upload.ts
│   │   │       └── aggregate-results.ts
│   │   └── utils/
│   │       ├── constants.ts
│   │       └── validation.ts            # Zod Schemas
│   ├── hooks/                           # React Hooks
│   │   ├── use-personas.ts
│   │   ├── use-studies.ts
│   │   └── use-realtime.ts
│   └── types/
│       ├── persona.ts
│       ├── study.ts
│       └── index.ts
├── prisma/
│   ├── schema.prisma                    # Database Schema
│   ├── migrations/
│   └── seed.ts                          # Pre-built Groups Seeder
├── public/
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## LLM-agnostische Architektur (Vercel AI SDK)

> **Hinweis**: Supabase handelt Auth, Storage, Realtime und DB.
> Das Vercel AI SDK handelt die LLM-Integration — komplett getrennte Concerns.

Das Vercel AI SDK löst das Provider-Lock-in Problem **out of the box**:

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
// Nutzung überall im Code — Provider-agnostisch:
import { generateObject, generateText, streamText } from 'ai';
import { getModel } from '@/lib/ai/provider';

const result = await generateObject({
  model: getModel(),                    // ← OpenAI, Claude oder Gemini
  schema: personaSchema,                // ← Zod Schema = typsichere JSON-Ausgabe
  prompt: 'Generate a midwife persona...',
});
```

### Provider wechseln = 1 Zeile in .env
```bash
LLM_PROVIDER=claude          # Wechsel von OpenAI zu Claude
ANTHROPIC_API_KEY=<anthropic-api-key> # Key setzen — fertig
```

### Multimodal-Ready
Das Vercel AI SDK unterstützt bereits Multimodal (Bilder, PDFs):
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

## Datenbank-Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

// ─── Auth & Orgs (Auth via Supabase Auth, Orgs self-managed) ───

model User {
  id                  String    @id @default(uuid())  // = Supabase auth.users.id
  email               String    @unique
  name                String?
  avatarUrl           String?
  onboardingCompleted Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  memberships         OrganizationMember[]
  studies             Study[]
  uploads             Upload[]
  usageLogs           UsageLog[]
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  logoUrl   String?
  isPersonal Boolean @default(false)  // true = User's personal workspace
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members       OrganizationMember[]
  invitations   OrganizationInvitation[]
  personaGroups PersonaGroup[]
  studies       Study[]
  uploads       Upload[]
  usageLogs     UsageLog[]
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           OrgRole      @default(MEMBER)
  createdAt      DateTime     @default(now())

  @@unique([organizationId, userId])
}

model OrganizationInvitation {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  email          String
  role           OrgRole      @default(MEMBER)
  token          String       @unique @default(cuid())
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime     @default(now())

  @@index([token])
}

enum OrgRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

// ─── Personas ───

model PersonaGroup {
  id              String          @id @default(cuid())
  organizationId  String
  organization    Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name            String
  description     String?
  sourceType      SourceType
  generationConfig Json?          // LLM params, temperature, etc.
  domainContext   String?         @db.Text
  isPrebuilt      Boolean         @default(false)
  personaCount    Int             @default(0)
  metadata        Json?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  personas        Persona[]
  studyAssignments StudyPersonaGroup[]
  domainKnowledge DomainKnowledge[]
  tags            TagOnGroup[]

  @@index([organizationId])
}

model Persona {
  id              String          @id @default(cuid())
  personaGroupId  String
  personaGroup    PersonaGroup    @relation(fields: [personaGroupId], references: [id], onDelete: Cascade)
  name            String
  age             Int?
  gender          String?
  location        String?
  occupation      String?
  bio             String?         @db.Text
  backstory       String          @db.Text
  goals           Json?           // string[]
  frustrations    Json?           // string[]
  behaviors       Json?           // string[]
  demographics    Json?
  psychographics  Json?
  sourceType      SourceType
  sourceReference Json?           // Upload ID, data source ref
  llmSystemPrompt String?         @db.Text
  embedding       Unsupported("vector(1536)")?
  qualityScore    Float?
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  personality     PersonalityProfile?
  attributes      PersonaAttribute[]
  sessions        Session[]
  tags            TagOnPersona[]

  @@index([personaGroupId, isActive])
}

model PersonalityProfile {
  id                    String   @id @default(cuid())
  personaId             String   @unique
  persona               Persona  @relation(fields: [personaId], references: [id], onDelete: Cascade)
  openness              Float    // 0.0 - 1.0
  conscientiousness     Float
  extraversion          Float
  agreeableness         Float
  neuroticism           Float
  communicationStyle    String?  // "direct", "verbose", "analytical"
  responseLengthTendency String? // "short", "medium", "long"
  createdAt             DateTime @default(now())
}

model PersonaAttribute {
  id        String   @id @default(cuid())
  personaId String
  persona   Persona  @relation(fields: [personaId], references: [id], onDelete: Cascade)
  key       String
  value     String   @db.Text
  type      String   @default("string") // string, number, boolean, json

  @@unique([personaId, key])
}

// ─── Studies & Sessions ───

model Study {
  id                  String      @id @default(cuid())
  organizationId      String
  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdById         String
  createdBy           User        @relation(fields: [createdById], references: [id])
  title               String
  description         String?     @db.Text
  studyType           StudyType
  status              StudyStatus @default(DRAFT)
  interviewGuide      String?     @db.Text
  surveyQuestions     Json?
  researchObjectives  Json?       // string[]
  targetSampleSize    Int?
  completedCount      Int         @default(0)
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  personaGroups       StudyPersonaGroup[]
  sessions            Session[]
  analysisReports     AnalysisReport[]

  @@index([organizationId])
}

model StudyPersonaGroup {
  id              String       @id @default(cuid())
  studyId         String
  study           Study        @relation(fields: [studyId], references: [id], onDelete: Cascade)
  personaGroupId  String
  personaGroup    PersonaGroup @relation(fields: [personaGroupId], references: [id])
  sampleSize      Int?
  filterCriteria  Json?

  @@unique([studyId, personaGroupId])
}

model Session {
  id            String        @id @default(cuid())
  studyId       String
  study         Study         @relation(fields: [studyId], references: [id], onDelete: Cascade)
  personaId     String
  persona       Persona       @relation(fields: [personaId], references: [id])
  status        SessionStatus @default(PENDING)
  startedAt     DateTime?
  completedAt   DateTime?
  durationMs    Int?
  tokenUsage    Json?         // { promptTokens, completionTokens, total }
  costEstimate  Float?
  errorMessage  String?       @db.Text
  parentId      String?       // For follow-up sessions
  createdAt     DateTime      @default(now())

  messages      SessionMessage[]
  responses     SessionResponse[]

  @@index([studyId, status])
}

model SessionMessage {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      MessageRole
  content   String   @db.Text
  sequence  Int
  createdAt DateTime @default(now())

  @@index([sessionId, sequence])
}

model SessionResponse {
  id             String   @id @default(cuid())
  sessionId      String
  session        Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  questionKey    String?
  questionText   String   @db.Text
  responseText   String   @db.Text
  sentiment      String?  // positive, negative, neutral, mixed
  confidence     Float?
  themes         Json?    // string[]
  codedData      Json?
  createdAt      DateTime @default(now())
}

// ─── Uploads ───

model Upload {
  id               String       @id @default(cuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  uploadedById     String
  uploadedBy       User         @relation(fields: [uploadedById], references: [id])
  originalFilename String
  storagePath      String
  mimeType         String
  fileSize         Int
  uploadType       UploadType
  processingStatus ProcessingStatus @default(PENDING)
  processingResult Json?
  rowCount         Int?
  personaGroupId   String?
  errorMessage     String?      @db.Text
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
}

// ─── Analysis ───

model AnalysisReport {
  id                   String   @id @default(cuid())
  studyId              String
  study                Study    @relation(fields: [studyId], references: [id], onDelete: Cascade)
  title                String
  summary              String?  @db.Text
  keyFindings          Json?
  themes               Json?
  sentimentBreakdown   Json?
  demographicBreakdown Json?
  recommendations      Json?
  createdAt            DateTime @default(now())
}

// ─── RAG Knowledge Base ───

model DomainKnowledge {
  id              String       @id @default(cuid())
  personaGroupId  String
  personaGroup    PersonaGroup @relation(fields: [personaGroupId], references: [id], onDelete: Cascade)
  source          String       // tavily, upload, manual
  title           String
  content         String       @db.Text
  embedding       Unsupported("vector(1536)")?
  metadata        Json?
  createdAt       DateTime     @default(now())
}

// ─── Tags ───

model Tag {
  id        String         @id @default(cuid())
  name      String
  slug      String         @unique
  createdAt DateTime       @default(now())

  groups    TagOnGroup[]
  personas  TagOnPersona[]
}

model TagOnGroup {
  tagId          String
  tag            Tag          @relation(fields: [tagId], references: [id], onDelete: Cascade)
  personaGroupId String
  personaGroup   PersonaGroup @relation(fields: [personaGroupId], references: [id], onDelete: Cascade)

  @@id([tagId, personaGroupId])
}

model TagOnPersona {
  tagId     String
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)
  personaId String
  persona   Persona @relation(fields: [personaId], references: [id], onDelete: Cascade)

  @@id([tagId, personaId])
}

// ─── Usage Tracking ───

model UsageLog {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id])
  action         String       // persona_generated, session_run, etc.
  tokensUsed     Int?
  cost           Float?
  metadata       Json?
  createdAt      DateTime     @default(now())
}

// ─── Enums ───

enum SourceType {
  PROMPT_GENERATED
  DATA_BASED
  UPLOAD_BASED
}

enum StudyType {
  INTERVIEW
  SURVEY
  FOCUS_GROUP
  USABILITY_TEST
  CARD_SORT
}

enum StudyStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum SessionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  FOLLOW_UP
}

enum MessageRole {
  SYSTEM
  INTERVIEWER
  RESPONDENT
}

enum UploadType {
  SURVEY
  TRANSCRIPT
  DATASET
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

---

## Persona Source Types (Labels)

| Label | Beschreibung | Wie generiert |
|-------|-------------|---------------|
| **Prompt Generated** | User erstellt per Prompt über unser UI | LLM (via Vercel AI SDK — OpenAI/Claude/Gemini) + optionale Domain-Research |
| **Based on Real Data** | Von GoTofu kuratiert oder via Tavily recherchiert | Tavily API → RAG → LLM synthetisiert Personas |
| **Based on Your Data** | User lädt eigene Daten hoch (Surveys, Transcripts) | File Processing → Daten-Extraktion → LLM reichert an → Personas |

---

## Persona-Generierung Framework

### Architektur-Prinzipien (basierend auf Competitor-Research)
- **Diversity by Design**: Jeder Batch muss diverse Personas produzieren (nicht cookie-cutter)
- **Domain Grounding via RAG**: Jede Persona basiert auf echtem Domain-Wissen
- **Big Five als Behavioral Anchor**: Persönlichkeitsprofil steuert Interview-Verhalten
- **Quality Scoring**: Jede Persona bekommt Score (0-1) basierend auf Konsistenz, Spezifität, Distinktivität, Domain-Grounding
- **Bias Transparency**: System misst und reportet Representational Bias

### Prompt-Architektur (5 Layer)
1. **System Context** — Rolle definieren ("demographic simulation engine")
2. **Domain Knowledge (RAG)** — Top-k Chunks aus `DomainKnowledge` Tabelle
3. **Group Constraints** — Demografische Verteilung, Location, Characteristics
4. **Differentiation Directive** — "Generiere eine Persona die sich von [existierenden] unterscheidet"
5. **Output Schema** — Zod Schema → typsicheres JSON (via `generateObject`)

### Big Five Integration in Sessions
Die Persönlichkeit steuert aktiv das Antwortverhalten:
- Hohe Offenheit → kreativere, abstraktere Antworten
- Hohe Gewissenhaftigkeit → strukturierte, detaillierte Antworten
- Hohe Extraversion → längere Antworten, Anekdoten
- Hohe Verträglichkeit → positivere Bewertungen (Sycophancy-Risiko — wird per Prompt mitigiert)
- Hoher Neurotizismus → emotionalere Antworten, teilt Ängste/Frustrationen

### Bias Detection System
- **Demografische Verteilung** — Vergleich mit bekannten Populations-Statistiken
- **Filter Bias** — Warnung wenn Filter zu viel ausschließt
- **Response Bias** — Erkennt unrealistische Big Five Verteilungen
- **Representational Gaps** — Identifiziert unterrepräsentierte Subgruppen

### Persona Templates (für durchschnittliche Nutzer:innen)

Um den Einstieg für nicht-researcher Personas zu erleichtern, gibt es vordefinierte **Persona Templates**. Ein Template ist eine kuratierte Kombination aus Demografie + Verhaltensprofil, die von der Persona-Engine als starke, aber flexible Leitplanke verwendet wird.

- Implementierung:
  - Statische Konfiguration in `[src/lib/personas/templates.ts](src/lib/personas/templates.ts)` mit `PersonaTemplateConfig`.
  - Jedes Template beschreibt:
    - `demographics` (Altersrange, typische Locations/Berufe, grobe Gender-Verteilung)
    - `behaviorProfile` (Big-Five-Tendenzen, Kommunikations- und Entscheidungsstil in Textform)
    - `defaultPersonaCount`, `diversityFocus` (broad/focused) und typische Use-Cases.
  - Der Prompt-Builder in `[src/lib/ai/generate-personas.ts](src/lib/ai/generate-personas.ts)` bekommt optional ein `templateConfig` und fügt eine eigene **Template-Layer** ein („TEMPLATE CONSTRAINTS“ + „BEHAVIORAL INTENT“).
- Erste Template-Kollektion (für generische SaaS-Cases):
  - **Young Caring Professionals** — Frauen 22–36 in Care-/Sozial-/Bildungsberufen (Hebammen, Pflege, Lehrkräfte).
  - **Productive Developers** — Männer 30–55, Tech-/Tooling-affin, meinungsstarke Engineers.
  - **Busy Team Leads** — Mixed 28–45, Team Leads / PMs zwischen Management und ICs.
  - **Founders & Solo Builders** — Frühphasen-Gründer:innen und Indie Hacker mit hoher Risiko- & Experimentierfreude.
  - **Corporate Stakeholders** — Senior Manager:innen, Directors, VP-Level in größeren Organisationen.
  - **Students & Early Career** — 18–28, mobile-first, preisbewusst, hohe Tool-Churn.
- UX:
  - In `/personas/new` gibt es im **Unified Creation Flow** eine Methode **“Templates”**:
    - Step 1: Template-Karte wählen (Name, Beschreibung, Use-Cases).
    - Step 2: Anzahl der Personas (1–100) einstellen.
    - GoTofu erstellt automatisch eine `PersonaGroup` mit Template-Namen und nutzt vorhandenen Org-Produktkontext als Domain Context (falls vorhanden).
    - Danach wird `/api/personas/generate` mit `templateId` aufgerufen; die Engine nutzt das Template im Prompt.
  - Zielgruppe: „Durchschnitts-User“, die ohne Prompt-Engineering und ohne Research-Setup schnell loslegen wollen.

---

## Persona-Generierung: Technische Pipeline (Detail)

### Pipeline 1: Survey Data → Personas

```
CSV/Excel Upload
     ↓
[1] Schema Parsing — Frage-Typen erkennen (Likert, Multiple Choice, Open-Ended)
     ↓
[2] LLM-Based Clustering — Survey-Daten in Chunks an LLM senden,
     │  Archetype-Cluster identifizieren lassen (typisch 5-12 Cluster)
     ↓
[3] Cluster Summary — Pro Cluster: repräsentative Quotes, Median-Scores, Pain Points
     ↓
[4] LLM Synthesis (via generateObject + Zod Schema):
     │  Prompt 1: Attribute Extraction (Demographics, Goals, Pain Points)
     │  Prompt 2: Big Five Personality Profiling
     │  Prompt 3: Narrative Synthesis (kohärente Persona-Story)
     ↓
[5] Quality Check — Completeness, Zod Validation, Consistency (LLM-Judge)
     ↓
[6] Deduplication — Embedding Cosine Similarity via pgvector
     ↓
[7] Distribution Validation — Demografische Verteilung prüfen
```

### Pipeline 2: Interview Transcripts → Personas

```
Text/PDF Upload
     ↓
[1] Text-Extraktion — PDF Parser / plain text einlesen
     ↓
[2] LLM-Based Analysis:
     │  a) Speaker/Voice Segmentation
     │  b) Theme Extraction — Topics, Pain Points, Goals
     │  c) Sentiment Analysis
     ↓
[3] Persona Synthesis (3-Turn):
     │  Turn 1: Charakteristiken extrahieren (mit Zitaten)
     │  Turn 2: Narrative konstruieren
     │  Turn 3: Validierung gegen Source
     ↓
[4] Quality Validation — Citation Coverage, Zero Contradictions (LLM-Judge)
```

### Pipeline 3: Web Research → Personas (Tavily)

```
Domain-Beschreibung (z.B. "Hebammen in Deutschland")
     ↓
[1] Tavily API → Web-Suche + Content-Extraktion
     ↓
[2] Domain Knowledge Assembly → DomainKnowledge Tabelle + Embeddings
     ↓
[3] RAG — Top-k Chunks als Kontext
     ↓
[4] LLM Synthesis mit Domain-Grounding (5-Layer Prompts)
     ↓
[5] Quality + Diversity Checks
```

### Pipeline 3a: Company URL → Personas (Tavily Extract + Search)

```
Company URL Eintrag (Step „Company URL“ im Unified Creation Flow)
     ↓
POST `/api/personas/extract-url`
     ↓
Tavily extract(url) + Tavily search(..., { maxResults }) → `companyContext`
     ↓
`generateObject` mit `extractedContextSchema`
     ↓
PersonaGroup → `/api/personas/generate` (mit extracted domainContext)
```

Implementierungsdetails:
- Route: `[src/app/api/personas/extract-url/route.ts](src/app/api/personas/extract-url/route.ts)`
- Ergebnis: ein `ExtractedContext` (targetUserRole, industry, painPoints, demographicsHints, domainContext), das anschließend als Domain Context für die Persona-Engine dient.

### Pipeline 3b: App Store Reviews → Personas (Discover + Outscraper Reviews)

```
Prompt/Target-Audience
     ↓
POST `/api/research/discover-appstore-url`
     ↓
Tavily Web-Suche (Bias auf `apps.apple.com`) → `appUrl`
     ↓
POST `/api/reviews/appstore` (Outscraper)
     ↓
Persist als DomainKnowledge (sourceType: `APP_REVIEW`) → RAG-Assembly
     ↓
`/api/personas/generate` (DATA_BASED) → grounded Personas
```

Implementierungsdetails:
- App URL Discovery: `[src/app/api/research/discover-appstore-url/route.ts](src/app/api/research/discover-appstore-url/route.ts)`
- Review Scraping + Persist: `[src/app/api/reviews/appstore/route.ts](src/app/api/reviews/appstore/route.ts)` und `[src/lib/reviews/outscraper.ts](src/lib/reviews/outscraper.ts)`

### UX: Chat-Pipeline-Progress auf `/personas/new` (Live-Logs, Sequenz & Checks)

Die Visualisierung zeigt eine sequenzielle Schritt-Liste, die sich wie „Live Logs“ anfühlt:
- Jeder Schritt wird zuerst auf `active` gesetzt.
- Nach dem jeweiligen Work (oder Visual-Delay) wird er auf `done` gesetzt; bei „visual_only“ wird er als `skipped` markiert.
- Der letzte Schritt (Generation) bleibt visuell aktiv, bis der Streaming-Worker „done“ signalisiert; erst dann wechselt der UI-Status auf `done`.
- Step Labels sind **kontext-aware** (z.B. public vs. corporate web addresses) und variieren pro Run, während die Gesamtpipeline (Tavily / App Store Reviews / Generation) konsistent bleibt.

### Handly-Pilot: Track-Workspaces, neue Persona-Gruppen & begleitende UX

Umsetzung (Code-Pfade als Referenz):

- **Seed & Datenmodell (ohne Schema-Änderung):** Zentrale Specs in [`src/lib/seed/handlyTracks.ts`](src/lib/seed/handlyTracks.ts):
  - Zwei Track-Organisationen: **Track 1 — Go-to-Market** (`handly-gtm`), **Track 2 — Product** (`handly-product`); exportierte Slug-Liste `HANDLY_TRACK_ORG_SLUGS` für UI-Bedingungen.
  - Gemeinsamer englischer Produktkontext `HANDLY_PRODUCT_CONTEXT_EN` (Dachdecker-Partner in Deutschland, Website/SEO/Ads, App für Angebot/PM/Buchhaltung, Telefon-Office usw.).
  - `HANDLY_TRACK_GROUPS` pro Track: mehrere `PersonaGroup`-Vorlagen mit `label`, optional `notes` (landen als `PersonaGroup.description` in der DB beim Seed).
  - Helfer `buildHandlyOrgProductContextFields()` / `buildHandlyPersonaGroupDomainContext()` für Org-Felder und Gruppen-`domainContext`.
- **Admin-Seeding:** [`src/app/api/admin/seed-handly-tracks/route.ts`](src/app/api/admin/seed-handly-tracks/route.ts) legt/aktualisiert Orgs, Produktkontext und Gruppen idempotent (inkl. optionalem Remapping alter Anzeigenamen, z. B. Sales Rep).
- **Auth & Workspace-Zugang:** In [`src/lib/auth.ts`](src/lib/auth.ts): `ensureHandlyTrackMemberships` — wenn `activeOrgSlug === "handly"`, werden Nutzer:innen automatisch Mitglied in `handly-gtm` und `handly-product`, damit beide Tracks im Switcher erscheinen.
- **Gruppenseite nur für Handly:** Auf [`src/app/(dashboard)/personas/[groupId]/page.tsx`](src/app/(dashboard)/personas/[groupId]/page.tsx) wird die graue zweite Zeile (`group.description`) **nur für Handly-Track-Orgs unterdrückt**; andere Workspaces behalten die Beschreibung.
- **Anzeigenamen für ältere Daten:** [`src/lib/personas/legacy-group-display-name.ts`](src/lib/personas/legacy-group-display-name.ts) mappt gespeicherte Legacy-Labels (z. B. Handly-interne Namen) auf die gewünschte UI-Überschrift.

### `/personas/new`: Chat-Leiste vergrößert & Datenquellen („Data Pillars“)

- **Komponente:** [`src/components/personas/creation/persona-chat-bar.tsx`](src/components/personas/creation/persona-chat-bar.tsx), eingebunden im **Unified Creation Flow** ([`src/components/personas/creation/unified-creation-flow.tsx`](src/components/personas/creation/unified-creation-flow.tsx)).
- **Chatfenster wächst nach unten:** `Textarea` mit `rows={1}`, `resize-none`, `overflow-hidden`; ein `useEffect` setzt `style.height` auf `scrollHeight`, sodass mehrzeilige Eingaben die Leiste nach unten erweitern (kein fester Einzeiler mehr).
- **Datenquellen / „Data pillars“:** Dropdown `DATA_SOURCES` mit Einträgen u. a. *All Data Sources*, *Templates*, *App Store reviews*, *CVs*, *Company URLs*, *Deep search* — nach Absenden des Prompts wird der passende Erstellungspfad gewählt (Icons + Labels in der Leiste).

### Persona-Generierung: aktualisierter System-Prompt (Layer 1)

- In [`src/lib/ai/generate-personas.ts`](src/lib/ai/generate-personas.ts) baut `buildPrompt` u. a. **Layer 1** als „demographic simulation engine“ mit **CRITICAL RULES**: Priorität psychologischer Tiefe und Verhaltensspezifik gegenüber bloßer Demografie; mindestens eine innere Widersprüchlichkeit; keine stereotype Kopplung Demografie → Persönlichkeit; Backstory mit konkreten Lebensereignissen; Zitat und Werte sollen authentisch wirken — nicht generisch.

### Persona-Detail: Badge für echte Erstellungs-Herkunft (Handly / Tavily)

- [`getPersona`](src/lib/db/queries/personas.ts) lädt verknüpfte `PersonaDataSource` inkl. `domainKnowledge` (nicht nur App-Review-Links), damit die Seite Tavily-/Scrape-Herkunft sieht.
- [`src/lib/personas/persona-creation-provenance.ts`](src/lib/personas/persona-creation-provenance.ts): `formatPersonaCreationProvenance` liefert kurze Badge-Texte (z. B. **„Web research & scraped sources“** bei `searchQuery` + `sourceUrl`); App-Store-Fälle und Fallbacks für prompt-only sind abgedeckt.
- Auf der Persona-Detailseite ersetzt das **zweite** Pill neben „Quality“ diese Herkunft; **`domainExpertise`** erscheint separat als dezente Zeile (nicht mehr als irreführendes „Provenance“-Badge).

### Batch Processing & Kosten-Optimierung

| Strategie | Ersparnis | Details |
|-----------|-----------|---------|
| **Batch API** | 50% | Async Processing, ~30-60min für 10k |
| **Prompt Caching** | 90% auf gecachten Content | System Prompt einmal cachen |
| **Structured Output** | Keine Retries | Zod Schema = garantiert valides JSON |
| **Inngest Concurrency** | Kontrolliert | Rate Limiting pro Provider built-in |

**Kosten-Schätzung (10,000 Personas):**
- Batch + Cache optimiert: **~$60-70** (Claude Sonnet) oder **~$50** (GPT-4o-mini)
- Pro Persona: ~$0.006-0.007

### Quality Assurance at Scale

1. **Completeness** — Zod Schema Validation (TypeScript-nativ)
2. **Consistency** — LLM-Judge prüft Big Five vs. Narrative
3. **Diversity** — Embedding Cosine Distance via pgvector (min ≥ 0.35)
4. **Data Grounding** — LLM-Judge prüft Source-Daten-Referenz
5. **Deduplication** — String-Hash (exakt) + pgvector Cosine (semantisch > 0.92)
6. **Distribution** — Demografische Verteilung statistisch prüfen

---

## Study/Session Flow (User Journey)

### Terminologie
- **Study** = Forschungsprojekt (z.B. "Hebammen-Bedürfnisse Q1 2026")
- **Session** = Einzelne Durchführung mit einer Persona
- **Study Types**: Interview, Survey, Focus Group, Usability Test, Card Sort

### Flow
```
1. Study erstellen → Typ wählen → Titel, Beschreibung, Forschungsziele
     ↓
2. Interview Guide / Survey-Fragen konfigurieren
     ↓
3. Persona Group(s) zuweisen → Sample Size → Optional filtern
     ↓
4. Bias-Check Review (Warnungen wenn Filter biased)
     ↓
5. Study starten → Inngest dispatcht Background Jobs
     ↓
6. Live-Progress via SSE ("42/80 Sessions completed")
     ↓
7. Sessions reviewen → Transkripte → Follow-up Fragen
     ↓
8. Analyse-Dashboard → Themes, Sentiment, Demographics
     ↓
9. Export (PDF/CSV)
```

### Follow-up Feature
- Einzelne Personas nach der Session nochmal befragen
- Session-History wird mitgeführt (Persona "erinnert" sich)
- Auch Gruppen-Follow-ups möglich

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

### Design-Prinzipien
- **Restraint & Clarity**: Keine unnötigen Dekorationen
- **Whitespace**: Apple-typisch viel Weißraum
- **Progressive Disclosure**: Summaries first, Details on demand
- **Bento-Grid Layout**: Modulare Info-Blöcke auf dem Dashboard
- **Virtual Scrolling**: TanStack Virtual für 10k+ Listen

---

## Key Packages

| Package | Zweck |
|---------|-------|
| `next` 15.x | Framework |
| `@supabase/supabase-js` + `@supabase/ssr` | Auth + Storage + Realtime |
| `@prisma/client` + `prisma` | ORM + Migrations (nutzt Supabase PostgreSQL) |
| `ai` + `@ai-sdk/openai` + `@ai-sdk/anthropic` + `@ai-sdk/google` | LLM Integration |
| `inngest` | Background Jobs + Event System |
| `tailwindcss` | Styling |
| `shadcn/ui` (via CLI) | UI Components |
| `zod` | Schema Validation (Frontend + Backend) |
| `@tanstack/react-query` | Client-side Data Fetching |
| `@tanstack/react-virtual` | Virtual Scrolling für große Listen |
| `papaparse` | CSV Parsing |
| `pdf-parse` | PDF Text-Extraktion |
| `recharts` oder `@nivo/core` | Charts für Analysis |
| `vitest` | Unit Tests |
| `playwright` | E2E Tests |

---

## Background Jobs (Inngest)

```typescript
// lib/inngest/functions/generate-persona-batch.ts
import { inngest } from '../client';
import { getModel } from '@/lib/ai/provider';
import { generateObject } from 'ai';
import { personaSchema } from '@/lib/utils/validation';

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

### Phase 1: Foundation (Wochen 1-3)
**Ziel**: Auth, Org-Management, DB-Struktur, deploybares Skeleton

1. Next.js 15 Projekt initialisieren (App Router, TypeScript)
2. Supabase Projekt erstellen + pgvector Extension aktivieren
3. Supabase Auth Setup (Email + OAuth, Middleware für Session-Refresh)
4. Prisma Schema erstellen + Migration gegen Supabase PostgreSQL
5. Org-Management bauen (Organization, Members, Invitations + RLS Policies)
6. shadcn/ui + Tailwind CSS Setup
7. Dashboard Layout (Sidebar, TopBar, OrgSwitcher)
8. Dashboard Page (Empty State mit Onboarding)
9. Inngest Setup (Background Job Infrastructure)
10. `.env.example` mit allen Keys
11. Vercel Deployment Pipeline

**Deliverable**: User können sich registrieren, Orgs erstellen, Members einladen, zwischen Workspaces wechseln.

### Phase 2: Persona Engine (Wochen 4-7)
**Ziel**: Persona-Generierung, Browsing, Filtering, Pre-built Groups

1. Vercel AI SDK Setup + Provider Config (OpenAI als Standard)
2. Tavily Client für Web-Research
3. Prompt Templates + Generation Pipeline
4. Inngest Functions (generate-persona-batch, generate-single-persona)
5. PersonaGroup + Persona CRUD (Server Actions + Pages)
6. Persona Browsing UI (Grid, Table, Detail Panel)
7. Filter-System (Zod-basierte Filter-Schemas + URL-State)
8. BiasDetector + BiasIndicator Component
9. Big Five Profil-Generierung + PersonalityRadar Chart
10. GenerationWizard (Multi-Step Form)
11. **Persona Templates im Wizard**:
    - Templates definieren (siehe Abschnitt „Persona Templates“).
    - „Templates“-Methode im Unified Creation Flow implementieren.
    - Templates → `PersonaGroup` + Batch-Generierung verdrahten.
12. **3 Pre-built Groups seeden**: Hebammen, Ausländer, Perioden-Planning (je 50-100 Personas), optional auf Basis der Templates.
13. Tagging-System
14. Embedding-Generierung + pgvector Similarity Search

**Deliverable**: User können Personas generieren, browsen, filtern, managen.

### Phase 3: Upload & Data Processing (Wochen 8-9)
**Ziel**: User können eigene Daten hochladen → Personas generieren

1. File Upload UI (Drag & Drop + Progress)
2. Supabase Storage Upload mit RLS-gesicherten Buckets
3. File Processors (CSV, Excel, PDF, Transcript)
4. Column-Mapping UI für tabellarische Daten
5. Inngest Functions (process-upload, extract-personas-from-upload)
6. Upload Manager Page mit Status-Tracking

**Deliverable**: User können eigene Daten hochladen und daraus Personas generieren.

### Phase 4: Study & Session System (Wochen 10-13)
**Ziel**: Studies erstellen, Sessions durchführen

1. Study Creation Wizard (Multi-Step)
2. Interview Guide Builder + Survey Question Builder
3. Persona Group Assignment mit Sample Size + Filtering
4. Inngest Functions (run-interview-session, run-survey-session)
5. Multi-Turn Conversation Pipeline (streamText für Realtime)
6. Supabase Realtime für Progress-Feed (Broadcast Channel)
7. SessionViewer (Transcript Component)
8. Follow-up Session Funktionalität
9. Token Usage + Cost Tracking

**Deliverable**: Kompletter Study-Lifecycle.

### Phase 5: Analysis & Reporting (Wochen 14-16)
**Ziel**: Aggregierte Analyse, Export

1. Inngest Function (aggregate-study-results)
2. LLM-basierte Theme Extraction + Sentiment Analysis
3. Results Dashboard mit Charts (Recharts/Nivo)
4. Demographic Breakdown
5. PDF + CSV Export
6. Analysis Hub Page

**Deliverable**: Visuelle Analyse mit Export.

### Phase 6: Polish & Scale (Wochen 17-20)
**Ziel**: Production Readiness

1. Performance-Optimierung (React Virtual, Query Caching)
2. Usage Metering + Billing (Stripe)
3. Onboarding Flow
4. Notifications (Email via Resend)
5. Error Monitoring (Sentry)
6. Security Audit
7. Production Hardening

---

## Multi-Engineer Collaboration & Version Control

### Git Workflow
- **Trunk-based** mit `main` + Feature-Branches (`feature/persona-generation`)
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- **PR Reviews** required vor Merge
- **CI**: Vercel Preview Deployments + Tests bei jedem Push

### Code-Organisation für Teams
- **Feature-basierte Struktur**: Ein Engineer arbeitet an `personas/`, ein anderer an `studies/`
- **Shared lib/**: AI, DB, Utils sind shared — aber stabil und interface-basiert
- **Zod Schemas**: Klare Daten-Contracts zwischen Frontend und Backend

### Austauschbare Architektur
| Komponente | Aktuell | Austauschbar gegen |
|------------|---------|-------------------|
| LLM | OpenAI GPT-4o | Claude, Gemini, Llama — 1 Import ändern |
| Backend | Supabase (DB+Auth+Storage+RT) | Self-hosted Supabase, oder einzelne Services separat |
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

### Direkte Wettbewerber
- **Synthetic Users** (syntheticusers.com) — Multi-Agent Architektur, Big Five Personality Modeling
- **Delve AI** — AI Market Research mit Persona-Generierung
- **Uxia** — Design-Feedback ohne Recruiting

### Key Learnings
- **Persona Hub** (Tencent): 1 Mrd. Personas aus Web-Daten, Text-to-Persona Approach
- **PolyPersona**: Persona-konditionierte Survey-Antworten
- **PersonaFuse**: Dynamische Persona-Kalibrierung
- **Nielsen Norman Group**: Synthetic Users nur für Hypothesis Generation, nicht als Ersatz

### Qualitäts-Risiken + Mitigation
- LLM Sycophancy → Big Five Personality Prompting mitigiert
- Representational Bias → Aktive Bias Detection + Distribution Validation
- Shallow Insights → Domain Grounding via RAG + echte Daten

---

## Verification & Testing

### End-to-End Test-Szenario
1. Registrieren → Org erstellen → Teammate einladen
2. Persona Group erstellen → "Prompt Generated" → 10 Hebammen-Personas generieren
3. Pre-built Group öffnen → Filter setzen → Bias-Check prüfen
4. Study erstellen → Interview → 5 Fragen → Gruppe zuweisen → Starten
5. Progress verfolgen → Sessions reviewen → Follow-up
6. Analyse → Themes, Sentiment → PDF Export

### Technische Tests
- `vitest` — Unit Tests für AI Pipeline, Prompt Builder, Quality Checker
- `playwright` — E2E Tests für User Flows
- Inngest Dev Server — Background Jobs lokal testen
- Mock AI Responses — Deterministische Tests ohne API-Kosten

### Dev-Befehle
```bash
npm install
cp .env.example .env.local      # Supabase URL + Keys eintragen
npx supabase start              # Lokale Supabase-Instanz (optional)
npx prisma migrate dev          # DB Migrations
npx prisma db seed              # Pre-built Groups seeden
npx inngest-cli dev             # Background Job Dev Server
npm run dev                     # Next.js Dev Server
npm run test                    # Vitest
npx playwright test             # E2E Tests
```

---

## Worauf ich beim Bauen achte (Best Practices)

- **Clean Architecture**: lib/ für Business Logic, app/ für Routing, components/ für UI
- **Type Safety End-to-End**: Zod Schemas validieren Input, Prisma generiert Types, TypeScript überall
- **Interface-First**: Vercel AI SDK = provider-agnostisch, Prisma = DB-agnostisch
- **Security**: Supabase Auth + RLS für Data Isolation, Server Actions validieren mit Zod, keine client-side secrets
- **Performance**: React Virtual, TanStack Query Caching, Prisma Connection Pooling
- **Testability**: Inngest Functions sind unit-testbar, AI calls mockbar
- **Accessibility**: shadcn/ui basiert auf Radix — ARIA-compliant
- **Cost Control**: Token-Tracking pro Request, Rate Limiting per Org
- **Bias Awareness**: Aktive Bias-Detection in Persona-Generierung und Filterung
- **Multi-Engineer Ready**: Feature-basierte Folder-Struktur, Zod Contracts, Conventional Commits
- **Kein Vendor Lock-in**: LLM, Auth, DB, Queue, Storage — alles austauschbar
