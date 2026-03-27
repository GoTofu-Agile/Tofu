"use client";

import { useState } from "react";
import {
  MessageSquare,
  ClipboardList,
  Users2,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Building2,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion, safeSpring } from "@/lib/hooks/use-reduced-motion";
import { SAMPLE_SIZE_GUIDELINES } from "@/lib/ai/mom-test-rules";

const TYPE_CONFIG: Record<string, { label: string; icon: typeof MessageSquare }> = {
  INTERVIEW: { label: "Interview", icon: MessageSquare },
  SURVEY: { label: "Survey", icon: ClipboardList },
  FOCUS_GROUP: { label: "Focus Group", icon: Users2 },
  USABILITY_TEST: { label: "Usability Test", icon: Monitor },
};

interface QuestionPreview {
  index: number;
  text: string;
}

interface SetupPreviewCardProps {
  title: string;
  studyType: string;
  objective: string;
  selectedGroups: Array<{ name: string; personaCount: number; description?: string | null }>;
  totalPersonas: number;
  orgContext?: {
    productName?: string | null;
    productDescription?: string | null;
    targetAudience?: string | null;
    industry?: string | null;
  } | null;
  questions?: QuestionPreview[];
  onEditCompany?: () => void;
}

export function SetupPreviewCard({
  title,
  studyType,
  objective,
  selectedGroups,
  totalPersonas,
  orgContext,
  questions,
  onEditCompany,
}: SetupPreviewCardProps) {
  const reduced = useReducedMotion();
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const typeConfig = TYPE_CONFIG[studyType];
  const guidelines =
    SAMPLE_SIZE_GUIDELINES[studyType as keyof typeof SAMPLE_SIZE_GUIDELINES];
  const isEnough = guidelines ? totalPersonas >= guidelines.min : false;
  const isTooMany = guidelines ? totalPersonas > guidelines.max : false;
  const hasCompany = orgContext?.productName || orgContext?.productDescription;

  return (
    <motion.div
      layout={!reduced}
      className={cn(
        "rounded-2xl border p-5 space-y-4 transition-colors duration-300",
        "bg-gradient-to-br from-background via-muted/5 to-muted/10",
        "backdrop-blur-sm",
        !reduced && "animate-gentle-float"
      )}
    >
      {/* Company context */}
      <AnimatePresence>
        {hasCompany && (
          <motion.div
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {orgContext?.productName || "Your company"}
              </div>
              {onEditCompany && (
                <motion.button
                  onClick={onEditCompany}
                  whileHover={reduced ? undefined : { scale: 1.1 }}
                  whileTap={reduced ? undefined : { scale: 0.9 }}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </motion.button>
              )}
            </div>
            {orgContext?.productDescription && (
              <p className="text-[11px] text-muted-foreground/60 line-clamp-2">
                {orgContext.productDescription}
              </p>
            )}
            {orgContext?.industry && (
              <span className="inline-block text-[10px] text-muted-foreground/50 bg-muted rounded px-1.5 py-0.5">
                {orgContext.industry}
              </span>
            )}
            <div className="h-px bg-border mt-2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title */}
      <div className="min-h-[24px]">
        <AnimatePresence mode="wait">
          {title.trim() ? (
            <motion.h3
              key="title"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-base font-semibold leading-tight"
            >
              {title}
            </motion.h3>
          ) : (
            <motion.div
              key="placeholder"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-5 w-40 rounded-md border border-dashed border-muted-foreground/20 animate-shimmer"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Type badge + Objective inline */}
      <div className="flex items-start gap-2">
        <AnimatePresence mode="wait">
          {typeConfig && (
            <motion.span
              key={studyType}
              initial={reduced ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="inline-flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-0.5 text-[10px] font-medium shrink-0"
            >
              <typeConfig.icon className="h-2.5 w-2.5" />
              {typeConfig.label}
            </motion.span>
          )}
        </AnimatePresence>
        {objective.trim() ? (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {objective}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground/40 italic">No objective set</span>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Persona groups with stacked avatars */}
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {selectedGroups.length > 0 ? (
            selectedGroups.map((group, i) => (
              <motion.div
                key={group.name}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={reduced ? { duration: 0 } : { delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                className="flex items-center gap-2"
              >
                {/* Stacked avatar initials */}
                <div className="flex -space-x-1.5 shrink-0">
                  {Array.from({ length: Math.min(group.personaCount, 4) }).map((_, pi) => (
                    <motion.span
                      key={pi}
                      initial={reduced ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={reduced ? { duration: 0 } : { delay: i * 0.05 + pi * 0.03, type: "spring", stiffness: 400, damping: 20 }}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-[8px] font-bold border-2 border-background"
                    >
                      {pi === 3 && group.personaCount > 4 ? `+${group.personaCount - 3}` : group.name.charAt(pi % group.name.length).toUpperCase()}
                    </motion.span>
                  ))}
                </div>
                <span className="text-xs font-medium truncate flex-1">{group.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {group.personaCount}
                </span>
              </motion.div>
            ))
          ) : (
            <motion.div
              key="empty"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/20" />
              <span className="text-[11px] text-muted-foreground/40">Select groups</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sample size */}
      <AnimatePresence>
        {totalPersonas > 0 && guidelines && (
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={safeSpring(400, 25, reduced)}
            className={cn(
              "rounded-lg px-3 py-2 text-[11px] flex items-center gap-2",
              isEnough && !isTooMany
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            )}
          >
            {isEnough && !isTooMany ? (
              <motion.div
                initial={reduced ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={safeSpring(500, 20, reduced)}
              >
                <CheckCircle2 className="h-3 w-3 shrink-0" />
              </motion.div>
            ) : (
              <AlertTriangle className="h-3 w-3 shrink-0" />
            )}
            <strong>{totalPersonas}</strong> personas · {guidelines.min}-{guidelines.max} recommended
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions dropdown */}
      {questions && questions.filter(q => q.text.trim()).length > 0 && (
        <>
          <div className="h-px bg-border" />
          <div>
            <motion.button
              onClick={() => setQuestionsOpen(!questionsOpen)}
              whileHover={reduced ? undefined : { scale: 1.01 }}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                {questions.filter(q => q.text.trim()).length} interview questions
              </span>
              <motion.div
                animate={{ rotate: questionsOpen ? 180 : 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
              >
                <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
              </motion.div>
            </motion.button>
            <AnimatePresence>
              {questionsOpen && (
                <motion.div
                  initial={reduced ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={safeSpring(300, 30, reduced)}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                    {questions.filter(q => q.text.trim()).map((q, i) => (
                      <motion.p
                        key={q.index}
                        initial={reduced ? false : { opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: reduced ? 0 : i * 0.04 }}
                        className="text-[11px] text-muted-foreground/70 leading-relaxed"
                      >
                        <span className="text-muted-foreground/40 font-mono">{i + 1}.</span>{" "}
                        {q.text.length > 90 ? q.text.slice(0, 90) + "..." : q.text}
                      </motion.p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}
