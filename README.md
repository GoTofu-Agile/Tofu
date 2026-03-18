# GoTofu

B2B SaaS platform for synthetic user research. Create AI-generated personas from real data, run simulated interviews, and get automated insights — as a faster, cheaper alternative to traditional user research.

**Live:** [app.gotofu.io](https://app.gotofu.io) | **Landing:** [gotofu.io](https://gotofu.io)

---

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/habibidani/gotofu.git
cd gotofu
npm install

# 2. Set up environment (get values from Daniel)
cp .env.example .env.local
cp .env.example .env          # Prisma needs .env, Next.js reads .env.local

# 3. Generate Prisma client
npx prisma generate

# 4. Start dev server (Port 3004)
npm run dev
```

Open [http://localhost:3004](http://localhost:3004).

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Runtime | React | 19.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL (Supabase) + Prisma ORM | 5.22 |
| Auth | Supabase Auth (`@supabase/ssr`) | — |
| LLM | Vercel AI SDK (OpenAI, Anthropic, Google) | 6.x |
| Background Jobs | Inngest | 3.x |
| UI | shadcn/ui v4 (base-ui, **not** Radix) | 4.x |
| Styling | Tailwind CSS | 4.x |

---

## Repo Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Signup, OAuth
│   ├── (dashboard)/      # All protected pages
│   └── api/              # API routes
├── components/           # React components (layout, studies, personas, ui)
├── lib/
│   ├── ai/               # LLM provider, persona generation, prompts
│   ├── db/queries/       # Prisma query functions
│   ├── inngest/          # Background job functions
│   ├── supabase/         # Auth helpers
│   └── validation/       # Zod schemas
└── middleware.ts          # Supabase session refresh
prisma/schema.prisma       # Database schema
```

---

## Development Workflow

### Goldene Regel

**Nie direkt auf `main` pushen.** Jeder Push auf main deployt sofort auf Production (`app.gotofu.io`). Immer Feature-Branches + Pull Requests nutzen.

### Branch-Benennung

Ein Branch pro Task — **nicht** pro Person. Jede Aufgabe bekommt einen eigenen Branch. Nach dem Merge wird der Branch gelöscht.

| Prefix | Wann | Beispiel |
|---|---|---|
| `feat/` | Neues Feature | `feat/login-loading-overlay` |
| `fix/` | Bugfix | `fix/persona-generation-null-error` |
| `chore/` | Maintenance, Config, Dependencies | `chore/update-dependencies` |
| `docs/` | Nur Dokumentation | `docs/update-readme` |

Format: `prefix/kurze-beschreibung-mit-bindestrichen` (lowercase, keine Leerzeichen).

### Schritt für Schritt

```bash
# 1. Auf aktuellen main wechseln
git checkout main
git pull origin main

# 2. Neuen Branch erstellen
git checkout -b feat/mein-feature

# 3. Arbeiten + committen (so oft wie nötig)
git add src/app/api/new-route/route.ts
git commit -m "feat: add new API route for X"

# 4. Branch pushen + Pull Request erstellen
git push -u origin feat/mein-feature
gh pr create --title "feat: add new API route for X" --body "What and why"

# 5. CI läuft automatisch (lint + build) — abwarten bis grün
# 6. Vercel Preview URL testen (Link erscheint im PR)
# 7. PR mergen (Squash and Merge empfohlen → saubere History)
# 8. Branch wird nach Merge automatisch gelöscht
```

### Was passiert automatisch

| Event | Was passiert |
|---|---|
| PR auf `main` öffnen | GitHub Actions CI: lint + build |
| PR auf `main` öffnen | Vercel erstellt Preview Deployment mit eigener URL |
| PR mergen → `main` | Vercel deployt auf Production (`app.gotofu.io`) |

### Wer darf mergen?

Aktuell: **Jeder mit Repo-Zugriff** kann PRs mergen — GitHub Free erlaubt keine Branch Protection auf privaten Repos. Die Sicherheit kommt von:

1. **CI muss grün sein** — lint + build müssen bestehen
2. **Vercel Preview testen** — vor dem Merge die Preview URL prüfen
3. **Disziplin** — nie direkt auf main pushen, immer PR

> Bei Upgrade auf GitHub Pro: Branch Protection Rules aktivieren (CI required, optional Review required).

### Commit Convention

```
feat: neues Feature
fix:  Bugfix
chore: Maintenance (Dependencies, Config)
docs: nur Dokumentation
```

---

## Environment Variables

See [`.env.example`](.env.example) for all variables with descriptions.

**Important:** You need **two** `.env` files with the same values:
- `.env.local` — read by Next.js
- `.env` — read by Prisma CLI (it can't read `.env.local`)

---

## Deployment

Two separate Vercel projects, two repos:

| Project | Domain | Repo |
|---|---|---|
| `gotofu-app` | `app.gotofu.io` | `habibidani/gotofu` (this repo) |
| `gotofu-landing` | `gotofu.io` | `GoTofu-Agile/LandingPage` |

See [`VERCEL-SETUP.md`](VERCEL-SETUP.md) for full deployment details.

---

## Documentation

| Document | Purpose |
|---|---|
| [`docs/AGENT-HANDOVER.md`](docs/AGENT-HANDOVER.md) | Complete technical reference — routes, workflows, data model, gotchas |
| [`VERCEL-SETUP.md`](VERCEL-SETUP.md) | Deployment setup, env vars, DNS, troubleshooting |
| [`FRONTEND-HANDOFF.md`](FRONTEND-HANDOFF.md) | UI/UX guidelines, design reference, styling rules |
| [`docs/ENGINEERING-VISION.md`](docs/ENGINEERING-VISION.md) | Architecture deep-dive |
| [`docs/PERSONA-FRAMEWORK.md`](docs/PERSONA-FRAMEWORK.md) | Persona generation framework design |
| [`CLAUDE.md`](CLAUDE.md) | Instructions for Claude Code agents working in this repo |

---

## Top Gotchas

1. **shadcn/ui v4 uses base-ui, NOT Radix** — no `asChild` prop. Using it won't error but will break rendering.
2. **Port 3004**, not 3000 — configured in `package.json`.
3. **Two `.env` files required** — `.env.local` (Next.js) + `.env` (Prisma). Both need `DATABASE_URL`.
4. **Prisma v5 on Node 20** — don't upgrade to v6 (requires Node 20.19+).
5. **Transaction Pooler (Port 6543)** for production — Session Pooler (5432) fails on serverless. Use `?pgbouncer=true&connection_limit=10`.
