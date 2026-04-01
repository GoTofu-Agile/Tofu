/**
 * Unified motion language for Framer Motion + CSS.
 * Durations: fast 150ms, normal 250ms, slow 350ms (product standard).
 */

import type { Transition, Variants } from "framer-motion";

export const MOTION_DURATION_S = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
} as const;

export const MOTION_EASE = {
  /** Calm, interface-standard */
  standard: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  /** Snappy out */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
} as const;

/** Spring presets (stiffness / damping) — use with reduced-motion guard. */
export const MOTION_SPRING = {
  page: { type: "spring" as const, stiffness: 300, damping: 28, mass: 0.9 },
  section: { type: "spring" as const, stiffness: 280, damping: 26 },
  card: { type: "spring" as const, stiffness: 300, damping: 25 },
  listRow: { type: "spring" as const, stiffness: 320, damping: 28 },
  tap: { type: "spring" as const, stiffness: 520, damping: 32 },
  hover: { type: "spring" as const, stiffness: 380, damping: 28 },
  tab: { type: "spring" as const, stiffness: 320, damping: 30 },
} as const;

export function transitionNone(): Transition {
  return { duration: 0 };
}

export function pageEnterTransition(reduced: boolean): Transition {
  if (reduced) return transitionNone();
  return MOTION_SPRING.page;
}

export function staggerDelay(index: number, step = 0.06, cap = 0.45): number {
  return Math.min(index * step, cap);
}

/** Fade only */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/** Fade + rise (sections, cards) */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

/** Fade + slight scale (modals, emphasis) */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1 },
};

export function staggerContainer(staggerChildren = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren, delayChildren },
    },
  };
}

/** Tab / small panel cross-fade + slide (≤ ~300ms perceived). */
export function tabPanelTransition(reduced: boolean): Transition {
  if (reduced) return transitionNone();
  return {
    duration: MOTION_DURATION_S.normal,
    ease: MOTION_EASE.standard,
  };
}
