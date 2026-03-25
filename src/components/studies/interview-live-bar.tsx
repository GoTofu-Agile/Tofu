"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewLiveBarProps {
  studyId: string;
  totalCount: number;
  initialCompleted: number;
  onAllDone: () => void;
  onGoToInsights?: () => void;
}

export function InterviewLiveBar({
  studyId,
  totalCount,
  initialCompleted,
  onAllDone,
  onGoToInsights,
}: InterviewLiveBarProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [currentPersona, setCurrentPersona] = useState<string | null>(null);
  const [lastQuote, setLastQuote] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/studies/${studyId}/live-status`);
    eventSourceRef.current = es;

    es.addEventListener("interview-start", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.personaName) setCurrentPersona(data.personaName);
        if (typeof data.completed === "number") setCompleted(data.completed);
      } catch { /* ignore malformed SSE */ }
    });

    es.addEventListener("interview-complete", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.completed === "number") setCompleted(data.completed);
        if (data.quote) setLastQuote(data.quote);
      } catch { /* ignore */ }
    });

    es.addEventListener("all-done", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.completed === "number") setCompleted(data.completed);
      } catch { /* ignore */ }
      setCurrentPersona(null);
      setIsDone(true);
      es.close();
      onAllDone();
    });

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.completed === "number") setCompleted(data.completed);
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      // SSE reconnects automatically
    };

    return () => {
      es.close();
    };
  }, [studyId, onAllDone]);

  const progress = totalCount > 0 ? (completed / totalCount) * 100 : 0;

  // All done state
  if (isDone) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 animate-scale-in" />
            <div>
              <p className="text-sm font-medium text-green-800">
                All {completed} interviews completed!
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Ready to generate insights from your data.
              </p>
            </div>
          </div>
          {onGoToInsights && (
            <button
              onClick={onGoToInsights}
              className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
            >
              Continue to Insights
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Running state
  return (
    <div className="rounded-xl border p-4 space-y-3 animate-pulse-glow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {currentPersona
                ? `Interviewing ${currentPersona}...`
                : "Starting interviews..."}
            </p>
            {lastQuote && (
              <p className="text-xs text-muted-foreground italic truncate mt-0.5">
                &ldquo;{lastQuote}&rdquo;
              </p>
            )}
          </div>
        </div>
        <span className="text-sm font-medium text-muted-foreground shrink-0 ml-3">
          {completed}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-all duration-500 ease-out",
            progress > 0 && "animate-bar-fill"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
