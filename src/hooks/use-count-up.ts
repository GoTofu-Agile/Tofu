"use client";

import { useEffect, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Animates an integer from `from` to `to` over `durationMs`.
 * When `reducedMotion` is true, snaps to `to` immediately.
 */
export function useCountUp(
  target: number | null | undefined,
  options?: { durationMs?: number; reducedMotion?: boolean }
): number | null {
  const durationMs = options?.durationMs ?? 700;
  const reducedMotion = options?.reducedMotion ?? false;
  const [value, setValue] = useState<number | null>(() =>
    target == null ? null : reducedMotion ? Math.round(target) : 0
  );

  useEffect(() => {
    if (target == null) {
      queueMicrotask(() => setValue(null));
      return;
    }
    const to = Math.round(target);
    if (reducedMotion) {
      queueMicrotask(() => setValue(to));
      return;
    }

    let start: number | null = null;
    let frame: number;
    const from = 0;
    let cancelled = false;

    function tick(now: number) {
      if (cancelled) return;
      if (start === null) start = now;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      setValue(Math.round(from + (to - from) * easeOutCubic(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setValue(0);
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs, reducedMotion]);

  return value;
}
