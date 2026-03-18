# Vercel Deployment Setup

## Aktueller Stand (Stand: 18.03.2026) — ALLES LIVE ✅

| Schritt | Status | Details |
|---|---|---|
| GitHub Repo App (`habibidani/gotofu`) | ✅ | `main` branch ist production |
| GitHub Repo Landing (`GoTofu-Agile/LandingPage`) | ✅ | `main` branch ist production |
| Vercel Account | ✅ | Account: `admin-42578282`, Team: `gotofus-projects` |
| `gotofu-app` Projekt | ✅ | Live auf `https://app.gotofu.io` |
| `gotofu-landing` Projekt | ✅ | Live auf `https://gotofu.io` |
| Environment Variables (`gotofu-app`) | ✅ | Alle 12 Vars gesetzt |
| Environment Variables (`gotofu-landing`) | ✅ | `NEXT_PUBLIC_APP_URL=https://app.gotofu.io` |
| Build Command (`prisma generate && next build`) | ✅ | In `package.json` build script |
| Domain `app.gotofu.io` → `gotofu-app` | ✅ | Verifiziert, SSL aktiv |
| Domain `gotofu.io` → `gotofu-landing` | ✅ | Verifiziert, SSL aktiv |
| DNS (Hostinger → Vercel Nameservers) | ✅ | Hostinger NS auf Vercel gesetzt |
| Supabase Auth Redirect URLs | ✅ | Manuell im Supabase Dashboard gesetzt |

### Live-URLs

| URL | Projekt | Was |
|---|---|---|
| `https://gotofu.io` | `gotofu-landing` | Landing Page |
| `https://app.gotofu.io` | `gotofu-app` | Haupt-App (Login, Dashboard, etc.) |
| `https://gotofu-app.vercel.app` | `gotofu-app` | Vercel Preview-URL (immer verfügbar) |
| `https://gotofu-landing.vercel.app` | `gotofu-landing` | Vercel Preview-URL (immer verfügbar) |

---

## Architektur

Zwei GitHub Repos, zwei Vercel-Projekte:

| Vercel Project | Domain | GitHub Repo | Beschreibung |
|---|---|---|---|
| `gotofu-app` | `app.gotofu.io` | `habibidani/gotofu` | Die Haupt-App |
| `gotofu-landing` | `gotofu.io` | `GoTofu-Agile/LandingPage` | Statische Landing Page |

Jedes Repo deployt unabhängig auf sein Vercel-Projekt. Push auf `main` → automatisches Deployment.

**Hinweis:** Das `.vercel/project.json` im `habibidani/gotofu` Repo verlinkt auf `gotofu-landing` (historisch). Das lokale Verzeichnis `apps/landing/` wird NICHT für Production genutzt.

### Alte Projekte (gelöscht am 18.03.2026)
- `gotofu` (gotofu.vercel.app) — Duplikat
- `tofu` (tofu-xi.vercel.app) — altes Repo
- `tofu-u2t4` (tofu-u2t4.vercel.app) — altes Repo

---

## Environment Variables (gotofu-app)

Alle über Vercel CLI oder Dashboard gesetzt. Werte aus `.env.local`:

| Key | Beschreibung |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cgkgolnccyuqjlvcazov.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `DATABASE_URL` | Supabase PostgreSQL — **Transaction Pooler** (Port 6543) + `?pgbouncer=true&connection_limit=10` |
| `LLM_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` |
| `TAVILY_API_KEY` | Tavily web research key |
| `INNGEST_EVENT_KEY` | Inngest event key |
| `INNGEST_SIGNING_KEY` | Inngest signing key |
| `NEXT_PUBLIC_APP_URL` | `https://app.gotofu.io` |
| `GOTOFU_ADMIN_EMAILS` | `daniel.kourie@code.berlin` |

## Environment Variables (gotofu-landing)

| Key | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://app.gotofu.io` |

---

## Supabase Auth Redirect URLs

Im Supabase Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://app.gotofu.io`
- **Redirect URLs:**
  - `https://app.gotofu.io/callback`
  - `https://app.gotofu.io/accept-invite/*`
  - `http://localhost:3004/callback` (local dev)

---

## DNS (Hostinger → Vercel)

Hostinger Nameservers wurden auf Vercel gesetzt. Vercel verwaltet jetzt die gesamte DNS-Zone `gotofu.io`. Im Vercel DNS-Dashboard sind automatisch gesetzt:

| Type | Name | Priority | Value |
|---|---|---|---|
| ALIAS | `@` | — | `cname.vercel-dns-017.com.` |
| ALIAS | `*` | — | `cname.vercel-dns-017.com.` |
| TXT | `_vercel` | — | `vc-domain-verify=app.gotofu.io,...` |
| TXT | `_vercel` | — | `vc-domain-verify=gotofu.io,...` |
| MX | `@` | 10 | `mx.zoho.eu` |
| MX | `@` | 20 | `mx2.zoho.eu` |
| MX | `@` | 50 | `mx3.zoho.eu` |
| TXT | `@` | — | `v=spf1 include:zohomail.eu ~all` |

Die MX + SPF Records sind für **Zoho Mail** (`admin@gotofu.io`). Ohne diese Records kann kein Mail an `@gotofu.io` zugestellt werden. Der Vercel Account läuft auf `admin@gotofu.io` — wenn die MX Records fehlen, ist man aus Vercel ausgesperrt!

---

## Wie Deploys funktionieren

- Push auf `main` → **beide** Projekte deployen automatisch (GitHub Integration)
- Landing Page: ~15 Sekunden Build (static site, no DB)
- App: ~45 Sekunden Build (`prisma generate` + `next build`)

### Build-Isolation (empfohlen, noch nicht gesetzt)

Um unnötige Deploys zu vermeiden, in den Vercel Projekt-Settings unter **Git → Ignored Build Step**:

**gotofu-landing:**
```bash
git diff HEAD^ HEAD --quiet apps/landing
```

**gotofu-app:**
```bash
git diff HEAD^ HEAD --quiet -- . ':!apps/landing'
```

---

## CLI — Projekte deployen

```bash
# Für gotofu-landing (aktueller Standard weil .vercel/project.json darauf zeigt)
vercel deploy --prod --scope gotofus-projects

# Für gotofu-app (explizit angeben)
vercel link --project gotofu-app --scope gotofus-projects
vercel deploy --prod --scope gotofus-projects
```

**Achtung:** Nach `vercel link` ändert sich `.vercel/project.json` — committen oder revertieren.

---

## Lokale Entwicklung

```bash
# App (Port 3004)
npm run dev

# Landing (Port 3005)
cd apps/landing && npm run dev
```

---

## Bekannte Probleme & Fixes (aus der Ersteinrichtung)

### Problem 1: Prisma Client nicht generiert auf Vercel

**Fehler:** `PrismaClientInitializationError: Prisma has detected that this project was built on Vercel, which caches dependencies.`

**Fix:** Build Command muss `prisma generate && next build` sein. In `package.json` bereits eingetragen:
```json
"build": "prisma generate && next build"
```
Vercel nutzt automatisch `npm run build`, also ist der Fix permanent.

### Problem 2: Monorepo — Middleware vom Root wird in Landing-Build gefunden

**Fehler:** `Module not found: Can't resolve '@/lib/supabase/middleware'` beim Build von `gotofu-landing`

**Ursache:** Vercel setzt `outputFileTracingRoot` auf den Monorepo-Root, Turbopack scannt dann die gesamte Repo-Struktur und findet `src/middleware.ts` aus der Haupt-App.

**Fix:** `apps/landing/src/middleware.ts` mit simplem Passthrough erstellt, damit Next.js diese lokale Datei nimmt statt der Root-Datei:
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
```

### Problem 3: TypeScript-Fehler bei Prisma JSON-Feldern

**Fehler:** `Conversion of type 'JsonValue' to type 'Theme[]' may be a mistake`

**Fix:** Doppelter Cast über `unknown`:
```typescript
const themes = (report.themes as unknown as Theme[]) || [];
```

### Problem 4: Domain-Verifizierung schlägt fehl

**Fehler:** `"Domain gotofu.io was added to a different project. Please complete verification"`

**Fix:** TXT-Records müssen zuerst gesetzt werden, dann Verifizierung per Vercel API triggern:
```bash
curl -X POST "https://api.vercel.com/v10/projects/gotofu-landing/domains/gotofu.io/verify?teamId=team_AvpwnQStzhAHcqA0GGs4e3pS" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

### Problem 5: app.gotofu.io zeigt Landing Page statt App

**Ursache:** `src/app/page.tsx` (Root) hatte noch Landing Page Inhalt aus der Zeit vor dem Monorepo-Split.

**Fix:** `src/app/page.tsx` auf Redirect geändert:
```typescript
import { redirect } from "next/navigation";
export default function RootPage() { redirect("/login"); }
```

### Problem 6: Sign-In Button auf Landing Page zeigt auf localhost

**Ursache:** `NEXT_PUBLIC_APP_URL` war nicht als Env Var in `gotofu-landing` gesetzt. Der Fallback ist `http://localhost:3004`.

**Fix:** `NEXT_PUBLIC_APP_URL=https://app.gotofu.io` zu `gotofu-landing` Environment Variables hinzugefügt. Da es eine `NEXT_PUBLIC_` Variable ist, muss nach dem Setzen neu deployed werden.

### Problem 7: Trailing Newlines in Vercel Env Vars

**Ursache:** `echo "value" | vercel env add` fügt ein unsichtbares `\n` am Ende des Werts an. Das bricht API-Keys, DB-URLs, etc.

**Symptome:** Alles kaputt — Login, AI Features, DB Connections. Env Vars sehen im Dashboard korrekt aus, aber der Wert hat ein unsichtbares Newline.

**Diagnose:** `vercel env pull .env.check --environment production` → prüfe ob Werte mit `\n"` enden.

**Fix:** Immer `printf '%s'` statt `echo` nutzen:
```bash
# RICHTIG:
printf '%s' "sk-proj-..." | npx vercel env add OPENAI_API_KEY production --scope gotofus-projects

# FALSCH:
echo "sk-proj-..." | npx vercel env add OPENAI_API_KEY production --scope gotofus-projects
```

### Problem 8: MaxClientsInSessionMode (DB Connection Limit)

**Ursache:** `DATABASE_URL` nutzte Session Pooler (Port 5432) statt Transaction Pooler (Port 6543). Session Pooler hat sehr niedriges Connection-Limit für Serverless.

**Fix:** Port auf 6543 ändern + `?pgbouncer=true&connection_limit=10`:
```
postgresql://postgres.XXX:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10
```
