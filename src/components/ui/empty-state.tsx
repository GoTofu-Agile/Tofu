import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
  /** Tighter padding for side panels and nested cards. */
  variant = "default",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Primary CTA or secondary actions */
  children?: ReactNode;
  className?: string;
  variant?: "default" | "compact";
}) {
  const compact = variant === "compact";
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/25 text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className
      )}
    >
      {Icon ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground",
            compact ? "mb-3 h-10 w-10" : "mb-4 h-12 w-12"
          )}
        >
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden />
        </div>
      ) : null}
      <h3
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      {description ? (
        <p
          className={cn(
            "max-w-md text-muted-foreground",
            compact ? "mt-1.5 text-xs leading-relaxed" : "mt-2 text-sm leading-relaxed"
          )}
        >
          {description}
        </p>
      ) : null}
      {children ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-2",
            compact ? "mt-4" : "mt-6"
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
