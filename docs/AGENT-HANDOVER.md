# GoTofu — Agent Handover Document

> **Read this document first.** It's the only entry point you need.
> Last updated: 2026-03-18

---

## 1. What is GoTofu?

GoTofu is a **B2B SaaS platform for synthetic user research**. Customers create AI-generated personas from real data (web research, reviews, forums), run simulated interviews and surveys, and receive automatically analyzed insights — as a faster, cheaper alternative or preparation for real user research.

**Founder:** Daniel Kourie (daniel.kourie@code.berlin) — CODE Berlin student, non-technical, product-focused.

**Current status:** Production deployed, first customers active. Platform works end-to-end: Create personas → Set up study → Run batch interviews → View results dashboard.

---

## 2. Deployment — What Runs Where

### Live Environments

| URL | Purpose | Vercel Project |
|---|---|---|
| `https://gotofu.io` | Landing Page | `gotofu-landing` |
| `https://app.gotofu.io` | App (Login, Dashboard, Studies, Personas) | `gotofu-app` |

### Infrastructure

| Service | Details |
|---|---|
| **Vercel** | Team: `gotofus-projects`, Account: `admin-42578282` |
| **GitHub** | App: `github.com/habibidani/gotofu` (private), Landing: `github.com/GoTofu-Agile/LandingPage` (private) |
| **Supabase** | Project: `SyntheticTofu`, URL: `https://cgkgolnccyuqjlvcazov.supabase.co` |
| **Inngest** | Background Jobs (Batch Interviews, Insights Generation) |
| **OpenAI** | Default LLM Provider (`gpt-4o`), but swappable |
| **Tavily** | Web Research for persona data sourcing |
| **Zoho Mail** | `admin@gotofu.io` — Vercel Account Login, team communication |
| **Domain Registrar** | Hostinger — Nameservers delegated to Vercel, DNS managed at Vercel (MX for Zoho, SPF) |

### Repo Architecture (Two Repos)

```
habibidani/gotofu (GitHub)         → gotofu-app (app.gotofu.io)
GoTofu-Agile/LandingPage (GitHub)  → gotofu-landing (gotofu.io)
```

Each repo deploys independently to its Vercel project. Push to `main` → automatic deployment.

**Note:** The local directory `apps/landing/` still exists but is NOT used for the Vercel `gotofu-landing` project. The landing page comes from the separate repo `GoTofu-Agile/LandingPage`.

Details: see `VERCEL-SETUP.md`

---

## 3. Local Setup

```bash
# Clone repo
git clone https://github.com/habibidani/gotofu.git
cd gotofu

# Dependencies
npm install

# Create .env.local (get values from Daniel)
cp .env.example .env.local
# → Fill in DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, etc.

# IMPORTANT: Prisma needs .env (not .env.local)
cp .env.local .env

# Generate Prisma Client
npx prisma generate

# Start app (Port 3004)
npm run dev

# Start Landing Page (Port 3005, separate terminal)
cd apps/landing && npm run dev
```

### Required Environment Variables

```
DATABASE_URL=postgresql://...           # Supabase PostgreSQL (pooler)
NEXT_PUBLIC_SUPABASE_URL=https://...    # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...       # Supabase public key
SUPABASE_SERVICE_ROLE_KEY=...           # Supabase service role (server-only)
LLM_PROVIDER=openai                     # "openai" | "anthropic" | "google"
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o
TAVILY_API_KEY=...                      # Optional — without it: no web research
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3004
GOTOFU_ADMIN_EMAILS=daniel.kourie@code.berlin
```

---

## 4. Tech Stack & Gotchas

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| Runtime | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Database ORM | Prisma | 5.22.0 |
| Database | PostgreSQL (Supabase) | — |
| Auth | Supabase Auth | via `@supabase/ssr` |
| LLM | Vercel AI SDK | 6.x (LLM-agnostic) |
| Background Jobs | Inngest | 3.52.6 |
| UI Components | shadcn/ui v4 (**base-ui**, not Radix) | 4.x |
| Styling | Tailwind CSS | 4.x |
| Icons | Lucide React | 0.577.0 |
| Validation | Zod | 4.x |
| HTTP Client | TanStack Query | 5.x |
| Toasts | Sonner | 2.x |
| Web Research | Tavily SDK | 0.7.x |

### Critical Gotchas (Things agents keep getting wrong)

1. **shadcn/ui v4 uses base-ui, NOT Radix** — no `asChild` prop. Writing `asChild` won't cause a compile error but breaks rendering.

2. **Zod v4: `error.issues` not `error.errors`** — `error.errors` no longer exists.

3. **Port 3004** (not 3000) — configured in `package.json`.

4. **Both `.env` files needed** — `.env.local` for Next.js runtime, `.env` for Prisma CLI. Both must contain `DATABASE_URL`.

5. **Prisma v5 on Node 20.11.1** — do NOT upgrade to Prisma v6, it requires Node 20.19+.

6. **`pdf-parse` must be imported with `require()`** — ESM import throws `Property 'default'` error.

7. **Tailwind CSS v4: no `tailwind.config.js`** — all CSS variables in `src/app/globals.css`.

8. **Next.js 16 Middleware Warning** — `"middleware" file convention is deprecated` in build logs is a warning, not an error. Still works.

9. **`DropdownMenuLabel` must be inside `DropdownMenuGroup`** — base-ui requirement.

10. **Multi-tenant** — EVERY DB query and API route must check `organizationId`. Always authenticate via `requireAuthWithOrgs()` (`src/lib/auth.ts`).

11. **Vercel Env Vars: Trailing Newlines** — When setting via CLI **always** use `printf '%s' "value" | vercel env add` instead of `echo`. `echo` appends a `\n` that silently breaks API keys, DB URLs, etc. Fixed on 2026-03-18 for all 12 vars.

12. **DATABASE_URL: Transaction Pooler (Port 6543)** — Supabase offers Session Pooler (5432) and Transaction Pooler (6543). Serverless (Vercel) **must** use Transaction Pooler: `...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10`. Session Pooler has too low connection limit → `MaxClientsInSessionMode` error.

---

## 5. Repo Structure

```
/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, Signup, OAuth Callback
│   │   ├── (dashboard)/     # All protected pages
│   │   │   ├── dashboard/   # Home
│   │   │   ├── personas/    # Persona Groups + individual Personas
│   │   │   ├── studies/     # Studies + Sessions + Results
│   │   │   ├── settings/    # Workspace + Members
│   │   │   ├── uploads/     # File Upload Manager
│   │   │   └── admin/       # Admin (gated via GOTOFU_ADMIN_EMAILS)
│   │   ├── api/             # API Routes
│   │   │   ├── inngest/     # Inngest Webhook
│   │   │   ├── chat/        # Streaming Interview Chat
│   │   │   ├── personas/    # Persona Generate/Extract
│   │   │   ├── studies/     # Study Setup/Guide/Run
│   │   │   ├── assistant/   # AI Assistant Chat
│   │   │   └── research/    # Tavily Web Research
│   │   ├── page.tsx         # Root → redirect("/login")
│   │   └── globals.css      # Tailwind v4 CSS Variables
│   ├── components/
│   │   ├── layout/          # Sidebar, Topbar, OrgSwitcher, AppFrame
│   │   ├── studies/         # Study Components, Results Dashboard
│   │   ├── personas/        # Persona Cards, Creation Forms
│   │   ├── assistant/       # AI Chat Sidebar
│   │   └── ui/              # shadcn/ui primitives
│   ├── lib/
│   │   ├── ai/              # LLM Provider, Persona Generation, Prompts
│   │   ├── db/queries/      # Prisma Query Functions
│   │   ├── inngest/         # Background Job Functions
│   │   ├── supabase/        # Auth Helpers
│   │   └── validation/      # Zod Schemas
│   └── middleware.ts        # Supabase Session Refresh
├── prisma/
│   └── schema.prisma        # Complete data model
├── apps/
│   └── landing/             # Separate Next.js App (gotofu.io)
├── docs/
│   ├── AGENT-HANDOVER.md    # This document
│   ├── ENGINEERING-VISION.md # Architecture deep-dive
│   └── PERSONA-FRAMEWORK.md # Persona Framework design doc
├── VERCEL-SETUP.md          # Deployment details + troubleshooting
└── FRONTEND-HANDOFF.md      # UI/UX guidelines for frontend agents
```

---

## 6. Complete Route Map

### Auth (public)
| Route | Purpose |
|---|---|
| `/login` | Email/Password + OAuth Login |
| `/signup` | Registration |
| `/callback` | OAuth Redirect Handler |
| `/accept-invite/[token]` | Accept team invitation |

### Dashboard (protected — requires Auth + Org)
| Route | Purpose |
|---|---|
| `/dashboard` | Home — feature overview + onboarding checklist |
| `/personas` | Persona Groups Grid |
| `/personas/new` | Create new Persona Group (6 methods) |
| `/personas/[groupId]` | Group detail + Persona Cards |
| `/personas/[groupId]/[personaId]` | Full Persona profile |
| `/studies` | Studies listing |
| `/studies/new` | Create study (multi-step form) |
| `/studies/[studyId]` | Study detail + session management |
| `/studies/[studyId]/results` | Results Dashboard (Themes, Quotes, Recs) |
| `/studies/[studyId]/compare` | Cross-session comparison |
| `/studies/[studyId]/[sessionId]` | Interview transcript |
| `/settings` | Workspace Settings + AI Product Context |
| `/settings/members` | Team management + invitations |
| `/uploads` | File Upload Manager |
| `/admin` | Admin Panel (`GOTOFU_ADMIN_EMAILS` only) |

### API Routes
| Route | Purpose |
|---|---|
| `POST /api/inngest` | Inngest Webhook Endpoint |
| `POST /api/chat` | Streaming Single-Interview Chat |
| `POST /api/personas/generate` | NDJSON Streaming Persona Generation |
| `POST /api/personas/extract` | Freetext → structured context |
| `POST /api/personas/extract-pdf` | LinkedIn PDF → context |
| `POST /api/personas/extract-url` | Company URL → Tavily Research → context |
| `POST /api/studies/setup` | AI Quick-Setup (freetext → study fields) |
| `POST /api/studies/generate-guide` | Generate interview guide |
| `POST /api/studies/[studyId]/run-batch` | Start batch interviews (→ Inngest) |
| `GET /api/studies/[studyId]/status` | Batch progress polling |
| `GET /api/studies/[studyId]/export` | CSV Transcript Export |
| `POST /api/research` | Streaming Web Research (Tavily) |
| `POST /api/assistant` | AI Assistant Chat |
| `GET /api/assistant/history` | Chat history list |

---

## 7. Key Workflows

### Workflow 1: Create Personas (AI-Generate Method)

```
1. /personas/new → Choose method (AI Generate)
2. Enter context (optional: Tavily URL research)
3. POST /api/personas/generate → NDJSON Stream
   → src/lib/ai/generate-personas.ts
   → buildPrompt() → 5-Layer Prompt (Identity, Psychology, Behavior, Communication, Research)
   → RAG: DomainKnowledge embedding lookup (pgvector)
   → Anti-sycophancy: ~30% skeptic types
   → qualityScore: 22-point system
4. Persona cards appear via streaming
5. Save → Prisma Persona + PersonalityProfile
```

### Workflow 2: Study + Batch Interview

```
1. /studies/new → Multi-step form
   → Study Type, Research Objectives, Interview Guide
   → Assign Persona Groups + Sample Size
2. /studies/[id] → "Run Batch Interviews" button
3. POST /api/studies/[id]/run-batch
   → Inngest Event: study/run-batch
4. src/lib/inngest/functions/run-batch-interview.ts
   → For each persona: create session
   → 5-8 conversation turns (LLM as interviewer + LLM as persona)
   → Runs in parallel batches of 3
   → Session → COMPLETED
   → Study → COMPLETED
   → Inngest Event: study/generate-insights
5. src/lib/inngest/functions/generate-insights.ts
   → Load all transcripts
   → LLM generateObject → insightsSchema
   → Save AnalysisReport to DB
6. /studies/[id]/results → Results Dashboard
```

### Workflow 3: Auth Flow

```
Login/Signup → Supabase Auth
→ /callback (OAuth) or direct
→ src/middleware.ts → updateSession() on every request
→ requireAuthWithOrgs() checks: user exists + has org
→ If no org: Onboarding
→ Dashboard Layout reads activeOrgId from cookie
```

---

## 8. Data Model (Overview)

Full schema in `prisma/schema.prisma`. Core models:

```
Organization (Multi-Tenant Root)
├── OrganizationMember → User
├── PersonaGroup
│   └── Persona
│       ├── PersonalityProfile (Big Five, Communication Style)
│       ├── PersonaAttribute (Key-Value Extras)
│       └── PersonaDataSource → DomainKnowledge (RAG)
├── Study
│   ├── StudyPersonaGroup (M2M)
│   ├── Session → Persona
│   │   ├── SessionMessage
│   │   └── SessionResponse
│   └── AnalysisReport (Themes, Quotes, Recommendations)
├── Upload
├── ChatConversation → ChatMessage
└── UsageLog
```

**Enums:**
- `StudyType`: INTERVIEW (live), SURVEY / FOCUS_GROUP / USABILITY_TEST / CARD_SORT (planned)
- `StudyStatus`: DRAFT → ACTIVE → COMPLETED → ARCHIVED
- `SessionStatus`: PENDING → RUNNING → COMPLETED | FAILED
- `OrgRole`: OWNER / ADMIN / MEMBER / VIEWER

---

## 9. Feature Status

### Implemented ✅

- Multi-tenant Auth (Supabase, invitation system, roles)
- Persona Groups + 6 creation methods (AI Generate, Deep Search, LinkedIn PDF, Company URL, Manual, Templates)
- Persona profiles with 5-layer framework (Identity, Psychology, Behavior, Communication, Research)
- Study creation (multi-step form, AI Quick-Setup)
- Single Interview (manual, streaming)
- Batch Interviews (Inngest background jobs, 3-parallel batches)
- AI Insights generation (Themes, Quotes, Sentiments, Recommendations)
- Results Dashboard (`/studies/[id]/results`)
- CSV Export
- AI Assistant Sidebar (chat with platform context)
- Admin Panel
- Workspace Settings with AI Product Context

### Planned / Not Yet Built ⏳

- **Study Types:** SURVEY, FOCUS_GROUP, USABILITY_TEST, CARD_SORT (only INTERVIEW is live)
- **Curated Persona Library** (1M+ precomputed personas, semantic search via pgvector)
- **Automatic Data Pipeline** (Tavily scraping → DomainKnowledge → Persona RAG, currently manual)
- **Persona Framework v1.1** (fields: `adoptionCurvePosition`, `incomeBracket`, `confidenceScore`, etc. — design in `docs/PERSONA-FRAMEWORK.md`)
- **pgvector Semantic Search** (embedding fields exist but are not yet used)
- **Transcript Analytics** (compare page `/studies/[id]/compare` is rudimentary)
- **Survey Flow** (UI for survey-type studies)

---

## 10. Key Files — What to Read for Each Task

| Task | Files to read |
|---|---|
| Understand auth | `src/lib/auth.ts`, `src/lib/supabase/`, `src/app/(auth)/actions.ts` |
| Modify persona generation | `src/lib/ai/generate-personas.ts`, `src/lib/validation/schemas.ts` |
| Add new study type | `prisma/schema.prisma`, `src/app/(dashboard)/studies/new/`, `src/components/studies/steps/` |
| Modify interview logic | `src/lib/inngest/functions/run-batch-interview.ts`, `src/app/api/chat/route.ts` |
| Modify insights logic | `src/lib/inngest/functions/generate-insights.ts` |
| Change UI/Layout | `src/components/layout/sidebar.tsx`, `src/app/(dashboard)/layout.tsx`, `src/app/globals.css` |
| New API route | Pattern from `src/app/api/personas/extract-url/route.ts` |
| New Inngest function | Pattern from `src/lib/inngest/functions/run-batch-interview.ts` |
| DB queries | `src/lib/db/queries/` (studies.ts, personas.ts, chat.ts) |
| Switch LLM provider | `src/lib/ai/provider.ts`, `.env.local` (`LLM_PROVIDER` + key) |
| Landing Page | Separate repo: `GoTofu-Agile/LandingPage` (not in this repo) |
| Deployment | `VERCEL-SETUP.md` |
| Frontend/UI guidelines | `FRONTEND-HANDOFF.md` |
| Persona Framework design | `docs/PERSONA-FRAMEWORK.md` |
| Architecture deep-dive | `docs/ENGINEERING-VISION.md` |

---

## 11. Do NOT Touch Without Asking Daniel

- **`prisma/schema.prisma`** — breaking changes affect production data
- **`src/lib/supabase/`** — auth middleware, very sensitive
- **`apps/landing/`** — local directory, NOT used for production. The live landing page comes from the separate repo `GoTofu-Agile/LandingPage`
- **Environment Variables** in `.env.local` for production — Vercel secrets go through Dashboard or CLI
- **Vercel Nameservers / DNS** — Hostinger → Vercel, any change could bring the domain down

---

## 12. Development Workflow

### Branch-Based Workflow (since 2026-03-18)

**Golden rule:** Never push directly to `main`. Use feature branches.

```bash
# 1. Start from fresh main
git checkout main && git pull origin main

# 2. Create new branch
git checkout -b feat/my-feature

# 3. Commit changes
git add <files> && git commit -m "feat: description"

# 4. Push branch + open PR
git push -u origin feat/my-feature
gh pr create --title "feat: description" --body "What and why"

# 5. Wait for CI (lint + build), test Vercel Preview URL
# 6. Merge PR → Production deploy to app.gotofu.io
```

### What Happens Automatically

| Event | Action |
|---|---|
| Open PR to `main` | GitHub Actions CI: `npm run lint` + `npm run build` |
| Open PR to `main` | Vercel creates Preview Deployment with unique URL |
| Merge PR → `main` | Vercel deploys to `app.gotofu.io` (Production) |

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every PR to `main`:
1. `npm ci` — install dependencies
2. `npx prisma generate` — generate Prisma Client
3. `npm run lint` — ESLint
4. `npm run build` — Next.js Build (TypeScript errors are caught here)

### Branch Protection

Branch Protection Rules require GitHub Pro (private repo). While on Free tier: CI + Vercel Previews as safety net, discipline with merges. On upgrade to Pro: enable Branch Protection on `main` (Require PR, Require CI pass).

---

## 13. Open TODOs / Known Issues

1. **Persona Framework v1.1 not yet implemented** — Schema extensions (`adoptionCurvePosition`, `incomeBracket`, etc.) are fully specified in `docs/PERSONA-FRAMEWORK.md` but not yet deployed. Requires Prisma migration.

2. **Vercel Build Isolation** (Ignored Build Step) not yet set — every push deploys both projects even if only one changed. To set in Vercel Project Settings → Git → Ignored Build Step. Commands in `VERCEL-SETUP.md`.

3. ~~**Old Vercel projects**~~ ✅ DONE — `gotofu`, `tofu`, `tofu-u2t4` deleted (2026-03-18).

4. ~~**Old Vercel project**~~ ✅ DONE — old projects cleaned up.

5. **pgvector not used** — `embedding` fields on `Persona` and `DomainKnowledge` exist, but semantic search is not yet implemented.

6. ~~**Inngest Webhook URL**~~ ✅ DONE (2026-03-18) — Inngest connected via Vercel Integration, auto-sync on every deploy. App: `https://app.gotofu.io/api/inngest`, Functions: `run-batch-interview`, `generate-insights`.

7. **`www.gotofu.io`** is registered in the `gotofu-landing` project as redirect to `gotofu.io` but not yet verified.

8. ~~**Batch interview parallelization**~~ ✅ DONE (2026-03-18) — Interviews now run in parallel batches of 3 via `Promise.all` + `step.run()`. ~3x faster.

9. ~~**Development workflow**~~ ✅ DONE (2026-03-18) — Branch-based workflow with GitHub Actions CI established. See Section 12.

10. ~~**Login feedback improvement**~~ ✅ DONE (2026-03-18) — Fullscreen loading overlay on Login/Signup + Dashboard `loading.tsx`.

---

## 14. Debugging Checklist

If something isn't working:

**Login not working:**
1. **Check env vars:** `vercel env pull` and look for trailing `\n` — most common cause!
2. Supabase Auth Redirect URLs — contains `https://app.gotofu.io/callback`?
3. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly?
4. Vercel deployment successful? (Vercel Dashboard → Deployments)

**Batch interview not starting:**
1. Inngest Dashboard — event received?
2. `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` set?
3. `https://app.gotofu.io/api/inngest` registered as webhook in Inngest?

**Personas not generating:**
1. `OPENAI_API_KEY` valid?
2. `LLM_PROVIDER=openai` set?
3. Browser DevTools Network → check `/api/personas/generate` response

**Build failing (Prisma):**
→ `build` script in `package.json` must be `prisma generate && next build`

**Build failing (TypeScript JSON fields):**
→ Prisma JSON fields need double cast: `(value as unknown as MyType[])`

**Landing Page Sign-In points to localhost:**
→ Set `NEXT_PUBLIC_APP_URL` in `gotofu-landing` env vars to `https://app.gotofu.io`, then redeploy
