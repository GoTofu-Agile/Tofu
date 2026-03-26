"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DashboardFlowCard({
  href,
  icon,
  title,
  description,
  tooltip,
  showTooltip = true,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  tooltip: string;
  showTooltip?: boolean;
}) {
  const router = useRouter();

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`${title}: ${description}`}
      className="group rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer"
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      <div className="flex items-center justify-between">
        {icon}
        {showTooltip ? (
          <Tooltip>
            <TooltipTrigger
              aria-label={`Why ${title}`}
              onClick={(e) => {
                // Keep tooltip interaction from triggering navigation.
                e.stopPropagation();
              }}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground"
            >
              <span className="text-[11px] font-semibold">?</span>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="inline-flex h-5 w-5" aria-hidden="true" />
        )}
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

