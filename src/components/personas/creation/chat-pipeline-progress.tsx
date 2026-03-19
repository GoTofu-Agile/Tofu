"use client";

import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatPipelineStepStatus = "pending" | "active" | "done" | "skipped";

export interface ChatPipelineStepView {
  id: string;
  label: string;
  status: ChatPipelineStepStatus;
}

interface ChatPipelineProgressProps {
  steps: ChatPipelineStepView[];
  genCompleted: number;
  genTotal: number;
  genCurrentName?: string;
}

export function ChatPipelineProgress({
  steps,
  genCompleted,
  genTotal,
  genCurrentName,
}: ChatPipelineProgressProps) {
  const genPct = genTotal > 0 ? (genCompleted / genTotal) * 100 : 0;

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2">
        {steps.map((s) => {
          const icon =
            s.status === "active" ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : s.status === "done" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : s.status === "skipped" ? (
              <CircleDashed className="h-4 w-4 text-muted-foreground" />
            ) : (
              <CircleDashed className="h-4 w-4 text-muted-foreground/60" />
            );

          return (
            <div key={s.id} className="flex items-center gap-2">
              {icon}
              <span
                className={cn(
                  "text-sm",
                  s.status === "pending" && "text-muted-foreground",
                  s.status === "skipped" && "text-muted-foreground",
                  s.status === "active" && "font-medium text-foreground",
                  s.status === "done" && "text-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {genCompleted < genTotal ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          <span className="font-medium">
            {genCompleted >= genTotal && genTotal > 0
              ? `${genCompleted} personas created!`
              : genCurrentName
                ? `Creating \"${genCurrentName}\"...`
                : "Preparing generation..."}
          </span>
          <span className="text-sm text-muted-foreground ml-auto">
            {genCompleted}/{genTotal}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${genPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

