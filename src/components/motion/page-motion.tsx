"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Full-page or hero block: fade + slide up (studies-style entrance). */
export function MotionPageEnter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 28 }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered section blocks (dashboard pillars).
 * `index` controls delay so sections appear in sequence.
 */
export function MotionStaggerSection({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              delay: Math.min(index * 0.07, 0.45),
              type: "spring",
              stiffness: 280,
              damping: 26,
            }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Grid cards (studies list / persona group cards): spring stagger + hover lift.
 * Matches `studies-list.tsx` card motion.
 */
export function MotionStaggerCard({
  children,
  index,
  className,
  /** Set false for dense cards (e.g. persona) to avoid border glitches from scale. */
  hoverScale = true,
}: {
  children: ReactNode;
  index: number;
  className?: string;
  hoverScale?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { delay: index * 0.06, type: "spring", stiffness: 300, damping: 25 }
      }
      whileHover={
        reduced
          ? undefined
          : hoverScale
            ? {
                y: -4,
                scale: 1.02,
                transition: { type: "spring", stiffness: 400, damping: 25 },
              }
            : {
                y: -3,
                transition: { type: "spring", stiffness: 400, damping: 25 },
              }
      }
      className={cn("h-full min-w-0", className)}
    >
      {children}
    </motion.div>
  );
}

/** Compact list rows (dashboard recent lists): light slide-in stagger. */
export function MotionListRow({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { delay: index * 0.05, type: "spring", stiffness: 320, damping: 28 }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
