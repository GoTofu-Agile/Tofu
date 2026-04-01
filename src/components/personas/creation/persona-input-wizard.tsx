"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, HelpCircle, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CREATION_METHOD_OPTIONS,
  type CreationMethod,
} from "./step-method-picker";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { personaTabContent } from "@/components/motion/persona-creation-motion";

const GUIDED_ORDER: CreationMethod[] = [
  "templates",
  "deep-search",
  "ai-generate",
  "manual",
];
const IMPORT_ORDER: CreationMethod[] = ["company-url", "linkedin"];

interface PersonaInputWizardProps {
  chatBar: React.ReactNode;
  onSelectMethod: (method: CreationMethod) => void;
  orgContextHint?: boolean;
}

function MethodTile({
  methodId,
  onSelect,
  index,
}: {
  methodId: CreationMethod;
  onSelect: (m: CreationMethod) => void;
  index: number;
}) {
  const m = CREATION_METHOD_OPTIONS.find((x) => x.id === methodId);
  const reduced = useReducedMotion();
  if (!m || m.comingSoon) return null;
  const Icon = m.icon;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(m.id)}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { delay: Math.min(index * 0.05, 0.35), type: "spring", stiffness: 320, damping: 26 }
      }
      whileHover={reduced ? undefined : { y: -3, boxShadow: "0 12px 32px -12px rgba(0,0,0,0.14)" }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left will-change-transform",
        "hover:border-foreground/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-tight">{m.title}</p>
        <p className="text-xs leading-snug text-muted-foreground">{m.description}</p>
      </div>
      <span
        className={cn(
          "mt-auto inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-medium",
          m.labelClass
        )}
      >
        {m.label}
      </span>
    </motion.button>
  );
}

export function PersonaInputWizard({
  chatBar,
  onSelectMethod,
  orgContextHint,
}: PersonaInputWizardProps) {
  const [tab, setTab] = useState("quick");
  const reduced = useReducedMotion();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">
            Start fast with one line, go guided for control, or import files and URLs.
          </p>
        </div>
        <Sheet>
          <SheetTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "shrink-0 gap-1.5 text-muted-foreground"
            )}
          >
            <HelpCircle className="h-4 w-4" />
            What makes a good persona?
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>What makes a strong persona brief?</SheetTitle>
              <SheetDescription>
                Clear briefs produce more realistic, interview-ready personas.
              </SheetDescription>
            </SheetHeader>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Be specific.</strong> Role, industry,
                  region, and life stage beat generic labels like “tech users.”
                </span>
              </li>
              <li className="flex gap-3">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Name the pain.</strong> What frustrates
                  them today? What would “better” look like?
                </span>
              </li>
              <li className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Add constraints.</strong> Budget,
                  tools they use, team size, or compliance pressures anchor behavior.
                </span>
              </li>
            </ul>
          </SheetContent>
        </Sheet>
      </div>

      {orgContextHint ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.04] px-4 py-3 text-xs text-muted-foreground"
        >
          Product context from Settings is included automatically for richer personas.
        </motion.div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="quick" className="rounded-full px-4 transition-transform active:scale-[0.98]">
            Quick create
          </TabsTrigger>
          <TabsTrigger value="guided" className="rounded-full px-4 transition-transform active:scale-[0.98]">
            Guided
          </TabsTrigger>
          <TabsTrigger value="import" className="rounded-full px-4 transition-transform active:scale-[0.98]">
            Import
          </TabsTrigger>
        </TabsList>

        <div className="relative mt-5 min-h-[12rem]">
          <AnimatePresence mode="wait" initial={false}>
            {tab === "quick" ? (
              <motion.div
                key="quick"
                initial={personaTabContent.initial(reduced)}
                animate={personaTabContent.animate}
                exit={personaTabContent.exit(reduced)}
                transition={personaTabContent.transition(reduced)}
                className="outline-none"
              >
                <p className="mb-3 text-xs text-muted-foreground">
                  Describe who you want in plain language. Press Enter to send — we&apos;ll research
                  and generate in one flow.
                </p>
                {chatBar}
              </motion.div>
            ) : null}

            {tab === "guided" ? (
              <motion.div
                key="guided"
                initial={personaTabContent.initial(reduced)}
                animate={personaTabContent.animate}
                exit={personaTabContent.exit(reduced)}
                transition={personaTabContent.transition(reduced)}
                className="space-y-6 outline-none"
              >
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    From templates & data
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {GUIDED_ORDER.filter((id) => id !== "manual").map((id, i) => (
                      <MethodTile key={id} methodId={id} onSelect={onSelectMethod} index={i} />
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Build manually
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MethodTile methodId="manual" onSelect={onSelectMethod} index={4} />
                  </div>
                </section>
              </motion.div>
            ) : null}

            {tab === "import" ? (
              <motion.div
                key="import"
                initial={personaTabContent.initial(reduced)}
                animate={personaTabContent.animate}
                exit={personaTabContent.exit(reduced)}
                transition={personaTabContent.transition(reduced)}
                className="space-y-4 outline-none"
              >
                <p className="text-xs text-muted-foreground">
                  We&apos;ll extract context from a URL or résumé, then ground personas in real
                  signals where possible.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {IMPORT_ORDER.map((id, i) => (
                    <MethodTile key={id} methodId={id} onSelect={onSelectMethod} index={i} />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}
