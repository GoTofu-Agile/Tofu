"use client";

import { Loader2, CheckCircle2 } from "lucide-react";

interface GenerationProgressProps {
  completed: number;
  total: number;
  currentName: string;
  done?: boolean;
}

export function GenerationProgress({
  completed,
  total,
  currentName,
  done,
}: GenerationProgressProps) {
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        {done ? (
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
        ) : (
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        )}
        <p className="mt-4 text-lg font-medium">
          {done
            ? `${completed} personas created!`
            : currentName
              ? `Creating "${currentName}"...`
              : "Preparing..."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {completed} of {total} personas
        </p>
      </div>
      <div className="mx-auto max-w-md">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
