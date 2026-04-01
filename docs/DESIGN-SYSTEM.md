# GoTofu design system (app)

Single source of truth for the **main app** (`src/`). The marketing site in `apps/landing/` is a **separate Vercel project** (see `CLAUDE.md`). Changes there affect **gotofu.io** independently, so they are not bundled with app refactors unless you explicitly plan that work. **“Daniel’s approval”** means: align with the founder before editing `apps/landing/`, since it is customer-facing and outside the main app deploy.

## Migrated to `PageHeader` / `EmptyState` (ongoing)

- Settings, Members (incl. personal-workspace empty state), Uploads, Admin
- Personas list header + empty state; Studies list header + empty state; Studies index page shell (`MotionPageEnter`)
- Persona group detail title row (`PageHeader`); generate-personas empty (`EmptyState`)

## Tokens

- **CSS variables** — `src/app/globals.css` (`:root`, `.dark`, `@theme inline`): spacing (`--space-*`), motion durations (`--duration-*`), shell padding (`--page-padding-*`), elevation (`--shadow-*`), semantic `success` / `warning`.
- **Utilities** — `@layer components`: `.ds-page-title`, `.ds-page-description`, `.ds-section-label`, `.ds-skeleton-shimmer`.

## Motion

- **Module** — `src/lib/motion/motion-system.ts` (`MOTION_DURATION_S`, `MOTION_SPRING`, `fadeIn`, `slideUp`, `staggerContainer`, etc.).
- **Wrappers** — `src/components/motion/page-motion.tsx` (`MotionPageEnter`, `MotionStaggerSection`, `MotionStaggerCard`, `MotionListRow`).
- **Persona flows** — `src/components/motion/persona-creation-motion.tsx` imports shared springs from `motion-system`.
- **Accessibility** — always gate with `useReducedMotion()` / `safeInitial()`.

## UI primitives

Shadcn-style components live in `src/components/ui/`. New system pieces:

- `page-header.tsx` — title + description + actions.
- `empty-state.tsx` — dashed panel + optional icon + CTA slot.
- `error-state.tsx` — destructive-tint panel + recovery slot.
- `skeleton.tsx` — `variant="pulse" | "shimmer"`.

## Usage

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MOTION_SPRING, staggerDelay } from "@/lib/motion/motion-system";
```

Prefer **Button** variants from `@/components/ui/button` (`buttonVariants`) — Base UI, no `asChild`.
