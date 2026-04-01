"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS } from "@/lib/constants/source-labels";
import type { SourceType } from "@prisma/client";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { MotionStaggerCard } from "@/components/motion/page-motion";

export type PersonaGroupListItem = {
  id: string;
  title: string;
  subtitle: string;
  sourceType: SourceType;
  personaCount: number;
};

export function PersonaGroupsHeader() {
  const reduced = useReducedMotion();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Personas</h2>
        <p className="text-muted-foreground">Create persona groups for your studies.</p>
      </div>
      <motion.div
        whileHover={reduced ? undefined : { scale: 1.05 }}
        whileTap={reduced ? undefined : { scale: 0.97 }}
      >
        <Link
          href="/personas/new"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 h-9 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <Plus className="h-4 w-4" />
          Create Personas
        </Link>
      </motion.div>
    </div>
  );
}

export function PersonaGroupsList({ items }: { items: PersonaGroupListItem[] }) {
  const reduced = useReducedMotion();

  if (items.length === 0) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-dashed p-12 text-center"
      >
        <motion.div
          animate={reduced ? undefined : { y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
        </motion.div>
        <h3 className="mt-4 text-lg font-medium">No persona groups yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with one audience-focused group (for example: &ldquo;SMB founders evaluating analytics
          tools&rdquo;).
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tip: adding Product Context in Settings improves persona quality.
        </p>
        <motion.div
          className="mt-4 inline-block"
          whileHover={reduced ? undefined : { scale: 1.03 }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
        >
          <Link
            href="/personas/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 h-9 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <Plus className="h-4 w-4" />
            Create persona group
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((group, i) => (
        <MotionStaggerCard key={group.id} index={i}>
          <Link
            href={`/personas/${group.id}`}
            className="group flex h-full flex-col rounded-lg border bg-card p-5 transition-colors hover:border-foreground/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-medium group-hover:underline">{group.title}</h3>
                {group.subtitle ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{group.subtitle}</p>
                ) : null}
              </div>
              {group.sourceType !== "PROMPT_GENERATED" ? (
                <Badge
                  variant="secondary"
                  className={`shrink-0 text-[10px] ${SOURCE_LABELS[group.sourceType].className}`}
                >
                  {SOURCE_LABELS[group.sourceType].label}
                </Badge>
              ) : null}
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{group.personaCount} personas</span>
            </div>
          </Link>
        </MotionStaggerCard>
      ))}
    </div>
  );
}
