"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS } from "@/lib/constants/source-labels";
import type { SourceType } from "@prisma/client";
import { safeInitial, useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { MotionStaggerCard } from "@/components/motion/page-motion";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { pageEnterTransition } from "@/lib/motion/motion-system";

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
    <PageHeader
      title="Personas"
      description="Define who you’re researching—each group is one audience (e.g. role, industry, or behavior)."
      actions={
        <motion.div
          whileHover={reduced ? undefined : { scale: 1.03 }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
        >
          <Link
            href="/personas/new"
            className={buttonVariants({ variant: "default", className: "gap-1.5 px-4" })}
          >
            <Plus className="h-4 w-4" />
            New group
          </Link>
        </motion.div>
      }
    />
  );
}

export function PersonaGroupsList({ items }: { items: PersonaGroupListItem[] }) {
  const reduced = useReducedMotion();

  if (items.length === 0) {
    return (
      <motion.div
        initial={safeInitial({ opacity: 0, y: 12 }, reduced)}
        animate={{ opacity: 1, y: 0 }}
        transition={pageEnterTransition(reduced)}
      >
        <EmptyState
          icon={Users}
          title="No persona groups yet"
          description='Start with one audience-focused group (for example: "SMB founders evaluating analytics tools"). Tip: adding Product Context in Settings improves persona quality.'
        >
          <motion.div
            whileHover={reduced ? undefined : { scale: 1.02 }}
            whileTap={reduced ? undefined : { scale: 0.98 }}
          >
            <Link
              href="/personas/new"
              className={buttonVariants({ variant: "default", className: "gap-1.5" })}
            >
              <Plus className="h-4 w-4" />
              Create persona group
            </Link>
          </motion.div>
        </EmptyState>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((group, i) => (
        <MotionStaggerCard key={group.id} index={i}>
          <Link
            href={`/personas/${group.id}`}
            className="group flex h-full flex-col rounded-lg border bg-card p-5 transition-all duration-200 hover:border-foreground/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
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
                  className={`shrink-0 text-xs ${SOURCE_LABELS[group.sourceType].className}`}
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
