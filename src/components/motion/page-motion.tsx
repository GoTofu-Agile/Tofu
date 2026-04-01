"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { safeInitial, useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import {
  MOTION_SPRING,
  pageEnterTransition,
  staggerDelay,
} from "@/lib/motion/motion-system";
import { cn } from "@/lib/utils";

/** Full-page or hero block: fade + slide up (dashboard / studies entrance). */
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
      initial={safeInitial({ opacity: 0, y: 14 }, reduced)}
      animate={{ opacity: 1, y: 0 }}
      transition={pageEnterTransition(reduced)}
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
      initial={safeInitial({ opacity: 0, y: 18 }, reduced)}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              delay: staggerDelay(index, 0.07),
              ...MOTION_SPRING.section,
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
      initial={safeInitial({ opacity: 0, y: 20 }, reduced)}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { delay: staggerDelay(index, 0.06, 0.6), ...MOTION_SPRING.card }
      }
      whileHover={
        reduced
          ? undefined
          : hoverScale
            ? {
                y: -4,
                scale: 1.02,
                boxShadow: "0 12px 40px -12px rgba(0,0,0,0.12)",
                transition: MOTION_SPRING.card,
              }
            : {
                y: -3,
                transition: MOTION_SPRING.card,
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
      initial={safeInitial({ opacity: 0, x: -10 }, reduced)}
      animate={{ opacity: 1, x: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { delay: staggerDelay(index, 0.05, 0.5), ...MOTION_SPRING.listRow }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
