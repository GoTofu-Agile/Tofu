# GoTofu — Frontend UI/UX Handoff for Agents

## Your Assignment

You are a frontend agent that **exclusively handles styling, interface, UI and UX**. You do NOT change logic, API routes, or DB queries. Only visual components, CSS, layouts, animations.

**Goal:** GoTofu should visually look like ElevenLabs (elevenlabs.io/app). The user has provided several screenshots — that's the reference.

---

## Reference: ElevenLabs Design (from Screenshots)

### Sidebar
- **Expanded (~210px, white/light):** Brand at top ("IIElevenLabs"), Workspace Switcher below (colored dot + name + chevron), Nav Items with icons + text, Section Labels ("Playground", "Products") — normal text, NOT uppercase
- **Collapsed (~56px, dark blue-gray #1E1E2E):** Icons only, centered, tooltip on hover
- **Toggle:** Sidebar icon on the left in topbar (next to page title), MANUAL

### Topbar (~48px)
- Left: Sidebar toggle icon + Page icon + "Home" text (gray, ~14px)
- Right: Pill buttons ("Feedback", "Docs", "Ask") — rounded-full, border, ~12px
- "Ask" button toggles Chat Panel
- NO bottom border

### Chat Panel (~280px, right)
- **Header:** Chat icon + "New chat" left, "+" button + Clock icon right
- **"+"** starts new chat
- **Clock** opens Chat History
- **History View:** "Chat History" header + X button, list of past chats (title + relative time)
- **Messages:** User = dark bubble right, Assistant = no background left
- **Input:** Rounded-full pill at bottom, "Ask anything...", Send button right
- **Background:** White (bg-card), subtle left border

### Floating "Ask anything..." (when Chat is CLOSED)
- Fixed bottom-right (bottom-5 right-5)
- Rounded pill with "Ask anything..." text + round Send icon (dark BG)
- Disappears when chat is open

### Dashboard
- "My Workspace" label (gray, small)
- "Good evening, Daniel" (large, ~28-32px, semibold)
- Feature Cards: Horizontal row, ~140px tall, rounded corners (16px), light shadow, colored icon boxes
- Two-column below: "Latest from the library" + "Create or clone a voice"
- Subtle onboarding checklist

### Colors
- Background: Pure white (#FFFFFF) — ElevenLabs UI uses standard shadcn OKLCH values
- The app (elevenlabs.io/app) uses `#FDFCFC` as page BG (eggshell)
- Borders: Very subtle, almost invisible
- Text: Near-black foreground
- No colored accent except in Feature Card icons

### Font
- ElevenLabs: Inter + Geist Mono
- GoTofu: Geist Sans + Geist Mono (similar enough, do NOT change)

---

## Current GoTofu State (what exists)

### Tech Stack
- Next.js 16, Tailwind CSS v4, shadcn/ui v4 (base-ui), Lucide Icons, Sonner Toasts
- NO `asChild` prop (base-ui instead of Radix)

### Available shadcn/ui Components
`src/components/ui/`: button, input, label, card, separator, avatar, dropdown-menu, tooltip, badge, tabs, sheet, table, skeleton, sonner, select, textarea, progress, dialog

### globals.css Color System
Currently standard shadcn OKLCH values (identical to ElevenLabs UI library). See `/src/app/globals.css`.

### Layout Structure (`src/app/(dashboard)/layout.tsx`)
```
<AssistantProvider>
  <div className="flex h-screen">
    <Sidebar />           // w-14 (collapsed) or w-52 (expanded)
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <Topbar />          // h-12
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
        <AssistantChat /> // w-72, right side, conditional
      </div>
    </div>
    <FloatingAsk />       // fixed bottom-5 right-5
  </div>
</AssistantProvider>
```

### Known Styling Issues
1. **Sidebar collapsed** uses hardcoded `bg-[#1E1E2E]` + `text-white` — should be in design system
2. **OrgSwitcher Avatar** uses hardcoded `bg-orange-500` — should be dynamic or from design system
3. **Dashboard Feature Cards** use Tailwind built-in colors (blue-50, purple-50) not design system tokens
4. **Topbar** has h-12 instead of h-[48px] — minimal, but ElevenLabs is exactly 48px
5. **Chat Panel** is w-72 (288px) — ElevenLabs is closer to ~280px (minimal)
6. **Sidebar Expanded** is w-52 (208px) — ElevenLabs is ~210-220px
7. **Section Labels** in sidebar say "Playground"/"Workspace" — should be adapted to GoTofu context
8. **Active Nav State** in expanded mode uses `font-semibold` without background — correct like ElevenLabs

---

## Files You May Edit

| File | What |
|-------|-----|
| `src/app/globals.css` | CSS variables, colors, fonts, base styles |
| `src/components/layout/sidebar.tsx` | Sidebar expanded/collapsed |
| `src/components/layout/topbar.tsx` | Topbar with toggle + Ask |
| `src/components/layout/org-switcher.tsx` | Workspace switcher |
| `src/components/assistant/assistant-chat.tsx` | Chat Panel (ONLY styling, not logic) |
| `src/components/assistant/floating-ask.tsx` | Floating input |
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard layout (ONLY styling/layout) |
| `src/app/(dashboard)/layout.tsx` | Dashboard layout container |
| `src/components/landing/*.tsx` | All landing page components |
| `src/app/page.tsx` | Landing page composition |

## Files You Must NOT Touch

- `src/app/api/**` — API Routes
- `src/lib/**` — Business logic, DB queries, AI provider
- `prisma/schema.prisma` — DB Schema
- `src/components/studies/**` — Study components (except purely visual)
- `src/components/personas/**` — Persona components (except purely visual)
- `src/components/assistant/assistant-provider.tsx` — State logic

---

## What To Do (Priority)

### 1. Sidebar pixel-perfect like ElevenLabs
- Expanded: White BG, brand at top, workspace switcher, nav items without BG highlight when active, section labels as normal text (not uppercase)
- Collapsed: Dark BG, icons only, tooltip on hover, smooth transition
- Design system colors instead of hardcoded values

### 2. Topbar pixel-perfect
- Sidebar toggle left, page icon + title next to it
- "Ask" pill right, rounded-full
- No bottom border, h-12 (~48px)

### 3. Chat Panel like ElevenLabs
- "New chat" header, "+" and Clock icons
- Chat History view (already implemented, just check styling)
- Input as rounded-full pill
- Subtle left border

### 4. Floating "Ask anything..."
- Already implemented, match styling (pill + round icon button)

### 5. Dashboard
- Feature Cards: Shadows, rounded corners, colored icons
- Two-column: Recent Studies + Persona Groups
- Generally more whitespace, softer shadows

### 6. Landing Page
- Hero stays centered (user wants this)
- Font/styling in ElevenLabs direction
- Warmer tone, softer buttons

---

## Dev Setup

```bash
cd /path/to/SyntheticUserPlatform
npm run dev          # Port 3004
npx next build       # Verify build — MUST pass without errors
```

## Gotchas
- **shadcn/ui v4**: NO `asChild` prop — base-ui instead of Radix
- **Tailwind CSS v4**: No tailwind.config — everything via CSS variables in globals.css
- **DropdownMenuLabel**: MUST be inside `DropdownMenuGroup` (base-ui requirement)
- **Zod v4**: `error.issues` not `error.errors`
