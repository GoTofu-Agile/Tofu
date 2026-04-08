# Performance audit — GoTofu codebase

**Stack:** Next.js 16 (App Router), React 19, Prisma 5, PostgreSQL (Supabase pooler), Vercel.

This document is a **systematic review** plus **implemented fixes**. Use it as a living checklist for regressions.

---

## A. Frontend (rendering, hydration, bundle)

### Findings

| Area | Observation | Risk |
|------|-------------|------|
| Client components | Large interactive surfaces (`assistant-chat`, study flow, persona creation) correctly split; assistant is **dynamically imported** with `ssr: false`. | Low |
| Framer Motion | Used across dashboard/studies; adds JS cost. `useReducedMotion` is used in places — good. | Medium |
| Lucide | Many files import from `lucide-react`. Barrel imports inflate bundles if not optimized. | Medium |
| Re-renders | No systematic audit of every list; study flow uses `useMemo`/`useCallback` in key places. | Low–medium |
| Hydration | No obvious `suppressHydrationWarning` abuse; theme via `next-themes` pattern assumed elsewhere. | Low |

### Implemented

- **`next.config.ts`:** `experimental.optimizePackageImports` for `lucide-react` and `framer-motion` to improve tree-shaking of barrel exports.
- **`poweredByHeader: false`**, **`compress: true`** — minor overhead reduction.

### Follow-ups (not done)

- Run `@next/bundle-analyzer` with `ANALYZE=true` on CI or locally to spot heavy chunks.
- Split rarely opened panels (e.g. large modals) with `dynamic()` if profiler shows them on critical path.
- Prefer **server components** for read-only lists; keep `"use client"` boundaries as low as possible in new code.

---

## B. Next.js App Router

### Findings

| Area | Observation |
|------|----------------|
| Dashboard layout | Runs `requireAuthWithOrgs()` per request — necessary for org switcher; unavoidable cost. |
| `dynamic = "force-dynamic"` | Used on dashboard home — correct for personalized data; no static caching. |
| Suspense | Route-level `loading.tsx` exists for dashboard shell; not every nested route has Suspense. |

### Follow-ups

- Add **route-level Suspense** around heavy server children where TTFB is an issue (measure first).
- Consider **`connection()`** from `next/server` only if you adopt Partial Prerendering patterns later.

---

## C. Bundle size & dependencies

### Heavy / notable deps

- **`ai`**, **`@ai-sdk/*`**, **`inngest`**, **`@tavily/core`** — server-oriented or lazy paths; OK if not in default client graph.
- **`pdf-parse`**, **`canvas-confetti`** — ensure only loaded on routes/features that need them (pdf already `require()` pattern per project rules).
- **`@dicebear/*`** — avatar generation; verify usage is not on every dashboard paint.

### Implemented

- Package import optimization (see A).

### Follow-ups

- Periodically `npx depcheck` or knip for unused deps (manual verification required).

---

## D. Backend / API routes

### Findings

| Pattern | Observation |
|---------|----------------|
| Auth | Most routes: Supabase `getUser` + DB user + `getUserRole` — sequential where parallel is impossible without session. |
| JSON | Large `request.json()` on streaming/chat routes — expected. |
| Blocking | Long LLM work should stay in Inngest or streaming routes — existing pattern. |

### Implemented (indirect)

- Lighter DB access from routes that only needed org/title (see E).

### Follow-ups

- Add **`Cache-Control`** on truly static API responses (rare in this app).
- Where two independent DB reads exist, use **`Promise.all`** (already used on study page).

---

## E. Database (Prisma)

### Findings

| Issue | Detail |
|-------|--------|
| **Over-fetch on study load** | `getStudy` previously included **all** sessions (with message counts). Study UI only needed aggregates + one session per persona for links. |
| **Pending/batch counts** | `run-batch` and server actions used `study.sessions` from that query; any future “cap” would have been **incorrect**. |
| **Indexes** | `Study.organizationId`, `Session.[studyId,status]`, `SessionMessage.[sessionId,sequence]`, `PersonaGroup.organizationId` — sensible. |
| **N+1** | Prisma `include` generally batches; watch raw loops that call DB per row (none flagged in hot path). |

### Implemented

1. **`getStudy` default** omits sessions unless `includeSessions: true` (optional `sessionLimit` when included).
2. **`getStudySessionStats(studyId)`** — parallel `count` + `aggregate` for total/completed/avg duration.
3. **`getPersonaSessionMapForStudy(studyId)`** — single SQL `DISTINCT ON ("personaId")` to pick best session per persona (prefer `COMPLETED`, else newest).
4. **`getPersonaIdsWithSessionsForStudy(studyId)`** — `distinct` personaIds for batch/pending logic.
5. **Study detail page** — uses the above instead of loading every session row.
6. **Export GET** — `select: { title, organizationId }` only before `getStudyTranscripts`.
7. **Prisma log level** — `warn`/`error` in dev, `error` in prod (less noise, slightly less I/O).

### Schema changes

- None (per project rules). Future: composite indexes only after `EXPLAIN ANALYZE` on slow queries.

---

## F. Network

### Findings

- Dashboard and study pages are dynamic; **no** aggressive HTTP caching of HTML (expected for SaaS).
- Client `fetch` to same-origin APIs — rely on browser HTTP/2 multiplexing; avoid duplicate polling (prefer one subscription or Inngest-driven refresh).

### Follow-ups

- Add **stale-while-revalidate** only for safe public assets or ISR pages if you add marketing routes in this app.

---

## G. Caching strategy

| Layer | Status |
|-------|--------|
| Next `fetch` cache | Mostly N/A — data is user-specific. |
| `revalidatePath` / `revalidateTag` | Used after mutations in server actions — good. |
| Edge | Not applied globally; Vercel CDN still caches static assets. |
| DB connection | **Transaction pooler** (port 6543) — required for serverless; documented in `CLAUDE.md`. |

### Follow-ups

- If you add **read-mostly** org settings, consider `unstable_cache` with `tags` + `revalidateTag` (invalidate on settings update only).

---

## H. UX / perceived performance

- Dashboard `loading.tsx` uses shimmer skeletons (prior work).
- Assistant chat lazy-loaded — good for initial paint.

---

## I. Build & runtime

- **Node** `>=20.9.0` — aligned with Next 16.
- **Prisma generate** in `npm run build` — keeps client in sync.

---

## Summary of code changes (this pass)

| File / area | Change |
|-------------|--------|
| `next.config.ts` | `optimizePackageImports`, `poweredByHeader`, `compress` |
| `src/lib/db/queries/studies.ts` | Slim `getStudy`, new session helpers, raw SQL map |
| `src/lib/db/prisma.ts` | Prisma log config |
| `src/app/(dashboard)/studies/[studyId]/page.tsx` | Parallel stats + map queries |
| `src/app/(dashboard)/studies/actions.ts` | Distinct persona ids + session stats for insights/batch |
| `src/app/api/studies/[studyId]/run-batch/route.ts` | Distinct persona ids |
| `src/app/api/studies/[studyId]/export/route.ts` | Minimal study select |

---

## How to verify

1. `npm run build`
2. Open a study with **many** sessions — TTFB and DB time should improve vs. loading full session graph.
3. Batch run / insights triggers — behavior unchanged; counts use DB aggregates.

---

*Last updated: performance pass (DB + Next config + documentation).*
