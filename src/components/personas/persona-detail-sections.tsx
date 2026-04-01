"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

interface Section {
  id: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

interface PersonaDetailSectionsProps {
  sections: Section[];
  className?: string;
}

export function PersonaDetailSections({
  sections,
  className,
}: PersonaDetailSectionsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {sections.map((s, i) => (
        <PersonaDisclosure
          key={s.id}
          title={s.title}
          subtitle={s.subtitle}
          defaultOpen={s.defaultOpen ?? i === 0}
        >
          {s.children}
        </PersonaDisclosure>
      ))}
    </div>
  );
}

function PersonaDisclosure({
  title,
  subtitle,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const reduced = useReducedMotion();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        "transition-[box-shadow] duration-300",
        open && "shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="min-w-0 text-left">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduced ? 0 : 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          className="inline-flex shrink-0"
        >
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reduced ? 0 : 0.32,
              ease: [0.25, 0.1, 0.25, 1],
              opacity: { duration: reduced ? 0 : 0.2 },
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 px-4 pb-4 pt-3 text-sm leading-relaxed text-muted-foreground">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
