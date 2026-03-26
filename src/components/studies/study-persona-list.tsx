"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { startSession } from "@/app/(dashboard)/studies/actions";
import {
  MessageSquare,
  CheckCircle2,
  Loader2,
  Play,
  Eye,
} from "lucide-react";

interface Persona {
  id: string;
  name: string;
  archetype: string | null;
  occupation: string | null;
  age: number | null;
  gender: string | null;
  groupName: string;
}

interface SessionInfo {
  sessionId: string;
  status: string;
}

export function StudyPersonaList({
  personas,
  studyId,
  personaSessionMap,
  onPersonaSelect,
  selectedPersonaId,
  /** When true, persona grid starts inside a collapsed disclosure (post-interview workspace). */
  defaultCollapsed = false,
}: {
  personas: Persona[];
  studyId: string;
  personaSessionMap: Record<string, SessionInfo>;
  /** When set, clicking a persona invokes this instead of navigating away (e.g. inline transcript panel). */
  onPersonaSelect?: (personaId: string) => void | Promise<void>;
  selectedPersonaId?: string;
  defaultCollapsed?: boolean;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);

  async function handleClick(personaId: string) {
    const existing = personaSessionMap[personaId];

    if (onPersonaSelect) {
      if (existing) {
        await onPersonaSelect(personaId);
        return;
      }
      setStarting(personaId);
      try {
        const result = await startSession(studyId, personaId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        await onPersonaSelect(personaId);
      } catch {
        toast.error("Failed to start session");
      } finally {
        setStarting(null);
      }
      return;
    }

    // If session exists, navigate to it
    if (existing) {
      router.push(`/studies/${studyId}/${existing.sessionId}`);
      return;
    }

    // Otherwise, create new session
    setStarting(personaId);
    try {
      const result = await startSession(studyId, personaId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push(`/studies/${studyId}/${result.sessionId}`);
    } catch {
      toast.error("Failed to start session");
    } finally {
      setStarting(null);
    }
  }

  const grid = (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {personas.map((persona) => {
        const session = personaSessionMap[persona.id];
        const isStarting = starting === persona.id;
        const isCompleted = session?.status === "COMPLETED";
        const isRunning = session?.status === "RUNNING";
        const isSelected = selectedPersonaId === persona.id;

        return (
          <button
            key={persona.id}
            onClick={() => handleClick(persona.id)}
            disabled={isStarting}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors disabled:opacity-50 ${
              isSelected ? "ring-2 ring-foreground/20 ring-offset-2 ring-offset-background " : ""
            }${
              isCompleted
                ? "border-green-200 bg-green-50/50 hover:bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 dark:hover:bg-green-900/20"
                : isRunning
                  ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
                  : "hover:border-foreground/20 hover:bg-muted/30"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{persona.name}</p>
                {isCompleted && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                )}
              </div>
              {persona.archetype && (
                <p className="text-xs text-muted-foreground truncate">
                  {persona.archetype}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {persona.occupation && (
                  <Badge variant="outline" className="text-[10px]">
                    {persona.occupation}
                  </Badge>
                )}
                {persona.age && (
                  <Badge variant="outline" className="text-[10px]">
                    {persona.age}y
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {persona.groupName}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-1">
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : isCompleted ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : isRunning ? (
                <MessageSquare className="h-4 w-4 text-amber-600" />
              ) : (
                <Play className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-[9px] text-muted-foreground">
                {isStarting
                  ? ""
                  : isCompleted
                    ? "View"
                    : isRunning
                      ? "Continue"
                      : "Start"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );

  if (defaultCollapsed) {
    return (
      <details className="rounded-lg border border-border/60">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50">
          Personas ({personas.length})
        </summary>
        <div className="border-t p-2">{grid}</div>
      </details>
    );
  }

  return grid;
}
