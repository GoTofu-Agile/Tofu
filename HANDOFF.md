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
- **6-Method Picker** (`/personas/new`) — Karten-Grid mit Source-Labels:
  - **Templates** — Coming Soon (disabled)
  - **Manual** → Formular → StepReview → Generate direkt (kein Research) → `UPLOAD_BASED`
  - **AI Generate** → Freitext-Prompt → Extract → StepReview → Generate ohne Tavily → `PROMPT_GENERATED`
  - **LinkedIn PDF** → PDF-Upload → `/api/personas/extract-pdf` → StepReview → optional Sources → `UPLOAD_BASED`
  - **Company URL** → URL-Input → `/api/personas/extract-url` (Tavily scrape) → StepReview → optional Sources → `UPLOAD_BASED`
  - **Deep Search** → Freitext → Extract → StepReview → StepSources (Tavily) → Generate → `DATA_BASED`
- **Source Labels**: Personas tragen Labels "Prompted" / "Data Backed" / "Own Data" (Badge auf Group-Cards)
- `sourceTypeOverride` kann bei Generation übergeben werden (`PROMPT_GENERATED` | `DATA_BASED` | `UPLOAD_BASED`)
- **AI-powered Org Setup Chat** (Settings → Product Context):
  - User beschreibt Produkt im Fliesstext → AI extrahiert structurierte Felder
  - Follow-up Fragen wenn Info fehlt → gespeichert auf Org-Level
  - Pre-fills Web Research Form, enriched Quick Prompt + Manual Kontext
- Streaming Persona Generation mit Progress Bar
- Persona Detail View (Big Five, Archetype, Interview Modifiers, 60+ Felder)
- Data Provenance: DomainKnowledge trackt Quellen, PersonaDataSource verlinkt Personas zu Daten

### Sprint 3: Study & Interview System ✅
- **Study Creation UX** (`/studies/new`) — Method Picker mit 2 Pfaden:
  - **Quick Start** (volle Breite, Recommended) → Freitext eingeben → `/api/studies/setup` generiert Titel + Interview Guide + schlaegt Persona-Gruppen vor → Review (alles editierbar) → Create
  - **Interview** → Manuelles Formular (Titel, Beschreibung, Guide mit AI-Generate, Persona-Gruppen) → Create
  - **Survey** — Coming Soon (disabled, Lock Icon)
  - **Discussion** — Coming Soon (disabled, Lock Icon) — Gruppen-Diskussion zwischen Personas
- Multi-turn Streaming Chat mit Persona (nutzt `llmSystemPrompt`)
- Persona bleibt in-character (Big Five, Communication Style, Directness)
- Session Transcript Viewer
- Message Persistence (Interviewer + Respondent)

### Sprint 4: Team Onboarding & Admin ✅
- **Invite System**: Copy-Link Invites → `/accept-invite/[token]` → `acceptInvitation` (upsert, kein Crash bei Duplicate)
- **Members Page** (`/settings/members`): Member-List, Role-Change, Remove, Pending Invites, Invite-Link Generator
- **Dashboard Onboarding Checklist**: 4 Steps (workspace → product context → persona group → study)
- **Admin Panel** (`/admin`): Gated via `GOTOFU_ADMIN_EMAILS` env var — Orgs erstellen, Invite-Links generieren, Übersicht
- **Live Batch Progress**: BatchRunButton pollt `/api/studies/[id]/status` alle 3s → Progress Bar + aktueller Persona-Name
- **Insights**: Auto-generate nach Batch, InsightsPanel mit Themes/Quotes/Sentiment/Recommendations
- **CSV Export**: `/api/studies/[id]/export`
- **Session Compare**: `/studies/[id]/compare`
- **Env Var**: `GOTOFU_ADMIN_EMAILS=email1@...,email2@...` für Admin-Zugriff
- **Sidebar UX Fix**: Aktiver Workspace-Name steht jetzt prominent im Sidebar-Header (unter der kleinen "GoTofu" Brand-Zeile) — vorher war er nur unten im OrgSwitcher versteckt

### Sprint 5: Landing Page & Study UX ✅
- **Landing Page** (`/`) — Vollstaendige component-basierte Landing Page:
  - 7 Komponenten in `src/components/landing/`: Navbar, Hero, HowItWorks, Features, Roadmap, CtaSection, Footer
  - Scroll-smooth Navigation
- **Study Creation Redesign** (`/studies/new`):
  - Method Picker (wie Persona Creation) mit Quick Start + 3 Study-Type-Karten
  - AI-powered Quick Start: Freitext → automatisches Setup (Titel, Guide, Persona-Gruppen)
  - Survey + Discussion als "Coming Soon" gelabelt
  - Neuer Endpoint: `POST /api/studies/setup`

## Alle Routes

### Pages
| Route | Zweck |
|-------|-------|
| `/` | Landing Page |
| `/login`, `/signup` | Auth |
| `/callback` | OAuth Callback |
| `/dashboard` | Dashboard mit Stats + Onboarding Checklist |
| `/personas` | Persona Groups Grid |
| `/personas/new` | Multi-Method Creation Flow (6 Methoden) |
| `/personas/[groupId]` | Group Detail + Persona Cards |
| `/personas/[groupId]/[personaId]` | Persona Profil (Big Five, Backstory, etc.) |
| `/studies` | Studies Liste |
| `/studies/new` | Study erstellen (Quick Start + Method Picker) |
| `/studies/[studyId]` | Study Detail + Sessions |
| `/studies/[studyId]/[sessionId]` | Interview Chat |
| `/settings` | Workspace Settings + Product Context Chat |
| `/settings/members` | Member Management (Invite-Links, Rollen, Remove) |
| `/accept-invite/[token]` | Invite-Link Landing Page (public, auth group) |
| `/admin` | GoTofu Admin Panel (gated via GOTOFU_ADMIN_EMAILS) |
| `/uploads` | Upload Manager (Placeholder) |

### API Routes
| Route | Zweck |
|-------|-------|
| `POST /api/chat` | Multi-turn Interview Streaming |
| `POST /api/org/setup` | AI Org Setup (Fliesstext → strukturierte Felder) |
| `POST /api/personas/generate` | Streaming Persona Generation (accepts `sourceTypeOverride`) |
| `POST /api/personas/extract` | Freitext → strukturiertes ExtractedContext-Objekt |
| `POST /api/personas/extract-pdf` | LinkedIn PDF → ExtractedContext |
| `POST /api/personas/extract-url` | Company URL (Tavily scrape) → ExtractedContext |
| `POST /api/research` | Tavily Web Research (Streaming NDJSON) |
| `POST /api/research/quick` | Quick Auto-Research (1-2 Queries) |
| `GET /api/accept-invite` | Invite-Token akzeptieren + activeOrgId Cookie setzen |
| `GET /api/studies/[studyId]/status` | Batch-Interview Live Status (Polling) |
| `POST /api/studies/setup` | AI Study Setup (Freetext → Titel + Guide + Persona-Gruppen) |
| `GET /api/studies/[studyId]/export` | CSV Transcript Export |

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
| `src/lib/constants/source-labels.ts` | Source Label Badge Config (PROMPT_GENERATED / DATA_BASED / UPLOAD_BASED) |
| `src/components/personas/creation/` | Multi-Method Creation Flow (7 Components) |
| `src/components/org/org-setup-chat.tsx` | AI Org Setup Chat |
| `src/components/studies/` | Interview Chat, Study Forms, Study Creation (Quick Start + Manual) |
| `src/components/landing/` | Landing Page Components (7 Dateien: Navbar, Hero, HowItWorks, Features, Roadmap, CTA, Footer) |
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

Alle Variablen:
```
DATABASE_URL=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...        # oder ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY
LLM_PROVIDER=openai       # oder anthropic / google
TAVILY_API_KEY=...         # optional — ohne Key nur prompt-basierte Personas
GOTOFU_ADMIN_EMAILS=daniel@...,other@...   # Komma-getrennt, kein Leerzeichen
```

## Org-System & Kunden-Onboarding

**Architektur ist korrekt — Orgs bleiben.** Für 3 Startups × 6-10 Members ist das genau das Richtige.

### Wie man einen neuen Kunden onboardet:

1. **GoTofu Admin** geht zu `/admin` (Email muss in `GOTOFU_ADMIN_EMAILS` stehen)
2. Im Admin Panel: **"Create Organization"** → Name eingeben → Org wird erstellt
3. **"Generate Invite Link"** für die erstellte Org → Link kopieren
4. Link an den Kunden schicken
5. **Erster Kunde** klickt Link → Account erstellen (Signup) oder einloggen → landet in der neuen Org als Member
6. **Weitere Team-Members**: Kunde geht zu `/settings/members` → eigene Invite-Links generieren → an Kollegen schicken

### Wie Orgs funktionieren:
- Jeder User hat automatisch eine **Personal Org** (isPersonal=true) die bei Signup erstellt wird
- **Aktive Org** wird als Cookie gespeichert (`activeOrgId`) — sichtbar im Sidebar-Header
- **OrgSwitcher** (unten in der Sidebar) wechselt zwischen Workspaces
- Roles: OWNER | ADMIN | MEMBER | VIEWER
- Personas, Studies, DomainKnowledge sind alle an eine Org gebunden

### Aktuelle Sidebar-UX:
```
┌──────────────────────────┐
│ GoTofu           ← mini  │
│ Startup ABC      ← fett  │  ← aktiver Workspace-Name prominent sichtbar
├──────────────────────────┤
│ Dashboard                │
│ Personas                 │
│ Studies                  │
│ ...                      │
├──────────────────────────┤
│ [Avatar] user@email.com  │  ← OrgSwitcher zum Wechseln
└──────────────────────────┘
```

## Gotchas

- **shadcn/ui v4**: Kein `asChild` prop — base-ui statt Radix
- **Prisma v5**: Wegen Node 20.11.1 — NICHT v6+ upgraden
- **Zod v4**: `error.issues` statt `error.errors`
- **Next.js 16**: `middleware.ts` deprecated (Warning, funktioniert)
- **Port 3004**: In `package.json` konfiguriert
- **`.env` vs `.env.local`**: Beide brauchen `DATABASE_URL`
- **Tavily optional**: Ohne Key werden Personas nur prompt-basiert generiert
- **Organization hat Product Context**: productName, productDescription, targetAudience, industry, competitors — wird von Persona Creation automatisch genutzt
- **pdf-parse CJS**: Muss mit `require()` importiert werden, nicht ESM `import` — `Property 'default'` error sonst
- **Supabase Email Confirmation**: Ist DEAKTIVIERT (Authentication → Email → Confirm email → OFF) — wichtig für Invite-Flow
- **acceptInvitation**: Nutzt `upsert` (nicht `create`) um P2002-Crash zu vermeiden wenn User schon Member ist
- **activeOrgId Cookie**: Wird Client-seitig im Sidebar `useEffect` gesetzt, Server-seitig in `src/lib/auth.ts` gelesen
- **Study Types**: Nur INTERVIEW ist voll implementiert — Survey + Discussion sind im Prisma Schema aber UI-seitig "Coming Soon" (disabled)

## Naechste Schritte

### Templates Marketplace
- Template-Personas erstellen + kuratieren (GoTofu Team)
- Visibility: Public / bestimmte Orgs / bestimmte User
- User-Facing Template Gallery + Clone-Logik
- `/personas/new` → "Templates" Card (aktuell disabled, Coming Soon)

### Survey & Discussion implementieren
- Survey-Logik: Strukturierte Fragen, kein Multi-Turn Chat sondern Fragebogen-Flow
- Discussion-Logik: Mehrere Personas diskutieren untereinander ueber ein Thema
- Aktuell beides "Coming Soon" in `/studies/new`

### Sprint 6-7: Uploads, Analysis, Scale
- CSV/PDF Upload → Personas (Upload Manager bei `/uploads` ist Placeholder)
- Theme Extraction verbessern, Sentiment Analysis
- Billing, Monitoring, Performance
- Persona Quality Score Improvements

### Nice-to-haves
- Persona-Export (PDF Report)
- Org Analytics Dashboard
