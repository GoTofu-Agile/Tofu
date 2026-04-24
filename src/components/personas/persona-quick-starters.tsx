"use client";

import { motion } from "framer-motion";
import { QUICK_STARTERS } from "@/lib/personas/quick-starters";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

export function PersonaQuickStarters({
  onSelect,
  selectedPrompt,
  className,
}: {
  onSelect: (prompt: string) => void;
  selectedPrompt?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Zap className="size-3.5 text-amber-600 dark:text-amber-500" aria-hidden />
        1-click starters — tap to fill, then press send
      </div>
      <div className="mt-1 flex gap-2 overflow-x-auto px-0.5 pb-1.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUICK_STARTERS.map((s, i) => (
          <motion.button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.prompt)}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : Math.min(i * 0.04, 0.24) }}
            whileHover={reduced ? undefined : { scale: 1.02 }}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            className={cn(
              "shrink-0 rounded-full border bg-card px-3 py-1.5 text-left text-xs font-medium",
              "shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.04]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedPrompt?.trim() === s.prompt.trim() &&
                "border-primary/60 bg-primary/10 text-primary shadow-none"
            )}
          >
            {s.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
