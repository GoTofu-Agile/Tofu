"use client";

import type { AppStoreAudienceMappedApp } from "@/lib/validation/schemas";
import { Loader2 } from "lucide-react";

export type AudienceMappingUiStatus = "idle" | "loading" | "success" | "error";

interface AudienceAppMappingPreviewProps {
  status: AudienceMappingUiStatus;
  apps: AppStoreAudienceMappedApp[] | null;
  errorMessage: string | null;
  tavilyDisabled?: boolean;
}

export function AudienceAppMappingPreview({
  status,
  apps,
  errorMessage,
  tavilyDisabled,
}: AudienceAppMappingPreviewProps) {
  if (status === "idle") return null;

  if (status === "loading") {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Finding App Store apps that match your audience…</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {errorMessage || "Something went wrong while matching apps."}
      </div>
    );
  }

  // success
  const list = apps ?? [];
  if (list.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        {tavilyDisabled
          ? "Automatic app discovery is off (no Tavily key). Paste an App Store URL under the App tab instead."
          : "No confident App Store matches for this audience. Try different wording or use the App tab with a direct URL."}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card px-4 py-4">
      <p className="text-xs font-medium text-muted-foreground">
        Apps we&apos;ll use for review research
      </p>
      <ul className="space-y-3">
        {list.map((app) => (
          <li
            key={app.appUrl}
            className="rounded-md border border-border/80 bg-background/60 px-3 py-2.5"
          >
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <span className="text-sm font-medium">{app.appName}</span>
              <span className="break-all text-xs text-muted-foreground">
                {(() => {
                  try {
                    return new URL(app.appUrl).hostname + new URL(app.appUrl).pathname;
                  } catch {
                    return app.appUrl;
                  }
                })()}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {app.reasoning}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
