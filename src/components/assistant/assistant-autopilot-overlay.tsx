"use client";

import { Check, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistant } from "./assistant-provider";

export function AssistantAutopilotOverlay() {
  const { autopilot } = useAssistant();
  if (!autopilot.active) return null;

  const completed = autopilot.progress?.completed ?? 0;
  const total = autopilot.progress?.total ?? 0;
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((completed / total) * 100))) : 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-white/35 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 grid h-8 w-8 place-items-center rounded-full",
              autopilot.status === "error"
                ? "bg-red-100 text-red-700"
                : autopilot.status === "done"
                  ? "bg-green-100 text-green-700"
                  : "bg-stone-100 text-stone-700"
            )}
          >
            {autopilot.status === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : autopilot.status === "done" ? (
              <Check className="h-4 w-4" />
            ) : (
              <TriangleAlert className="h-4 w-4" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-stone-900">{autopilot.title || "Agent is working"}</p>
              <Sparkles className="h-3.5 w-3.5 text-stone-400" />
            </div>
            <p className="mt-1 text-xs text-stone-600">
              {autopilot.detail ||
                (autopilot.status === "running"
                  ? "Automating workflow across pages..."
                  : autopilot.status === "done"
                    ? "Finished."
                    : "Something went wrong.")}
            </p>

            {autopilot.status !== "error" && total > 0 && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      autopilot.status === "done" ? "bg-green-600" : "bg-stone-700"
                    )}
                    style={{ width: `${autopilot.status === "done" ? 100 : percent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  {autopilot.status === "done" ? `Completed ${total}/${total}` : `${completed}/${total} completed`}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
