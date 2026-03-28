"use client";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("app:analytics", {
      detail: { event, payload, ts: Date.now() },
    })
  );

  try {
    if (typeof window.clarity === "function") {
      window.clarity("event", event, payload);
    }
  } catch {
    // Non-blocking analytics hook.
  }

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", event, payload);
    }
  } catch {
    // Non-blocking analytics hook.
  }
}
