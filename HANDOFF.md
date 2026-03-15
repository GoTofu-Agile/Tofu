# GoTofu — Agent Handoff Prompt

Kopiere alles unterhalb in den nächsten Agent-Chat.

---

## Projekt

**GoTofu** — SaaS-Plattform für synthetische User-Interviews. Kunden erstellen Organisationen, generieren KI-basierte Personas (datenbasiert via Web-Research oder prompt-basiert), clustern sie in Gruppen und führen damit Studies durch (Interviews, Surveys, Focus Groups etc.).

**Repo-Pfad:** `/Users/danielkourie/My Drive (daniel.kourie@code.berlin)/projects/SyntheticUserPlatform`

**Referenz-Dokument:** `PLAN.md` im Repo-Root — vollständiger Implementierungsplan.

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Supabase** (PostgreSQL + Auth + Storage + Realtime) — Projekt-ID: `cgkgolnccyuqjlvcazov`
- **Prisma v5** ORM (v5.22.0, weil Node 20.11.1 — Prisma v6+ braucht Node 20.19+)
- **Vercel AI SDK** — LLM-agnostisch (OpenAI/Claude/Gemini switchbar via `LLM_PROVIDER` env)
- **Tavily SDK** — Web-Research (Reddit, Foren, App Store Reviews) für datenbasierte Personas
- **shadcn/ui v4** (base-ui statt Radix — KEIN `asChild` prop)
- **Tailwind CSS v4**
- **Zod v4** (nutzt `issues` statt `errors` bei Validierungsfehlern)

## Was fertig ist

### Phase 1: Foundation ✅
- Supabase Auth (Login, Signup, OAuth Callback) + Session-Middleware
- Prisma Schema mit 20+ Models — pushed zu Supabase via `prisma db push`
- Org-Management (CRUD, Invitations, Member Roles) — Query-Layer in `src/lib/db/queries/`
- Dashboard Layout (Sidebar + Topbar + OrgSwitcher)
- Landing Page, Dashboard Page, Placeholder-Pages für alle Routen
- LLM Provider (`src/lib/ai/provider.ts`) — `getModel()` mit API-Key Validation
- Error Boundaries für Dashboard + Personas
- Settings Page (Workspace umbenennen, neuen Workspace erstellen)

### Phase 2A: Persona Engine ✅ (voll funktionsfähig)
- **4-Step Creation Wizard** (ersetzt alten simplen Dialog):
  - Step 1: Produkt-Info (Name, One-Liner, Zielgruppe, Konkurrenz, Research Goals)
  - Step 2: Auto-Research via Tavily (Reddit, Foren, App Reviews) → Preview
  - Step 3: Gruppe konfigurieren (Anzahl, Skeptics Toggle)
  - Step 4: Streaming Generation mit Progress Bar
- **Direkte Persona-Generierung** (kein Inngest nötig) via `/api/personas/generate`
- Persona Group Overview (`/personas`) — Grid mit Wizard-Button
- Group Detail Page (`/personas/[groupId]`) — Persona-Cards mit Big Five Mini-Bars
- Persona Detail Page (`/personas/[groupId]/[personaId]`) — Voller Profil-View
- **Data Provenance**: DomainKnowledge trackt sourceType, sourceUrl, publishedAt, relevanceScore
- **PersonaDataSource**: Jede Persona verlinkt zu ihren Datenquellen
- 12 DataSourceTypes: REDDIT, APP_REVIEW, PLAY_STORE_REVIEW, FORUM, PRODUCT_HUNT, etc.

## Auth-Flow

Der Auth-Flow funktioniert end-to-end:
1. Signup → Email-Bestätigung (wenn in Supabase aktiviert) → Login
2. `requireAuth()` erstellt automatisch einen Personal Workspace wenn keiner existiert (idempotent)
3. Dashboard Layout bestimmt activeOrgId aus Cookie (Fallback: erste Org)
4. Sidebar persistiert activeOrgId Cookie client-seitig per useEffect

## Wichtige Dateien

| Datei | Zweck |
|-------|-------|
| `PLAN.md` | Vollständiger Projektplan |
| `prisma/schema.prisma` | Datenbank-Schema (20+ Models) |
| `src/lib/auth.ts` | `requireAuth()`, `requireAuthWithOrgs()`, `getActiveOrgId()` |
| `src/lib/ai/provider.ts` | `getModel()` — LLM Provider Switch mit Key-Validation |
| `src/lib/ai/generate-personas.ts` | Persona-Generierung (RAG + Streaming) |
| `src/lib/research/tavily.ts` | Tavily Client + Search-Funktionen |
| `src/lib/research/build-queries.ts` | Product-Info → Tavily Search Queries |
| `src/lib/db/queries/personas.ts` | Persona CRUD Queries |
| `src/lib/db/queries/organizations.ts` | Org Management Queries |
| `src/lib/validation/schemas.ts` | Zod Schemas |
| `src/app/api/personas/generate/route.ts` | Streaming Generation API |
| `src/app/api/research/route.ts` | Streaming Research API |
| `src/components/personas/creation-wizard.tsx` | 4-Step Wizard |
| `src/components/layout/` | Sidebar, Topbar, OrgSwitcher |

## Dev-Setup

```bash
cd "/Users/danielkourie/My Drive (daniel.kourie@code.berlin)/projects/SyntheticUserPlatform"
npm run dev          # Startet auf Port 3004
npx prisma db push   # Schema zu Supabase pushen (liest .env, nicht .env.local)
npx prisma generate  # Prisma Client regenerieren
npx next build       # Build verifizieren
```

## .env Setup

Beide Dateien (.env und .env.local) mit denselben Werten füllen:
- `.env.local` → wird von Next.js gelesen
- `.env` → wird von Prisma CLI gelesen (`prisma db push`, `prisma generate`)

Siehe `.env.example` für alle benötigten Variablen.

## Nächste Schritte

### Phase 2B: Polish
- Persona-Filtering (Alter, Trait, Archetype)
- Mobile Navigation (Sidebar collapsible)
- Persona Edit/Delete

### Phase 3: Study & Interview System (KERNPRODUKT)
- Study Creation Wizard (Interview, Survey, Focus Group)
- Interview Guide Builder
- Multi-turn Chat mit Persona (nutzt `llmSystemPrompt`)
- Session Transcript Viewer

### Phase 4-6: Uploads, Analysis, Scale (siehe PLAN.md)

## Gotchas

- **shadcn/ui v4**: Kein `asChild` prop — nutzt base-ui statt Radix
- **Prisma v5**: Wegen Node 20.11.1 — NICHT auf v6+ upgraden
- **Zod v4**: `error.issues` statt `error.errors`
- **Next.js 16**: `middleware.ts` Convention ist deprecated (Warning, funktioniert aber)
- **Port 3004**: In `package.json` konfiguriert
- **`.env` vs `.env.local`**: Beide brauchen `DATABASE_URL` (Prisma-Limitation)
- **Tavily optional**: Ohne `TAVILY_API_KEY` funktioniert alles — Personas werden dann nur prompt-basiert generiert
