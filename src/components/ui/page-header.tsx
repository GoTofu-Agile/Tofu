import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page title row for dashboard routes — consistent hierarchy and spacing.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description != null && description !== false ? (
          typeof description === "string" ? (
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p>
          ) : (
            <div className="max-w-2xl text-base leading-relaxed text-muted-foreground [&_p+p]:mt-2">
              {description}
            </div>
          )
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
