"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion, safeSpring } from "@/lib/hooks/use-reduced-motion";

interface ResultsSummaryProps {
  summary: string;
  totalInterviews: number;
  avgDurationMs: number;
  sentimentBreakdown: {
    overall: string;
    positivePercent: number;
    negativePercent: number;
    neutralPercent: number;
  } | null;
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1 min";
  return `${minutes} min`;
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = ref.current ?? 0;
    const diff = value - start;
    if (diff === 0) return;

    const duration = 600;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        ref.current = value;
      }
    }

    requestAnimationFrame(tick);
  }, [value]);

  return <>{display}{suffix}</>;
}

export function ResultsSummary({
  summary,
  totalInterviews,
  avgDurationMs,
  sentimentBreakdown,
}: ResultsSummaryProps) {
  const reduced = useReducedMotion();
  const stats = [
    { label: "Interviews", value: totalInterviews, display: <AnimatedNumber value={totalInterviews} /> },
    { label: "Avg Duration", value: null, display: formatDuration(avgDurationMs) },
    ...(sentimentBreakdown
      ? [
          { label: "Positive", value: sentimentBreakdown.positivePercent, display: <span className="text-green-600"><AnimatedNumber value={sentimentBreakdown.positivePercent} suffix="%" /></span> },
          { label: "Negative", value: sentimentBreakdown.negativePercent, display: <span className="text-red-600"><AnimatedNumber value={sentimentBreakdown.negativePercent} suffix="%" /></span> },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-lg border bg-muted/20 p-5"
      >
        <p className="text-sm leading-relaxed">{summary}</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={reduced ? { duration: 0 } : { delay: i * 0.08, type: "spring", stiffness: 400, damping: 25 }}
            className={`rounded-lg border p-3 text-center ${!reduced ? "animate-gloss-sweep" : ""}`}
            style={!reduced ? { animationDelay: `${0.8 + i * 0.15}s` } : undefined}
          >
            <div className="text-2xl font-bold">{stat.display}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
