"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getPersonaProgressBadgeLabel } from "@/lib/personas/progress-copy";

interface GeneratePersonasButtonProps {
  groupId: string;
  defaultCount?: number;
  domainContext?: string;
  autoStart?: boolean;
}

interface ProgressEvent {
  type: "progress";
  completed: number;
  total: number;
  personaName: string;
}

interface DoneEvent {
  type: "done";
  generated: number;
  errors: string[];
}

interface ErrorEvent {
  type: "error";
  message: string;
}

type StreamEvent = ProgressEvent | DoneEvent | ErrorEvent;

export function GeneratePersonasButton({
  groupId,
  defaultCount = 5,
  domainContext,
  autoStart = false,
}: GeneratePersonasButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
    currentName: string;
  } | null>(null);

  const startGeneration = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setProgress({ completed: 0, total: defaultCount, currentName: "" });

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          count: defaultCount,
          domainContext,
          speedMode: "fast",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Generation failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      const MAX_BUFFER_CHARS = 200_000;

      const processStreamLine = (line: string) => {
        if (!line.trim()) return;
        try {
          const event: StreamEvent = JSON.parse(line);

          if (event.type === "progress") {
            setProgress({
              completed: event.completed,
              total: event.total,
              currentName: event.personaName,
            });
          } else if (event.type === "done") {
            if (event.errors.length > 0) {
              toast.warning(
                `Generated ${event.generated} personas. ${event.errors.length} failed.`
              );
            } else {
              toast.success(
                `Generated ${event.generated} personas successfully!`
              );
            }
          } else if (event.type === "error") {
            toast.error(event.message);
          }
        } catch {
          // Skip malformed JSON lines
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        if (buffer.length > MAX_BUFFER_CHARS) {
          throw new Error("Generation stream payload exceeded expected size.");
        }
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          processStreamLine(line);
        }
      }
      if (buffer.trim()) {
        processStreamLine(buffer);
      }

    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Generation failed"
      );
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [generating, groupId, defaultCount, domainContext]);

  useEffect(() => {
    if (autoStart) {
      startGeneration();
    }
    // Only run on mount when autoStart is true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (generating && progress) {
    const percentage =
      progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;

    return (
      <div className="space-y-6 rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto max-w-md space-y-2">
          <Skeleton className="mx-auto h-5 w-48" variant="shimmer" />
          <Skeleton className="mx-auto h-4 w-64" variant="shimmer" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <h3 className="text-lg font-medium">{getPersonaProgressBadgeLabel("generating")}</h3>
        </div>
        <div className="mx-auto max-w-md space-y-2">
          <Progress value={percentage}>
            <ProgressLabel>
              {progress.currentName
                ? `Creating "${progress.currentName}"`
                : "Starting generation..."}
            </ProgressLabel>
            <ProgressValue />
          </Progress>
          <p className="text-sm text-muted-foreground">
            {progress.completed} of {progress.total} personas generated
          </p>
        </div>
      </div>
    );
  }

  return (
    <EmptyState
      icon={Sparkles}
      title="No personas yet"
      description="Generate AI-powered personas for this group."
    >
      <Button onClick={startGeneration} disabled={generating}>
        <Sparkles className="mr-2 h-4 w-4" />
        Generate {defaultCount} Personas
      </Button>
    </EmptyState>
  );
}
