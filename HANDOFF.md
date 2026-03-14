# GoTofu — Agent Handoff Prompt

Kopiere alles unterhalb in den nächsten Agent-Chat.

---

## Projekt

**GoTofu** — SaaS-Plattform für synthetische User-Interviews. Kunden erstellen Organisationen, generieren KI-basierte Personas, clustern sie in Gruppen und führen damit Studies durch (Interviews, Surveys, Focus Groups etc.).

**Repo-Pfad:** `/Users/danielkourie/My Drive (daniel.kourie@code.berlin)/projects/SyntheticUserPlatform`

**Referenz-Dokument:** Lies zuerst `PLAN.md` im Repo-Root — das ist der vollständige Implementierungsplan mit Tech Stack, DB-Schema, Architektur, allen 6 Phasen und Design-Entscheidungen. Der Plan liegt auch unter `.claude/plans/sunny-mapping-clarke.md`.

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Supabase** (PostgreSQL + Auth + Storage + Realtime) — Projekt-ID: `cgkgolnccyuqjlvcazov`
- **Prisma v5** ORM (v5.22.0, weil Node 20.11.1 — Prisma v6+ braucht Node 20.19+)
- **Vercel AI SDK** — LLM-agnostisch (OpenAI/Claude/Gemini switchbar via `LLM_PROVIDER` env)
- **Inngest** — Serverless Background Jobs
- **shadcn/ui v4** (base-ui statt Radix — KEIN `asChild` prop, nutzt `render` oder direkte Styling)
- **Tailwind CSS v4**
- **Zod v4** (nutzt `issues` statt `errors` bei Validierungsfehlern)

## Was fertig ist

### Phase 1: Foundation ✅
- Supabase Auth (Login, Signup, OAuth Callback) + Session-Middleware
- Prisma Schema mit 20+ Models (User, Organization, Persona, Study, Session, etc.) — pushed zu Supabase via `prisma db push`
- Org-Management (CRUD, Invitations, Member Roles) — Query-Layer in `src/lib/db/queries/`
- Dashboard Layout (Sidebar + Topbar + OrgSwitcher)
- Landing Page, Dashboard Page, Placeholder-Pages für alle Routen
- LLM Provider (`src/lib/ai/provider.ts`) — `getModel()` + `getEmbeddingModel()`
- Inngest Client + API Route (`/api/inngest`)
- `.env.example` + `.env.local` konfiguriert

### Phase 2: Persona Engine ✅ (UI + Backend, aber Generierung noch nicht testbar)
- Persona Group Overview (`/personas`) — Grid mit Create-Button
- Create Group Dialog — Name, Description, Domain Context, Count → Server Action → Inngest Event
- Group Detail Page (`/personas/[groupId]`) — Persona-Cards mit Big Five Mini-Bars
- Persona Detail Page (`/personas/[groupId]/[personaId]`) — Voller Profil-View
- PersonaCard Component mit Big Five Trait-Visualisierung
- DB-Queries: `getPersonaGroupsForOrg`, `getPersonaGroup`, `getPersonasForGroup`, `getPersona`, etc.
- Inngest Function `generate-persona-batch` — generiert Personas via LLM + speichert mit PersonalityProfile
- Zod Schemas in `src/lib/validation/schemas.ts`

## Was NICHT funktioniert / offen ist

1. **Persona-Generierung ist nicht testbar** — Die Generierung läuft über Inngest Background Jobs. Ohne `npx inngest-cli dev` (Inngest Dev Server) werden Events nicht verarbeitet. **Empfohlener Fix:** Einen direkten/synchronen Generierungs-Modus einbauen (Server Action die direkt `generateObject` aufruft statt über Inngest), damit man sofort testen kann.

2. **Auth-Flow noch nicht getestet** — Supabase Auth ist konfiguriert, aber der komplette Signup → Login → Dashboard Flow wurde noch nicht end-to-end durchgeklickt. Es könnte sein, dass der `requireAuth()` Helper beim ersten Login den User nicht in der Prisma-DB findet (der `upsertUser` Call in `src/lib/auth.ts`).

3. **Database Connection** — Nutzt Session Pooler (nicht Direct Connection, da IPv4-only Netzwerk):
   ```
   DATABASE_URL=postgresql://postgres.cgkgolnccyuqjlvcazov:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
   ```
   Prisma braucht eine `.env` Datei (nicht `.env.local`) für CLI-Commands wie `prisma db push`.

4. **Inngest Keys** — `INNGEST_EVENT_KEY` und `INNGEST_SIGNING_KEY` in `.env.local` sind noch Platzhalter. Für lokales Dev reicht der Inngest Dev Server ohne Keys.

## Wichtige Dateien

| Datei | Zweck |
|-------|-------|
| `PLAN.md` | Vollständiger Projektplan (Referenz) |
| `prisma/schema.prisma` | Datenbank-Schema (20+ Models) |
| `src/lib/auth.ts` | `requireAuth()`, `requireAuthWithOrgs()` |
| `src/lib/ai/provider.ts` | `getModel()` — LLM Provider Switch |
| `src/lib/db/queries/personas.ts` | Persona CRUD Queries |
| `src/lib/db/queries/organizations.ts` | Org Management Queries |
| `src/lib/db/queries/users.ts` | User CRUD |
| `src/lib/validation/schemas.ts` | Zod Schemas (createPersonaGroup, persona) |
| `src/lib/inngest/functions/generate-persona-batch.ts` | Persona Generation Job |
| `src/app/(dashboard)/personas/actions.ts` | Server Actions (createGroupAndGenerate) |
| `src/components/personas/` | PersonaCard, CreateGroupDialog |
| `src/components/layout/` | Sidebar, Topbar, OrgSwitcher |
| `src/lib/supabase/` | Client, Server, Middleware |

## Dev-Setup

```bash
cd "/Users/danielkourie/My Drive (daniel.kourie@code.berlin)/projects/SyntheticUserPlatform"
npm run dev          # Startet auf Port 3004 (3000-3003 sind belegt)
npx prisma db push   # Schema zu Supabase pushen (liest .env, nicht .env.local)
npx prisma generate  # Prisma Client regenerieren
npx next build       # Build verifizieren
```

## Nächste Schritte (Phase 2 vervollständigen)

1. **Direkte Persona-Generierung** einbauen (ohne Inngest), damit sofort testbar
2. Auth-Flow end-to-end testen (Signup → Login → Dashboard → Personas)
3. Persona-Generierung testen (Group erstellen → Personas generieren → Grid ansehen → Detail)
4. Optional: Inngest Dev Server Setup für Background-Job-Testing

## Danach: Phase 3-6 (siehe PLAN.md)

- Phase 3: Upload & Data Processing (CSV/PDF → Personas)
- Phase 4: Study & Session System (Interviews, Surveys mit Personas)
- Phase 5: Analysis & Reporting (Themes, Sentiment, Export)
- Phase 6: Polish & Scale (Billing, Monitoring, Performance)

## Gotchas

- **shadcn/ui v4**: Kein `asChild` prop — nutzt base-ui statt Radix. Buttons als Links: `buttonVariants()` + `<Link>` oder `render` prop
- **Prisma v5**: Wegen Node 20.11.1 — NICHT auf v6+ upgraden
- **Zod v4**: `error.issues` statt `error.errors`
- **Next.js 16**: `middleware.ts` Convention ist deprecated (Warning, aber funktioniert noch)
- **Port 3004**: In `package.json` als `"dev": "next dev --port 3004"` konfiguriert
- **`.env` vs `.env.local`**: Next.js liest `.env.local`, Prisma CLI liest `.env` — beide müssen `DATABASE_URL` haben
