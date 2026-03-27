"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardList, Plus, MessageSquare, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useReducedMotion, safeSpring } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const statusGlow: Record<string, string> = {
  ACTIVE: "hover:border-green-300 hover:shadow-[0_0_12px_rgba(34,197,94,0.1)]",
  COMPLETED: "hover:border-blue-300 hover:shadow-[0_0_12px_rgba(59,130,246,0.1)]",
  DRAFT: "hover:border-foreground/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
  ARCHIVED: "hover:border-foreground/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
};

const typeLabels: Record<string, string> = {
  INTERVIEW: "Interview",
  SURVEY: "Survey",
  FOCUS_GROUP: "Focus Group",
  USABILITY_TEST: "Usability Test",
  CARD_SORT: "Card Sort",
};

interface Study {
  id: string;
  title: string;
  description: string | null;
  status: string;
  studyType: string;
  completedCount: number;
  personaGroups: Array<{ personaGroup: { name: string; personaCount: number } }>;
  _count: { sessions: number };
}

interface StudiesListProps {
  studies: Study[];
}

export function StudiesList({ studies }: StudiesListProps) {
  const reduced = useReducedMotion();

  if (studies.length === 0) {
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
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50" />
        </motion.div>
        <h3 className="mt-4 text-lg font-medium">No studies yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a study to generate a guide, run interviews, and get an insights report.
        </p>
        <Link
          href="/studies/new"
          className="mt-4 inline-flex items-center rounded-lg border px-3 h-9 text-sm font-medium hover:bg-muted transition-colors"
        >
          Create your first study
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {studies.map((study, i) => {
        const totalSessions = study._count.sessions;
        const showProgress = study.status === "ACTIVE" && totalSessions > 0 && study.completedCount < totalSessions;
        const progressPct = totalSessions > 0 ? (study.completedCount / totalSessions) * 100 : 0;

        return (
          <motion.div
            key={study.id}
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={reduced ? undefined : { y: -4, scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 25 } }}
          >
            <Link
              href={`/studies/${study.id}`}
              className={cn(
                "group block rounded-lg border bg-card p-5 transition-all duration-200 relative overflow-hidden",
                statusGlow[study.status] || statusGlow.DRAFT
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium group-hover:underline line-clamp-1">
                  {study.title}
                </h3>
                <Badge
                  variant="secondary"
                  className={cn(
                    "shrink-0 text-[10px]",
                    statusColors[study.status],
                    study.status === "ACTIVE" && !reduced && "animate-pulse"
                  )}
                >
                  {study.status.toLowerCase()}
                </Badge>
              </div>
              {study.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {study.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">
                  {typeLabels[study.studyType] || study.studyType}
                </Badge>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {totalSessions} sessions
                </span>
                {study.completedCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {study.completedCount} done
                  </span>
                )}
                {study.status === "ACTIVE" && study.completedCount === 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Clock className="h-3 w-3" />
                    running
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {study.personaGroups.map((pg) => pg.personaGroup.name).join(", ")}
              </div>
              {/* Mini progress bar for active studies */}
              {showProgress && (
                <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Animated header with the "New Study" button */
export function StudiesHeader() {
  const reduced = useReducedMotion();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Studies</h2>
        <p className="text-muted-foreground">
          Run interview studies with your personas and turn sessions into insights.
        </p>
      </div>
      <motion.div
        whileHover={reduced ? undefined : { scale: 1.05 }}
        whileTap={reduced ? undefined : { scale: 0.97 }}
      >
        <Link
          href="/studies/new"
          className="inline-flex items-center rounded-lg bg-primary px-3 h-9 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors gap-1.5"
        >
          <Plus className="h-4 w-4" />
          New Study
        </Link>
      </motion.div>
    </div>
  );
}
