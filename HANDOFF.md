# GoTofu — Agent Handoff Prompt

Kopiere alles unterhalb in den naechsten Agent-Chat.

---

## Projekt

**GoTofu** — SaaS-Plattform fuer synthetische User-Interviews. Kunden erstellen Organisationen, beschreiben ihr Produkt per AI-Chat, generieren datenbasierte Personas und fuehren damit Studies durch (Interviews, Surveys, Focus Groups).

**Repo-Pfad:** `/Users/danielkourie/My Drive (daniel.kourie@code.berlin)/projects/SyntheticUserPlatform`
**GitHub:** `https://github.com/habibidani/gotofu` (private)

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Supabase** (PostgreSQL + Auth) — Projekt-ID: `cgkgolnccyuqjlvcazov`
- **Prisma v5** ORM (v5.22.0 — Node 20.11.1, Prisma v6+ braucht Node 20.19+)
- **Vercel AI SDK** — LLM-agnostisch (OpenAI/Claude/Gemini via `LLM_PROVIDER` env)
- **Tavily SDK** — Web-Research (Reddit, Foren, App Store Reviews)
- **shadcn/ui v4** (base-ui statt Radix — KEIN `asChild` prop)
- **Tailwind CSS v4**, **Zod v4** (`issues` statt `errors`)

## Was fertig ist

### Sprint 1: Foundation ✅
- Supabase Auth (Signup, Login, OAuth Callback) + Session-Middleware
- Prisma Schema (20+ Models) — pushed zu Supabase
- Org-Management (CRUD, Invitations, Member Roles)
- Dashboard Layout (Sidebar + Topbar + OrgSwitcher)
- Personal Workspace auto-erstellt bei Signup (idempotent)
- LLM Provider Switch mit API-Key Validation
- Error Boundaries, Settings (Workspace umbenennen/erstellen)

### Sprint 2: Persona Creation ✅
- **Multi-Method Creation Page** (`/personas/new`) mit 3 aktiven Methoden:
  - **Quick Prompt** — Ein Satz, AI + Auto-Research erledigt den Rest
  - **Web Research** — Produktdetails → Tavily durchsucht Reddit/Foren/Reviews → Generate
  - **Manual + AI** — Rolle, Branche, Pain Points → AI ergaenzt Personality & Backstory
  - **Templates** — Placeholder (Coming soon)
- **Data-First**: Alle Methoden scrapen automatisch via Tavily bevor Personas generiert werden
- **AI-powered Org Setup Chat** (Settings → Product Context):
  - User beschreibt Produkt im Fliesstext → AI extrahiert structurierte Felder
  - Follow-up Fragen wenn Info fehlt → gespeichert auf Org-Level
  - Pre-fills Web Research Form, enriched Quick Prompt + Manual Kontext
- Streaming Persona Generation mit Progress Bar
- Persona Detail View (Big Five, Archetype, Interview Modifiers, 60+ Felder)
- Data Provenance: DomainKnowledge trackt Quellen, PersonaDataSource verlinkt Personas zu Daten

### Sprint 3: Study & Interview System ✅
- Study Creation (Typ, Titel, Interview Guide, Persona-Gruppen zuweisen)
- Multi-turn Streaming Chat mit Persona (nutzt `llmSystemPrompt`)
- Persona bleibt in-character (Big Five, Communication Style, Directness)
- Session Transcript Viewer
- Message Persistence (Interviewer + Respondent)

## Alle Routes

### Pages
| Route | Zweck |
|-------|-------|
| `/` | Landing Page |
| `/login`, `/signup` | Auth |
| `/callback` | OAuth Callback |
| `/dashboard` | Dashboard mit Stats |
| `/personas` | Persona Groups Grid |
| `/personas/new` | Multi-Method Creation Flow |
| `/personas/[groupId]` | Group Detail + Persona Cards |
| `/personas/[groupId]/[personaId]` | Persona Profil (Big Five, Backstory, etc.) |
| `/studies` | Studies Liste |
| `/studies/new` | Study erstellen |
| `/studies/[studyId]` | Study Detail + Sessions |
| `/studies/[studyId]/[sessionId]` | Interview Chat |
| `/settings` | Workspace Settings + Product Context Chat |
| `/settings/members` | Member Management |
| `/uploads` | Upload Manager (Placeholder) |

### API Routes
| Route | Zweck |
|-------|-------|
| `POST /api/chat` | Multi-turn Interview Streaming |
| `POST /api/org/setup` | AI Org Setup (Fliesstext → strukturierte Felder) |
| `POST /api/personas/generate` | Streaming Persona Generation |
| `POST /api/research` | Tavily Web Research (Streaming NDJSON) |
| `POST /api/research/quick` | Quick Auto-Research (1-2 Queries) |

## Wichtige Dateien

| Datei | Zweck |
|-------|-------|
| `prisma/schema.prisma` | DB Schema (20+ Models) |
| `src/lib/auth.ts` | `requireAuth()`, `requireAuthWithOrgs()`, `getActiveOrgId()` |
| `src/lib/ai/provider.ts` | `getModel()` — LLM Provider Switch |
| `src/lib/ai/generate-personas.ts` | Persona Generation (RAG, Anti-Sycophancy, Streaming) |
| `src/lib/research/tavily.ts` | Tavily Client, `quickResearch()`, `buildAutoQueries()` |
| `src/lib/research/build-queries.ts` | Product Info → Tavily Search Queries |
| `src/lib/db/queries/personas.ts` | Persona CRUD |
| `src/lib/db/queries/organizations.ts` | Org Management + `getOrgProductContext()` |
| `src/lib/db/queries/studies.ts` | Study + Session Queries |
| `src/lib/validation/schemas.ts` | Zod Schemas (persona, quickPrompt, manualForm, etc.) |
| `src/components/personas/creation/` | Multi-Method Creation Flow (7 Components) |
| `src/components/org/org-setup-chat.tsx` | AI Org Setup Chat |
| `src/components/studies/` | Interview Chat, Study Forms |
| `src/components/layout/` | Sidebar, Topbar, OrgSwitcher |

## Dev-Setup

```bash
cd "/Users/danielkourie/My Drive (daniel.kourie@code.berlin)/projects/SyntheticUserPlatform"
npm run dev          # Port 3004
npx prisma db push   # Schema zu Supabase (liest .env)
npx prisma generate  # Client regenerieren
npx next build       # Build verifizieren
```

## .env Setup

Beide Dateien (`.env` und `.env.local`) mit denselben Werten fuellen:
- `.env.local` → Next.js Runtime
- `.env` → Prisma CLI (`prisma db push`, `prisma generate`)

Siehe `.env.example` fuer alle Variablen.

## Naechste Schritte

### Sprint 4: Template Marketplace & Admin Tool
- Internes Admin Panel (GoTofu Team Org = Platform Admin)
- Templates erstellen, kuratieren, publishen
- Visibility: Public / bestimmte Orgs / bestimmte User
- User-Facing Template Gallery + Clone-Logik

### Sprint 5-6: Uploads, Analysis, Scale
- CSV/PDF Upload → Personas
- Theme Extraction, Sentiment Analysis
- Billing, Monitoring, Performance

## Gotchas

- **shadcn/ui v4**: Kein `asChild` prop — base-ui statt Radix
- **Prisma v5**: Wegen Node 20.11.1 — NICHT v6+ upgraden
- **Zod v4**: `error.issues` statt `error.errors`
- **Next.js 16**: `middleware.ts` deprecated (Warning, funktioniert)
- **Port 3004**: In `package.json` konfiguriert
- **`.env` vs `.env.local`**: Beide brauchen `DATABASE_URL`
- **Tavily optional**: Ohne Key werden Personas nur prompt-basiert generiert
- **Organization hat Product Context**: productName, productDescription, targetAudience, industry, competitors — wird von Persona Creation automatisch genutzt
