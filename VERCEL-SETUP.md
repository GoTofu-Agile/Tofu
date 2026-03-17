# Vercel Deployment Setup

## Architektur

Ein GitHub Repo, zwei Vercel-Projekte:

| Vercel Project | Domain | Root Directory | Beschreibung |
|---|---|---|---|
| `gotofu-landing` | `gotofu.io` | `apps/landing` | Statische Landing Page |
| `gotofu-app` | `app.gotofu.io` | `/` (Root) | Die Haupt-App |

## Schritt-fuer-Schritt Setup

### 1. GitHub Repo verbinden

Falls noch nicht geschehen:
```bash
git remote add origin https://github.com/habibidani/gotofu.git
git push -u origin main
```

### 2. Vercel Projekt 1: Landing Page (`gotofu.io`)

1. Gehe zu https://vercel.com/new
2. Importiere das GitHub Repo `habibidani/gotofu`
3. **Project Name:** `gotofu-landing`
4. **Framework Preset:** Next.js (auto-detected)
5. **Root Directory:** `apps/landing` ← WICHTIG
6. **Environment Variables:** Nur eine:
   - `NEXT_PUBLIC_APP_URL` = `https://app.gotofu.io`
7. Deploy klicken

### 3. Vercel Projekt 2: App (`app.gotofu.io`)

1. Gehe zu https://vercel.com/new
2. Importiere **dasselbe** GitHub Repo `habibidani/gotofu`
3. **Project Name:** `gotofu-app`
4. **Framework Preset:** Next.js
5. **Root Directory:** `/` (leer lassen = Root)
6. **Environment Variables:**
   - `DATABASE_URL` — Supabase Connection String
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase Service Role Key
   - `OPENAI_API_KEY` — (oder `ANTHROPIC_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`)
   - `LLM_PROVIDER` — `openai` (oder `anthropic` / `google`)
   - `TAVILY_API_KEY` — Tavily API Key (optional)
   - `GOTOFU_ADMIN_EMAILS` — Komma-getrennte Admin-Emails
7. Deploy klicken

### 4. Domains einrichten

Fuer **beide** Projekte: Settings → Domains

**gotofu-landing:**
- Fuege `gotofu.io` hinzu
- Fuege `www.gotofu.io` hinzu (redirect zu `gotofu.io`)

**gotofu-app:**
- Fuege `app.gotofu.io` hinzu

### 5. DNS Records bei Domain-Provider

Bei deinem Domain-Registrar (wo du `gotofu.io` gekauft hast):

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `app` | `cname.vercel-dns.com` |

(Vercel zeigt dir die genauen Records im Dashboard an)

### 6. Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://app.gotofu.io`
- **Redirect URLs:**
  - `https://app.gotofu.io/callback`
  - `https://app.gotofu.io/accept-invite/*`
  - `http://localhost:3004/callback` (fuer local dev)

### 7. Prisma auf Vercel

Vercel baut automatisch mit `next build`. Prisma Client muss vorher generiert werden:

Gehe zu **gotofu-app** Settings → General → Build & Development Settings:
- **Build Command:** `npx prisma generate && next build`

## Wie Deploys funktionieren

- Push auf `main` → **beide** Projekte deployen automatisch
- Landing Page: ~3 Sekunden Build (static site)
- App: ~30-60 Sekunden Build (prisma generate + next build)
- Vercel nutzt "Ignored Build Step" um unnoetige Deploys zu vermeiden

### Nur Landing deployen wenn Landing-Dateien geaendert:

In **gotofu-landing** Settings → Git → Ignored Build Step:
```bash
git diff HEAD^ HEAD --quiet apps/landing
```

### Nur App deployen wenn App-Dateien geaendert:

In **gotofu-app** Settings → Git → Ignored Build Step:
```bash
git diff HEAD^ HEAD --quiet -- . ':!apps/landing'
```

## Lokale Entwicklung

```bash
# App (Port 3004)
npm run dev

# Landing (Port 3005)
cd apps/landing && npm run dev
```
