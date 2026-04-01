"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { buttonVariants } from "@/components/ui/button";

const springTap = { type: "spring" as const, stiffness: 520, damping: 32 };
const springHover = { type: "spring" as const, stiffness: 380, damping: 28 };

/** Subtitle line: “Analyzing” with pulsing dots (respects reduced motion). */
export function PulsingDots({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <span className={cn("inline-flex items-center gap-0.5", className)}>
        {label ? `${label}…` : "…"}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-baseline gap-0.5", className)}>
      {label ? <span>{label}</span> : null}
      <span className="inline-flex gap-px translate-y-[1px]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="inline-block h-0.5 w-0.5 rounded-full bg-current opacity-70"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -1, 0] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
    </span>
  );
}

/** Primary icon-sized submit control with lift + press (GPU-friendly). */
export function MotionPersonaSubmitButton({
  children,
  disabled,
  className,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        buttonVariants({ variant: "default", size: "icon" }),
        "h-8 w-8 shrink-0 rounded-lg will-change-transform",
        className
      )}
      whileHover={
        reduced || disabled
          ? undefined
          : { y: -2, boxShadow: "0 10px 28px -8px rgba(0,0,0,0.22)" }
      }
      whileTap={reduced || disabled ? undefined : { scale: 0.97 }}
      transition={springTap}
    >
      {children}
    </motion.button>
  );
}

/** Ghost text button: micro lift + press (e.g. Improve brief). */
export function MotionGhostTextButton({
  children,
  disabled,
  className,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground outline-none",
        "hover:bg-accent hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-40",
        "will-change-transform",
        className
      )}
      whileHover={reduced || disabled ? undefined : { y: -1 }}
      whileTap={reduced || disabled ? undefined : { scale: 0.97 }}
      transition={springHover}
    >
      {children}
    </motion.button>
  );
}

/** Wizard / step panels: horizontal slide + fade. */
export const personaTabContent = {
  initial: (reduced: boolean) =>
    reduced ? false : { opacity: 0, x: 14 },
  animate: { opacity: 1, x: 0 },
  exit: (reduced: boolean) =>
    reduced ? undefined : { opacity: 0, x: -10 },
  transition: (reduced: boolean) =>
    reduced
      ? { duration: 0 }
      : { type: "spring" as const, stiffness: 320, damping: 30 },
};

/** Phase blocks (pick → form → progress): fade + small rise. */
export const personaPhase = {
  initial: (reduced: boolean) => (reduced ? false : { opacity: 0, y: 10 }),
  animate: { opacity: 1, y: 0 },
  transition: (reduced: boolean) =>
    reduced ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
};
