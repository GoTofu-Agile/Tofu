"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface InterviewLiveBarProps {
  studyId: string;
  totalCount: number;
  initialCompleted: number;
  onAllDone: () => void;
  onGoToInsights?: () => void;
}

export function InterviewLiveBar({
  studyId,
  totalCount,
  initialCompleted,
  onAllDone,
  onGoToInsights,
}: InterviewLiveBarProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [currentPersona, setCurrentPersona] = useState<string | null>(null);
  const [lastQuote, setLastQuote] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/studies/${studyId}/live-status`);
    eventSourceRef.current = es;

    es.addEventListener("interview-start", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.personaName) setCurrentPersona(data.personaName);
        if (typeof data.completed === "number") setCompleted(data.completed);
      } catch { /* ignore malformed SSE */ }
    });

    es.addEventListener("interview-complete", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.completed === "number") setCompleted(data.completed);
        if (data.quote) setLastQuote(data.quote);
      } catch { /* ignore */ }
    });

    es.addEventListener("all-done", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.completed === "number") setCompleted(data.completed);
      } catch { /* ignore */ }
      setCurrentPersona(null);
      setIsDone(true);
      es.close();
      onAllDone();
    });

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.completed === "number") setCompleted(data.completed);
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      // SSE reconnects automatically
    };

    return () => {
      es.close();
    };
  }, [studyId, onAllDone]);

  const progress = totalCount > 0 ? (completed / totalCount) * 100 : 0;

  // All done state
  if (isDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="rounded-xl border border-green-200 bg-green-50 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.15 }}
            >
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-green-800">
                All {completed} interviews completed!
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Ready to generate insights from your data.
              </p>
            </div>
          </div>
          {onGoToInsights && (
            <motion.button
              onClick={onGoToInsights}
              whileHover={{ scale: 1.03, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
            >
              Continue to Insights
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.span>
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  // Running state
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="rounded-xl border p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0"
          >
            <Loader2 className="h-4 w-4 text-primary" />
          </motion.div>
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentPersona || "starting"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-medium truncate"
              >
                {currentPersona
                  ? `Interviewing ${currentPersona}...`
                  : "Starting interviews..."}
              </motion.p>
            </AnimatePresence>
            <AnimatePresence>
              {lastQuote && (
                <motion.p
                  key={lastQuote}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground italic truncate mt-0.5"
                >
                  &ldquo;{lastQuote}&rdquo;
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={completed}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="text-sm font-medium text-muted-foreground shrink-0 ml-3 tabular-nums"
          >
            {completed}/{totalCount}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Progress bar with shimmer */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full bg-primary relative overflow-hidden",
            progress > 0 && progress < 100 && "progress-shimmer"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
