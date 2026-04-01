"use client";

import { cn } from "@/lib/utils";

interface PersonaDiffViewerProps {
  leftLabel: string;
  rightLabel: string;
  leftText: string;
  rightText: string;
  className?: string;
}

/** Side-by-side comparison for persona iterations (e.g. prompt A vs B). */
export function PersonaDiffViewer({
  leftLabel,
  rightLabel,
  leftText,
  rightText,
  className,
}: PersonaDiffViewerProps) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2",
        className
      )}
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {leftLabel}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {leftText || "—"}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {rightLabel}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {rightText || "—"}
        </p>
      </div>
    </div>
  );
}
