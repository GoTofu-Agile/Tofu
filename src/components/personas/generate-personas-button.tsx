"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

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
  const router = useRouter();
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
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
        }
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Generation failed"
      );
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [generating, groupId, defaultCount, domainContext, router]);

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
      <div className="rounded-lg border border-dashed p-12 text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <h3 className="text-lg font-medium">Generating personas...</h3>
        </div>
        <div className="mx-auto max-w-md space-y-2">
          <Progress value={percentage}>
            <ProgressLabel>
              {progress.currentName
                ? `Creating "${progress.currentName}"`
                : "Preparing..."}
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
    <div className="rounded-lg border border-dashed p-12 text-center space-y-4">
      <h3 className="text-lg font-medium">No personas yet</h3>
      <p className="text-sm text-muted-foreground">
        Generate AI-powered personas for this group.
      </p>
      <Button onClick={startGeneration} disabled={generating}>
        <Sparkles className="mr-2 h-4 w-4" />
        Generate {defaultCount} Personas
      </Button>
    </div>
  );
}
