"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FlaskConical, MessageSquare, Users, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MotionListRow } from "@/components/motion/page-motion";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

type RecentStudy = {
  id: string;
  title: string;
  status: string;
  sessions: number;
};

type RecentGroup = {
  id: string;
  name: string;
  personaCount: number;
};

export function DashboardRecentStudiesBlock({
  studies,
}: {
  studies: RecentStudy[];
}) {
  const reduced = useReducedMotion();

  if (studies.length === 0) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed p-8 text-center"
      >
        <motion.div
          animate={reduced ? undefined : { y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/30" />
        </motion.div>
        <p className="mt-3 text-sm text-muted-foreground">No studies yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Studies are where interviews run and insights are generated.
        </p>
        <Link
          href="/studies/new"
          className="mt-3 inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Create your first study
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {studies.map((study, i) => (
        <MotionListRow key={study.id} index={i}>
          <Link
            href={`/studies/${study.id}`}
            className="flex items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-muted/20"
          >
            <div className="flex min-w-0 items-center gap-3">
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{study.title}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">{study.sessions} sessions</span>
              <Badge variant="secondary" className={`text-[10px] ${statusColors[study.status]}`}>
                {study.status.toLowerCase()}
              </Badge>
            </div>
          </Link>
        </MotionListRow>
      ))}
    </div>
  );
}

export function DashboardRecentPersonasBlock({
  groups,
}: {
  groups: RecentGroup[];
}) {
  const reduced = useReducedMotion();

  if (groups.length === 0) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed p-8 text-center"
      >
        <motion.div
          animate={reduced ? undefined : { y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <Users className="mx-auto h-8 w-8 text-muted-foreground/30" />
        </motion.div>
        <p className="mt-3 text-sm text-muted-foreground">No persona groups yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Create a group first, then use it in studies.</p>
        <Link
          href="/personas/new"
          className="mt-3 inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Create your first personas
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group, i) => (
        <MotionListRow key={group.id} index={i}>
          <Link
            href={`/personas/${group.id}`}
            className="flex items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-muted/20"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{group.name}</span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{group.personaCount} personas</span>
          </Link>
        </MotionListRow>
      ))}
    </div>
  );
}

export function DashboardRecentSectionHeader({
  title,
  href,
  showViewAll,
}: {
  title: string;
  href: string;
  showViewAll: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {showViewAll && (
        <Link
          href={href}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
