"use client";

import { useState, useEffect } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Returns true when the user's OS has "reduce motion" enabled.
 * SSR-safe: defaults to false on the server.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setPrefersReducedMotion(mql.matches);

    function handleChange(e: MediaQueryListEvent) {
      setPrefersReducedMotion(e.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

/** Framer-motion spring config that respects reduced motion. */
export function safeSpring(
  stiffness: number,
  damping: number,
  reduced: boolean
) {
  if (reduced) return { duration: 0 };
  return { type: "spring" as const, stiffness, damping };
}

/** Returns `false` (skip animation) when reduced motion is on. */
export function safeInitial<T>(value: T, reduced: boolean): T | false {
  return reduced ? false : value;
}
