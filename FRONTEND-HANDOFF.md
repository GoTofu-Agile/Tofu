# GoTofu — Frontend UI/UX Handoff fuer neuen Agent

## Dein Auftrag

Du bist ein Frontend-Agent der sich **ausschliesslich um Styling, Interface, UI und UX** kuemmert. Du aenderst KEINE Logik, KEINE API Routes, KEINE DB Queries. Nur visuelle Komponenten, CSS, Layouts, Animationen.

**Ziel:** GoTofu soll visuell wie ElevenLabs (elevenlabs.io/app) aussehen. Der User hat mehrere Screenshots geliefert — das ist die Referenz.

---

## Referenz: ElevenLabs Design (aus Screenshots)

### Sidebar
- **Expanded (~210px, weiss/hell):** Brand oben ("IIElevenLabs"), Workspace-Switcher darunter (farbiger Dot + Name + Chevron), Nav Items mit Icons + Text, Section Labels ("Playground", "Products") — normaler Text, NICHT uppercase
- **Collapsed (~56px, dunkles Blaugrau #1E1E2E):** Nur Icons, zentriert, Tooltip on hover
- **Toggle:** Sidebar-Icon links in der Topbar (neben Page-Title), MANUELL

### Topbar (~48px)
- Links: Sidebar-Toggle-Icon + Page-Icon + "Home" Text (grau, ~14px)
- Rechts: Pill-Buttons ("Feedback", "Docs", "Ask") — rounded-full, border, ~12px
- "Ask" Button toggled Chat Panel
- KEIN unterer Border

### Chat Panel (~280px, rechts)
- **Header:** Chat-Icon + "New chat" links, "+" Button + Clock-Icon rechts
- **"+"** startet neuen Chat
- **Clock** oeffnet Chat History
- **History View:** "Chat History" Header + X-Button, Liste alter Chats (Titel + relative Zeit)
- **Messages:** User = dunkle Bubble rechts, Assistant = kein Background links
- **Input:** Rounded-full Pill unten, "Ask anything...", Send-Button rechts
- **Hintergrund:** Weiss (bg-card), subtile linke Border

### Floating "Ask anything..." (wenn Chat ZU)
- Fixed unten rechts (bottom-5 right-5)
- Rounded Pill mit "Ask anything..." Text + runder Send-Icon (dunkler BG)
- Verschwindet wenn Chat offen

### Dashboard
- "My Workspace" Label (grau, klein)
- "Good evening, Daniel" (gross, ~28-32px, semibold)
- Feature Cards: Horizontal Row, ~140px hoch, abgerundete Ecken (16px), leichter Schatten, farbige Icon-Boxes
- Two-Column darunter: "Latest from the library" + "Create or clone a voice"
- Subtile Onboarding-Checklist

### Farben
- Background: Reines Weiss (#FFFFFF) — ElevenLabs UI nutzt Standard-shadcn OKLCH Werte
- Die App (elevenlabs.io/app) nutzt `#FDFCFC` als Page-BG (Eggshell)
- Borders: Sehr dezent, fast unsichtbar
- Text: Near-black Foreground
- Kein farbiger Akzent ausser in Feature-Card-Icons

### Font
- ElevenLabs: Inter + Geist Mono
- GoTofu: Geist Sans + Geist Mono (aehnlich genug, NICHT aendern)

---

## Aktueller GoTofu-Stand (was existiert)

### Tech Stack
- Next.js 16, Tailwind CSS v4, shadcn/ui v4 (base-ui), Lucide Icons, Sonner Toasts
- KEIN `asChild` Prop (base-ui statt Radix)

### Verfuegbare shadcn/ui Komponenten
`src/components/ui/`: button, input, label, card, separator, avatar, dropdown-menu, tooltip, badge, tabs, sheet, table, skeleton, sonner, select, textarea, progress, dialog

### globals.css Farbsystem
Aktuell Standard-shadcn OKLCH Werte (identisch mit ElevenLabs UI Library). Siehe `/src/app/globals.css`.

### Layout-Struktur (`src/app/(dashboard)/layout.tsx`)
```
<AssistantProvider>
  <div className="flex h-screen">
    <Sidebar />           // w-14 (collapsed) oder w-52 (expanded)
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <Topbar />          // h-12
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
        <AssistantChat /> // w-72, rechts, conditional
      </div>
    </div>
    <FloatingAsk />       // fixed bottom-5 right-5
  </div>
</AssistantProvider>
```

### Bekannte Styling-Probleme
1. **Sidebar collapsed** nutzt hardcoded `bg-[#1E1E2E]` + `text-white` — sollte ins Design System
2. **OrgSwitcher Avatar** nutzt hardcoded `bg-orange-500` — sollte dynamisch oder aus Design System
3. **Dashboard Feature Cards** nutzen Tailwind Built-in Farben (blue-50, purple-50) nicht Design System Tokens
4. **Topbar** hat h-12 statt h-[48px] — minimal, aber ElevenLabs ist exakt 48px
5. **Chat Panel** ist w-72 (288px) — ElevenLabs ist eher ~280px (minimal)
6. **Sidebar Expanded** ist w-52 (208px) — ElevenLabs ist ~210-220px
7. **Section Labels** in Sidebar sagen "Playground"/"Workspace" — sollten an GoTofu Kontext angepasst werden
8. **Aktiver Nav-State** im Expanded Mode nutzt `font-semibold` ohne Background — korrekt wie ElevenLabs

---

## Dateien die du bearbeiten darfst

| Datei | Was |
|-------|-----|
| `src/app/globals.css` | CSS Variablen, Farben, Fonts, Base Styles |
| `src/components/layout/sidebar.tsx` | Sidebar Expanded/Collapsed |
| `src/components/layout/topbar.tsx` | Topbar mit Toggle + Ask |
| `src/components/layout/org-switcher.tsx` | Workspace Switcher |
| `src/components/assistant/assistant-chat.tsx` | Chat Panel (NUR Styling, nicht Logik) |
| `src/components/assistant/floating-ask.tsx` | Floating Input |
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard Layout (NUR Styling/Layout) |
| `src/app/(dashboard)/layout.tsx` | Dashboard Layout Container |
| `src/components/landing/*.tsx` | Alle Landing Page Komponenten |
| `src/app/page.tsx` | Landing Page Composition |

## Dateien die du NICHT anfassen darfst

- `src/app/api/**` — API Routes
- `src/lib/**` — Business Logic, DB Queries, AI Provider
- `prisma/schema.prisma` — DB Schema
- `src/components/studies/**` — Study Components (ausser rein visuelles)
- `src/components/personas/**` — Persona Components (ausser rein visuelles)
- `src/components/assistant/assistant-provider.tsx` — State Logic

---

## Was zu tun ist (Prioritaet)

### 1. Sidebar pixelgenau wie ElevenLabs
- Expanded: Weisser BG, Brand oben, Workspace-Switcher, Nav Items ohne BG-Highlight bei aktiv, Section Labels als normaler Text (nicht uppercase)
- Collapsed: Dunkler BG, nur Icons, Tooltip bei Hover, smooth Transition
- Design System Farben statt Hardcoded Werte

### 2. Topbar pixelgenau
- Sidebar-Toggle links, Page-Icon + Title daneben
- "Ask" Pill rechts, rounded-full
- Kein Border unten, h-12 (~48px)

### 3. Chat Panel wie ElevenLabs
- "New chat" Header, "+" und Clock Icons
- Chat History View (schon implementiert, nur Styling pruefen)
- Input als Rounded-full Pill
- Dezente linke Border

### 4. Floating "Ask anything..."
- Schon implementiert, Styling matchen (Pill + runder Icon-Button)

### 5. Dashboard
- Feature Cards: Schatten, runde Ecken, farbige Icons
- Two-Column: Recent Studies + Persona Groups
- Generell mehr Whitespace, weichere Schatten

### 6. Landing Page
- Hero bleibt zentriert (User will das so)
- Font/Styling an ElevenLabs Richtung anpassen
- Warmerer Ton, weichere Buttons

---

## Dev Setup

```bash
cd "/Users/danielkourie/My Drive (daniel.kourie@code.berlin)/projects/SyntheticUserPlatform"
npm run dev          # Port 3004
npx next build       # Build verifizieren — MUSS ohne Fehler durchlaufen
```

## Gotchas
- **shadcn/ui v4**: KEIN `asChild` Prop — base-ui statt Radix
- **Tailwind CSS v4**: Kein tailwind.config — alles ueber CSS Variablen in globals.css
- **DropdownMenuLabel**: MUSS innerhalb von `DropdownMenuGroup` sein (base-ui Requirement)
- **Zod v4**: `error.issues` statt `error.errors`
