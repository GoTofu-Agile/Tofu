"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

function storageKey(orgId: string) {
  return `gotofu:onboarding:context-nudge-dismissed:${orgId}`;
}

export type SetupContextCalloutVariant = "primary" | "optional";

/**
 * Nudge to complete product context without opening Settings.
 * Existing users can dismiss per workspace (localStorage, this browser only).
 */
export function SetupContextCallout({
  orgId,
  variant = "primary",
}: {
  orgId: string;
  variant?: SetupContextCalloutVariant;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      if (window.localStorage.getItem(storageKey(orgId)) === "1") {
        requestAnimationFrame(() => {
          if (!cancelled) setDismissed(true);
        });
      }
    } catch {
      // ignore
    }
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey(orgId), "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  const copy =
    variant === "optional"
      ? {
          title: "Optional: product context",
          body: "If results feel too generic, add a one-minute summary of what you build and who it’s for. You can do this anytime.",
          cta: "Add context",
        }
      : {
          title: "Start with product context",
          body: "About a minute. We use it so personas and interview guides match your product—not a random template.",
          cta: "Add context",
        };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:pr-12",
        variant === "optional"
          ? "border-border bg-muted/20"
          : "border-foreground/10 bg-muted/30"
      )}
      role="region"
      aria-label="Product context reminder"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:top-1/2 sm:-translate-y-1/2"
        aria-label="Dismiss this reminder"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <p className="max-w-2xl pr-8 text-sm leading-snug text-foreground sm:pr-0">
        <span className="font-medium">{copy.title}</span>
        <span className="text-muted-foreground"> {copy.body}</span>
      </p>
      <Link
        href="/setup/product-context"
        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        {copy.cta}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
