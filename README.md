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

### Golden Rule

**Never push directly to `main`.** Every push to main deploys immediately to production (`app.gotofu.io`). Always use feature branches + pull requests.

### Branch Naming

One branch per task — **not** per person. Each task gets its own branch. After merge, the branch is deleted.

| Prefix | When | Example |
|---|---|---|
| `feat/` | New feature | `feat/login-loading-overlay` |
| `fix/` | Bug fix | `fix/persona-generation-null-error` |
| `chore/` | Maintenance, config, dependencies | `chore/update-dependencies` |
| `docs/` | Documentation only | `docs/update-readme` |

Format: `prefix/short-description-with-hyphens` (lowercase, no spaces).

### Step by Step

```bash
# 1. Switch to current main
git checkout main
git pull origin main

# 2. Create new branch
git checkout -b feat/my-feature

# 3. Work + commit (as many times as needed)
git add src/app/api/new-route/route.ts
git commit -m "feat: add new API route for X"

# 4. Push branch + create Pull Request
git push -u origin feat/my-feature
gh pr create --title "feat: add new API route for X" --body "What and why"

# 5. CI runs automatically (lint + build) — wait until green
# 6. Test Vercel Preview URL (link appears in the PR)
# 7. Merge PR (Squash and Merge recommended → clean history)
# 8. Branch is automatically deleted after merge
```

### What Happens Automatically

| Event | What happens |
|---|---|
| Open PR to `main` | GitHub Actions CI: lint + build |
| Open PR to `main` | Vercel creates Preview Deployment with unique URL |
| Merge PR → `main` | Vercel deploys to production (`app.gotofu.io`) |

### Who Can Merge?

Currently: **Anyone with repo access** can merge PRs — GitHub Free doesn't allow Branch Protection on private repos. Safety comes from:

1. **CI must be green** — lint + build must pass
2. **Test Vercel Preview** — check the preview URL before merging
3. **Discipline** — never push directly to main, always use a PR

> On upgrade to GitHub Pro: Enable Branch Protection Rules (CI required, optional review required).

### Commit Convention

```
feat: new feature
fix:  bug fix
chore: maintenance (dependencies, config)
docs: documentation only
```

---

## Environment Variables

See [`.env.example`](.env.example) for all variables with descriptions.

**Important:** You need **two** `.env` files with the same values:
- `.env.local` — read by Next.js
- `.env` — read by Prisma CLI (it can't read `.env.local`)

---

## Deployment

One repo, two Vercel projects with different root directories:

| Project | Domain | Root Directory |
|---|---|---|
| `gotofu-app` | `app.gotofu.io` | `/` (root) |
| `gotofu-landing` | `gotofu.io` | `apps/landing/` |

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
