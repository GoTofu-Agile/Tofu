# GoTofu — Agent Handover Document

> **Lies dieses Dokument zuerst.** Es ist der einzige Einstiegspunkt den du brauchst.
> Stand: 18.03.2026

---

## 1. Was ist GoTofu?

GoTofu ist eine **B2B SaaS Plattform für synthetische Nutzerforschung**. Kunden erstellen KI-generierte Personas aus echten Daten (Web Research, Reviews, Foren), führen damit simulierte Interviews und Surveys durch und erhalten automatisch ausgewertete Insights — als schneller, günstiger Ersatz oder Vorbereitung für echte Nutzerforschung.

**Founder:** Daniel Kourie (daniel.kourie@code.berlin) — CODE Berlin Student, nicht-technisch, produktfokussiert.

**Aktueller Status:** Production deployed, erste Kunden aktiv. Platform funktioniert end-to-end: Personas erstellen → Study aufsetzen → Batch-Interviews laufen lassen → Results Dashboard anschauen.

---

## 2. Deployment — Was läuft wo

### Live-Umgebungen

| URL | Zweck | Vercel Projekt |
|---|---|---|
| `https://gotofu.io` | Landing Page | `gotofu-landing` |
| `https://app.gotofu.io` | App (Login, Dashboard, Studies, Personas) | `gotofu-app` |

### Infrastruktur

| Service | Details |
|---|---|
| **Vercel** | Team: `gotofus-projects`, Account: `admin-42578282` |
| **GitHub** | App: `github.com/habibidani/gotofu` (privat), Landing: `github.com/GoTofu-Agile/LandingPage` (privat) |
| **Supabase** | Projekt: `SyntheticTofu`, URL: `https://cgkgolnccyuqjlvcazov.supabase.co` |
| **Inngest** | Background Jobs (Batch-Interviews, Insights-Generierung) |
| **OpenAI** | Standard LLM Provider (`gpt-4o`), aber austauschbar |
| **Tavily** | Web Research für Persona-Datenbeschaffung |
| **Zoho Mail** | `admin@gotofu.io` — Vercel Account Login, Team-Kommunikation |
| **Domain-Registrar** | Hostinger — Nameservers auf Vercel delegiert, DNS bei Vercel (MX für Zoho, SPF) |

### Repo-Architektur (Zwei Repos)

```
habibidani/gotofu (GitHub)         → gotofu-app (app.gotofu.io)
GoTofu-Agile/LandingPage (GitHub)  → gotofu-landing (gotofu.io)
```

Jedes Repo deployt unabhängig auf sein Vercel-Projekt. Push auf `main` → automatisches Deployment.

**Hinweis:** Das lokale Verzeichnis `apps/landing/` existiert noch, wird aber NICHT für das Vercel `gotofu-landing` Projekt genutzt. Die Landing Page kommt aus dem separaten Repo `GoTofu-Agile/LandingPage`.

Details: siehe `VERCEL-SETUP.md`

---

## 3. Lokal starten

```bash
# Repo klonen
git clone https://github.com/habibidani/gotofu.git
cd gotofu

# Dependencies
npm install

# .env.local anlegen (Werte von Daniel holen)
cp .env.example .env.local
# → DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, etc. eintragen

# WICHTIG: Prisma braucht .env (nicht .env.local)
cp .env.local .env

# Prisma Client generieren
npx prisma generate

# App starten (Port 3004)
npm run dev

# Landing Page starten (Port 3005, separates Fenster)
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
TAVILY_API_KEY=...                      # Optional — ohne: keine Web Research
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3004
GOTOFU_ADMIN_EMAILS=daniel.kourie@code.berlin
```

---

## 4. Tech Stack & Gotchas

| Layer | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| Runtime | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Database ORM | Prisma | 5.22.0 |
| Database | PostgreSQL (Supabase) | — |
| Auth | Supabase Auth | via `@supabase/ssr` |
| LLM | Vercel AI SDK | 6.x (LLM-agnostic) |
| Background Jobs | Inngest | 3.52.6 |
| UI Components | shadcn/ui v4 (**base-ui**, nicht Radix) | 4.x |
| Styling | Tailwind CSS | 4.x |
| Icons | Lucide React | 0.577.0 |
| Validation | Zod | 4.x |
| HTTP Client | TanStack Query | 5.x |
| Toasts | Sonner | 2.x |
| Web Research | Tavily SDK | 0.7.x |

### Kritische Gotchas (Dinge die Agents immer wieder falsch machen)

1. **shadcn/ui v4 nutzt base-ui, NICHT Radix** — kein `asChild` Prop. Wenn du `asChild` schreibst, gibt es keinen Compile-Fehler aber das Rendering bricht.

2. **Zod v4: `error.issues` nicht `error.errors`** — `error.errors` existiert nicht mehr.

3. **Port 3004** (nicht 3000) — in `package.json` konfiguriert.

4. **Beide `.env` Dateien nötig** — `.env.local` für Next.js Runtime, `.env` für Prisma CLI. Beide müssen `DATABASE_URL` enthalten.

5. **Prisma v5 auf Node 20.11.1** — NICHT auf Prisma v6 updaten, das erfordert Node 20.19+.

6. **`pdf-parse` muss mit `require()` importiert werden** — ESM Import wirft `Property 'default'` Fehler.

7. **Tailwind CSS v4: kein `tailwind.config.js`** — alle CSS-Variablen in `src/app/globals.css`.

8. **Next.js 16 Middleware Warning** — `"middleware" file convention is deprecated` in Build-Logs ist ein Warning, kein Fehler. Funktioniert noch.

9. **`DropdownMenuLabel` muss in `DropdownMenuGroup`** — base-ui Requirement.

10. **Multi-Tenant** — JEDE DB-Query und API-Route muss `organizationId` prüfen. Immer über `requireAuthWithOrgs()` (`src/lib/auth.ts`) authentifizieren.

11. **Vercel Env Vars: Trailing Newlines** — Beim Setzen via CLI **immer** `printf '%s' "value" | vercel env add` statt `echo`. `echo` fügt ein `\n` am Ende an, das unsichtbar API-Keys, DB-URLs etc. kaputt macht. Wurde am 18.03.2026 für alle 12 Vars gefixt.

12. **DATABASE_URL: Transaction Pooler (Port 6543)** — Supabase bietet Session Pooler (5432) und Transaction Pooler (6543). Serverless (Vercel) **muss** Transaction Pooler nutzen: `...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10`. Session Pooler hat zu niedriges Connection-Limit → `MaxClientsInSessionMode` Error.

---

## 5. Repo-Struktur

```
/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, Signup, OAuth Callback
│   │   ├── (dashboard)/     # Alle geschützten Seiten
│   │   │   ├── dashboard/   # Home
│   │   │   ├── personas/    # Persona Groups + einzelne Personas
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
│   └── schema.prisma        # Vollständiges Datenmodell
├── apps/
│   └── landing/             # Separate Next.js App (gotofu.io)
├── docs/
│   ├── AGENT-HANDOVER.md    # Dieses Dokument
│   ├── ENGINEERING-VISION.md # Architektur Deep-Dive
│   └── PERSONA-FRAMEWORK.md # Persona Framework Design Doc
├── VERCEL-SETUP.md          # Deployment Details + Troubleshooting
└── FRONTEND-HANDOFF.md      # UI/UX Richtlinien für Frontend-Agents
```

---

## 6. Vollständige Route-Map

### Auth (public)
| Route | Zweck |
|---|---|
| `/login` | Email/Password + OAuth Login |
| `/signup` | Registrierung |
| `/callback` | OAuth Redirect Handler |
| `/accept-invite/[token]` | Team-Einladung annehmen |

### Dashboard (geschützt — erfordert Auth + Org)
| Route | Zweck |
|---|---|
| `/dashboard` | Home — Feature-Übersicht + Onboarding Checklist |
| `/personas` | Persona Groups Grid |
| `/personas/new` | Neuen Persona Group erstellen (6 Methoden) |
| `/personas/[groupId]` | Group-Detail + Persona Cards |
| `/personas/[groupId]/[personaId]` | Vollständiges Persona-Profil |
| `/studies` | Studies Listing |
| `/studies/new` | Study erstellen (multi-step Form) |
| `/studies/[studyId]` | Study Detail + Session Management |
| `/studies/[studyId]/results` | Results Dashboard (Themes, Quotes, Recs) |
| `/studies/[studyId]/compare` | Cross-Session Vergleich |
| `/studies/[studyId]/[sessionId]` | Interview-Transcript |
| `/settings` | Workspace Settings + AI Product Context |
| `/settings/members` | Team Management + Einladungen |
| `/uploads` | File Upload Manager |
| `/admin` | Admin Panel (nur `GOTOFU_ADMIN_EMAILS`) |

### API Routes
| Route | Zweck |
|---|---|
| `POST /api/inngest` | Inngest Webhook Endpoint |
| `POST /api/chat` | Streaming Single-Interview Chat |
| `POST /api/personas/generate` | NDJSON Streaming Persona Generation |
| `POST /api/personas/extract` | Freetext → strukturierter Kontext |
| `POST /api/personas/extract-pdf` | LinkedIn PDF → Kontext |
| `POST /api/personas/extract-url` | Company URL → Tavily Research → Kontext |
| `POST /api/studies/setup` | AI Quick-Setup (Freetext → Study-Felder) |
| `POST /api/studies/generate-guide` | Interview Guide generieren |
| `POST /api/studies/[studyId]/run-batch` | Batch-Interviews starten (→ Inngest) |
| `GET /api/studies/[studyId]/status` | Batch-Fortschritt polling |
| `GET /api/studies/[studyId]/export` | CSV Transcript Export |
| `POST /api/research` | Streaming Web Research (Tavily) |
| `POST /api/assistant` | AI Assistant Chat |
| `GET /api/assistant/history` | Chat-History Liste |

---

## 7. Schlüssel-Workflows

### Workflow 1: Personas erstellen (AI-Generate Methode)

```
1. /personas/new → Methode wählen (AI Generate)
2. Context eingeben (optional: Tavily URL-Research)
3. POST /api/personas/generate → NDJSON Stream
   → src/lib/ai/generate-personas.ts
   → buildPrompt() → 5-Layer Prompt (Identity, Psychology, Behavior, Communication, Research)
   → RAG: DomainKnowledge-Embedding-Lookup (pgvector)
   → Anti-Sycophancy: ~30% Skeptiker-Typen
   → qualityScore: 22-Punkte-System
4. Persona-Cards erscheinen streaming
5. Speichern → Prisma Persona + PersonalityProfile
```

### Workflow 2: Study + Batch-Interview

```
1. /studies/new → Multi-Step Form
   → Study Type, Research Objectives, Interview Guide
   → Persona Groups zuweisen + Sample Size
2. /studies/[id] → "Run Batch Interviews" Button
3. POST /api/studies/[id]/run-batch
   → Inngest Event: study/run-batch
4. src/lib/inngest/functions/run-batch-interview.ts
   → Für jede Persona: Session erstellen
   → 5-8 Gesprächs-Turns (LLM als Interviewer + LLM als Persona)
   → Session → COMPLETED
   → Study → COMPLETED
   → Inngest Event: study/generate-insights
5. src/lib/inngest/functions/generate-insights.ts
   → Alle Transkripte laden
   → LLM generateObject → insightsSchema
   → AnalysisReport in DB speichern
6. /studies/[id]/results → Results Dashboard
```

### Workflow 3: Auth Flow

```
Login/Signup → Supabase Auth
→ /callback (OAuth) oder direkt
→ src/middleware.ts → updateSession() auf jeder Request
→ requireAuthWithOrgs() prüft: User existiert + hat Org
→ Falls keine Org: Onboarding
→ Dashboard Layout liest activeOrgId aus Cookie
```

---

## 8. Datenmodell (Überblick)

Vollständiges Schema in `prisma/schema.prisma`. Kernmodelle:

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
- `StudyType`: INTERVIEW (live), SURVEY / FOCUS_GROUP / USABILITY_TEST / CARD_SORT (geplant)
- `StudyStatus`: DRAFT → ACTIVE → COMPLETED → ARCHIVED
- `SessionStatus`: PENDING → RUNNING → COMPLETED | FAILED
- `OrgRole`: OWNER / ADMIN / MEMBER / VIEWER

---

## 9. Feature-Status

### Implementiert ✅

- Multi-Tenant Auth (Supabase, Einladungs-System, Rollen)
- Persona Groups + 6 Erstellungsmethoden (AI Generate, Deep Search, LinkedIn PDF, Company URL, Manual, Templates)
- Persona-Profile mit 5-Layer Framework (Identity, Psychology, Behavior, Communication, Research)
- Study-Erstellung (multi-step Form, AI Quick-Setup)
- Single-Interview (manuell, Streaming)
- Batch-Interviews (Inngest Background Jobs)
- AI Insights-Generierung (Themes, Quotes, Sentiments, Recommendations)
- Results Dashboard (`/studies/[id]/results`)
- CSV Export
- AI Assistant Sidebar (Chat mit Plattform-Kontext)
- Admin Panel
- Workspace-Settings mit AI Product Context

### Geplant / Noch nicht gebaut ⏳

- **Study Types:** SURVEY, FOCUS_GROUP, USABILITY_TEST, CARD_SORT (nur INTERVIEW ist live)
- **Kuratierte Persona Library** (1M+ vorberechnete Personas, Semantic Search via pgvector)
- **Automatische Datenpipeline** (Tavily scraping → DomainKnowledge → Persona RAG, aktuell manuell)
- **Persona Framework v1.1** (Felder: `adoptionCurvePosition`, `incomeBracket`, `confidenceScore`, etc. — Design in `AGENT-HANDOVER-PERSONA-FRAMEWORK.md`)
- **pgvector Semantic Search** (Embedding-Felder existieren, werden aber noch nicht genutzt)
- **Transcript Analytics** (Compare-Seite `/studies/[id]/compare` rudimentär)
- **Survey-Flow** (UI für Survey-Type-Studies)

---

## 10. Key Files — Was du für welche Aufgabe lesen musst

| Aufgabe | Dateien lesen |
|---|---|
| Auth verstehen | `src/lib/auth.ts`, `src/lib/supabase/`, `src/app/(auth)/actions.ts` |
| Persona-Generierung ändern | `src/lib/ai/generate-personas.ts`, `src/lib/validation/schemas.ts` |
| Neuen Study-Type hinzufügen | `prisma/schema.prisma`, `src/app/(dashboard)/studies/new/`, `src/components/studies/steps/` |
| Interview-Logik ändern | `src/lib/inngest/functions/run-batch-interview.ts`, `src/app/api/chat/route.ts` |
| Insights-Logik ändern | `src/lib/inngest/functions/generate-insights.ts` |
| UI/Layout ändern | `src/components/layout/sidebar.tsx`, `src/app/(dashboard)/layout.tsx`, `src/app/globals.css` |
| Neue API-Route | Muster aus `src/app/api/personas/extract-url/route.ts` |
| Neue Inngest-Funktion | Muster aus `src/lib/inngest/functions/run-batch-interview.ts` |
| DB-Queries | `src/lib/db/queries/` (studies.ts, personas.ts, chat.ts) |
| LLM-Provider wechseln | `src/lib/ai/provider.ts`, `.env.local` (`LLM_PROVIDER` + Key) |
| Landing Page | Separates Repo: `GoTofu-Agile/LandingPage` (nicht in diesem Repo) |
| Deployment | `VERCEL-SETUP.md` |
| Frontend/UI Guidelines | `FRONTEND-HANDOFF.md` |
| Persona Framework Design | `docs/PERSONA-FRAMEWORK.md` |
| Architektur Deep-Dive | `docs/ENGINEERING-VISION.md` |

---

## 11. Was du NICHT anfassen sollst

- **`prisma/schema.prisma`** ohne Daniel zu fragen — Breaking Changes betreffen Produktionsdaten
- **`src/lib/supabase/`** — Auth-Middleware, sehr sensibel
- **`apps/landing/`** — lokales Verzeichnis, wird NICHT für Production genutzt. Die Live-Landing-Page kommt aus dem separaten Repo `GoTofu-Agile/LandingPage`
- **Environment Variables** in `.env.local` für Produktion — Vercel-Secrets gehen über Dashboard oder CLI
- **Vercel Nameserver / DNS** — Hostinger → Vercel, jede Änderung könnte Domain down bringen

---

## 12. Development-Workflow

### Branch-basiertes Arbeiten (seit 18.03.2026)

**Grundregel:** Nicht direkt auf `main` pushen. Feature-Branches nutzen.

```bash
# 1. Neuen Branch erstellen
git checkout -b feat/mein-feature

# 2. Änderungen committen
git add -A && git commit -m "feat: beschreibung"

# 3. Branch pushen + PR öffnen
git push -u origin feat/mein-feature
gh pr create --title "feat: beschreibung" --body "Was und warum"

# 4. CI abwarten (lint + build), Vercel Preview URL testen
# 5. PR mergen → Production Deploy auf app.gotofu.io
```

### Was passiert automatisch

| Event | Aktion |
|---|---|
| PR auf `main` öffnen | GitHub Actions CI: `npm run lint` + `npm run build` |
| PR auf `main` öffnen | Vercel erstellt Preview Deployment mit eigener URL |
| PR mergen → `main` | Vercel deployt auf `app.gotofu.io` (Production) |

### CI-Pipeline (`.github/workflows/ci.yml`)

Läuft bei jedem PR auf `main`:
1. `npm ci` — Dependencies installieren
2. `npx prisma generate` — Prisma Client generieren
3. `npm run lint` — ESLint
4. `npm run build` — Next.js Build (TypeScript-Fehler werden hier gefunden)

### Branch Protection

Branch Protection Rules erfordern GitHub Pro (privates Repo). Solange wir auf Free-Tier sind: CI + Vercel Previews als Safety Net, Disziplin bei Merges. Bei Upgrade auf Pro: Branch Protection auf `main` aktivieren (Require PR, Require CI pass).

---

## 13. Offene TODOs / Bekannte Issues

1. **Persona Framework v1.1 noch nicht implementiert** — Schema-Erweiterungen (`adoptionCurvePosition`, `incomeBracket`, etc.) sind in `docs/AGENT-HANDOVER-PERSONA-FRAMEWORK.md` vollständig spezifiziert aber noch nicht deployed. Benötigt Prisma Migration.

2. **Vercel Build-Isolation** (Ignored Build Step) noch nicht gesetzt — jeder Push deployt beide Projekte, auch wenn nur eines sich geändert hat. Zu setzen in Vercel Projekt-Settings → Git → Ignored Build Step. Befehle in `VERCEL-SETUP.md`.

3. ~~**Alte Vercel-Projekte**~~ ✅ ERLEDIGT — `gotofu`, `tofu`, `tofu-u2t4` wurden gelöscht (18.03.2026).

4. ~~**Altes Vercel Projekt**~~ ✅ ERLEDIGT — alte Projekte bereinigt.

5. **pgvector nicht genutzt** — `embedding` Felder auf `Persona` und `DomainKnowledge` existieren, aber Semantic Search ist noch nicht implementiert.

6. ~~**Inngest Webhook URL**~~ ✅ ERLEDIGT (18.03.2026) — Inngest via Vercel Integration verbunden, Auto-Sync bei jedem Deploy. App: `https://app.gotofu.io/api/inngest`, Functions: `run-batch-interview`, `generate-insights`.

7. **`www.gotofu.io`** ist im `gotofu-landing` Projekt als Redirect zu `gotofu.io` eingetragen aber noch nicht verifiziert.

8. ~~**Batch-Interview-Parallelisierung**~~ ✅ ERLEDIGT (18.03.2026) — Interviews laufen jetzt in 3er-Batches parallel via `Promise.all` + `step.run()`. ~3x schneller.

9. ~~**Development-Workflow**~~ ✅ ERLEDIGT (18.03.2026) — Branch-basierter Workflow mit GitHub Actions CI eingerichtet. Siehe Abschnitt 12.

10. ~~**Login-Feedback verbessern**~~ ✅ ERLEDIGT (18.03.2026) — Fullscreen Loading Overlay auf Login/Signup + Dashboard `loading.tsx`.

---

## 14. Debugging-Checkliste

Falls etwas nicht funktioniert:

**Login geht nicht:**
1. **Env Vars prüfen:** `vercel env pull` und nach trailing `\n` suchen — häufigste Ursache!
2. Supabase Auth Redirect URLs — enthält `https://app.gotofu.io/callback`?
3. `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` korrekt gesetzt?
4. Vercel Deployment erfolgreich? (Vercel Dashboard → Deployments)

**Batch-Interview startet nicht:**
1. Inngest Dashboard — Event angekommen?
2. `INNGEST_EVENT_KEY` und `INNGEST_SIGNING_KEY` gesetzt?
3. `https://app.gotofu.io/api/inngest` als Webhook in Inngest eingetragen?

**Personas werden nicht generiert:**
1. `OPENAI_API_KEY` gültig?
2. `LLM_PROVIDER=openai` gesetzt?
3. Browser DevTools Network → `/api/personas/generate` Response ansehen

**Build schlägt fehl (Prisma):**
→ `build` Script in `package.json` muss `prisma generate && next build` sein

**Build schlägt fehl (TypeScript JSON-Felder):**
→ Prisma JSON-Felder brauchen doppelten Cast: `(value as unknown as MyType[])`

**Landing Page Sign-In zeigt auf localhost:**
→ `NEXT_PUBLIC_APP_URL` in `gotofu-landing` Env Vars auf `https://app.gotofu.io` setzen, dann redeploy
