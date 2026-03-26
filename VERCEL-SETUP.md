# Vercel Deployment Setup

## Current Status (as of 2026-03-18) — ALL LIVE ✅

| Step | Status | Details |
|---|---|---|
| GitHub Repo (`habibidani/gotofu`) | ✅ | `main` branch is production (both projects) |
| Vercel Account | ✅ | Account: `admin-42578282`, Team: `gotofus-projects` |
| `gotofu-app` Project | ✅ | Live at `https://app.gotofu.io` |
| `gotofu-landing` Project | ✅ | Live at `https://gotofu.io` |
| Environment Variables (`gotofu-app`) | ✅ | All 12 vars set |
| Environment Variables (`gotofu-landing`) | ✅ | `NEXT_PUBLIC_APP_URL=https://app.gotofu.io` |
| Build Command (`prisma generate && next build`) | ✅ | In `package.json` build script |
| Domain `app.gotofu.io` → `gotofu-app` | ✅ | Verified, SSL active |
| Domain `gotofu.io` → `gotofu-landing` | ✅ | Verified, SSL active |
| DNS (Hostinger → Vercel Nameservers) | ✅ | Hostinger NS set to Vercel |
| Supabase Auth Redirect URLs | ✅ | Manually set in Supabase Dashboard |

### Live URLs

| URL | Project | What |
|---|---|---|
| `https://gotofu.io` | `gotofu-landing` | Landing Page |
| `https://app.gotofu.io` | `gotofu-app` | Main App (Login, Dashboard, etc.) |
| `https://gotofu-app.vercel.app` | `gotofu-app` | Vercel Preview URL (always available) |
| `https://gotofu-landing.vercel.app` | `gotofu-landing` | Vercel Preview URL (always available) |

---

## Architecture

One GitHub repo, two Vercel projects with different root directories:

| Vercel Project | Domain | GitHub Repo | Root Directory | Description |
|---|---|---|---|---|
| `gotofu-app` | `app.gotofu.io` | `habibidani/gotofu` | `/` (root) | The main app |
| `gotofu-landing` | `gotofu.io` | `habibidani/gotofu` | `apps/landing/` | Static landing page |

Both projects deploy from the same repo. Push to `main` → both projects deploy automatically.

**Note:** The `.vercel/project.json` in the repo root points to `gotofu-landing` (historical). This doesn't affect builds — Vercel uses the GitHub integration, not the local config.

### Old Projects (deleted 2026-03-18)
- `gotofu` (gotofu.vercel.app) — duplicate
- `tofu` (tofu-xi.vercel.app) — old repo
- `tofu-u2t4` (tofu-u2t4.vercel.app) — old repo

---

## Environment Variables (gotofu-app)

All set via Vercel CLI or Dashboard. Values from `.env.local`:

| Key | Description |
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

> **Note:** `gotofu-landing` uses `apps/landing/` as root directory in the same repo.

---

## Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://app.gotofu.io`
- **Redirect URLs:**
  - `https://app.gotofu.io/callback`
  - `https://app.gotofu.io/accept-invite/*`
  - `http://localhost:3004/callback` (local dev)

---

## DNS (Hostinger → Vercel)

Hostinger nameservers were set to Vercel. Vercel now manages the entire DNS zone for `gotofu.io`. Automatically set in Vercel DNS Dashboard:

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

The MX + SPF records are for **Zoho Mail** (`admin@gotofu.io`). Without these records, no mail can be delivered to `@gotofu.io`. The Vercel account runs on `admin@gotofu.io` — if MX records are missing, you'll be locked out of Vercel!

---

## How Deploys Work

- Push to `main` → **both** projects deploy automatically (same repo, GitHub Integration)
- Landing Page (`apps/landing/`): ~15 seconds build (static site, no DB)
- App (root `/`): ~45 seconds build (`prisma generate` + `next build`)

### Build Isolation (recommended, not yet set)

To avoid unnecessary deploys, set in Vercel Project Settings → **Git → Ignored Build Step**:

**gotofu-landing:**
```bash
git diff HEAD^ HEAD --quiet apps/landing
```

**gotofu-app:**
```bash
git diff HEAD^ HEAD --quiet -- . ':!apps/landing'
```

---

## CLI — Deploy Projects

```bash
# For gotofu-landing (current default because .vercel/project.json points to it)
vercel deploy --prod --scope gotofus-projects

# For gotofu-app (specify explicitly)
vercel link --project gotofu-app --scope gotofus-projects
vercel deploy --prod --scope gotofus-projects
```

**Warning:** After `vercel link`, `.vercel/project.json` changes — commit or revert.

---

## Local Development

```bash
# App (Port 3004)
npm run dev

# Landing (Port 3005)
cd apps/landing && npm run dev
```

---

## Known Problems & Fixes (from initial setup)

### Problem 1: Prisma Client not generated on Vercel

**Error:** `PrismaClientInitializationError: Prisma has detected that this project was built on Vercel, which caches dependencies.`

**Fix:** Build command must be `prisma generate && next build`. Already set in `package.json`:
```json
"build": "prisma generate && next build"
```
Vercel automatically uses `npm run build`, so the fix is permanent.

### Problem 2: Monorepo — Root middleware found in landing build

**Error:** `Module not found: Can't resolve '@/lib/supabase/middleware'` when building `gotofu-landing`

**Cause:** Vercel sets `outputFileTracingRoot` to the monorepo root, Turbopack scans the entire repo structure and finds `src/middleware.ts` from the main app.

**Fix:** Created `apps/landing/src/middleware.ts` with simple passthrough so Next.js uses this local file instead of the root file:
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
```

### Problem 3: TypeScript errors with Prisma JSON fields

**Error:** `Conversion of type 'JsonValue' to type 'Theme[]' may be a mistake`

**Fix:** Double cast via `unknown`:
```typescript
const themes = (report.themes as unknown as Theme[]) || [];
```

### Problem 4: Domain verification failing

**Error:** `"Domain gotofu.io was added to a different project. Please complete verification"`

**Fix:** TXT records must be set first, then trigger verification via Vercel API:
```bash
curl -X POST "https://api.vercel.com/v10/projects/gotofu-landing/domains/gotofu.io/verify?teamId=team_AvpwnQStzhAHcqA0GGs4e3pS" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

### Problem 5: app.gotofu.io shows landing page instead of app

**Cause:** `src/app/page.tsx` (root) still had landing page content from before the monorepo split.

**Fix:** Changed `src/app/page.tsx` to redirect:
```typescript
import { redirect } from "next/navigation";
export default function RootPage() { redirect("/login"); }
```

### Problem 6: Sign-In button on landing page points to localhost

**Cause:** `NEXT_PUBLIC_APP_URL` was not set as env var in `gotofu-landing`. The fallback is `http://localhost:3004`.

**Fix:** Added `NEXT_PUBLIC_APP_URL=https://app.gotofu.io` to `gotofu-landing` environment variables. Since it's a `NEXT_PUBLIC_` variable, a redeploy is required after setting it.

### Problem 7: Trailing newlines in Vercel env vars

**Cause:** `echo "value" | vercel env add` appends an invisible `\n` to the value. This breaks API keys, DB URLs, etc.

**Symptoms:** Everything broken — login, AI features, DB connections. Env vars look correct in the dashboard, but the value has an invisible newline.

**Diagnosis:** `vercel env pull .env.check --environment production` → check if values end with `\n"`.

**Fix:** Always use `printf '%s'` instead of `echo`:
```bash
# CORRECT:
printf '%s' "<openai-api-key>" | npx vercel env add OPENAI_API_KEY production --scope gotofus-projects

# WRONG:
echo "<openai-api-key>" | npx vercel env add OPENAI_API_KEY production --scope gotofus-projects
```

### Problem 8: MaxClientsInSessionMode (DB connection limit)

**Cause:** `DATABASE_URL` used Session Pooler (Port 5432) instead of Transaction Pooler (Port 6543). Session Pooler has very low connection limit for serverless.

**Fix:** Change port to 6543 + add `?pgbouncer=true&connection_limit=10`:
```
postgresql://postgres.XXX:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10
```
