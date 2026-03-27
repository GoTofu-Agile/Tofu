"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  CheckCircle2,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonaDetailModal } from "@/components/studies/persona-detail-modal";

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
  defaultCollapsed = false,
  onPersonaSelect,
  selectedPersonaId,
  runningPersonaId,
}: {
  personas: Persona[];
  studyId: string;
  personaSessionMap: Record<string, SessionInfo>;
  defaultCollapsed?: boolean;
  onPersonaSelect?: (personaId: string) => void;
  selectedPersonaId?: string;
  runningPersonaId?: string | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const [detailPersona, setDetailPersona] = useState<Persona | null>(null);

  const COLLAPSED_COUNT = 6;
  const shouldCollapse = personas.length > COLLAPSED_COUNT;
  const visiblePersonas = shouldCollapse && !expanded
    ? personas.slice(0, COLLAPSED_COUNT)
    : personas;

  function handleClick(personaId: string) {
    // If parent provides a select handler, use that (inline preview)
    if (onPersonaSelect) {
      onPersonaSelect(personaId);
      return;
    }
    const existing = personaSessionMap[personaId];
    if (existing) {
      router.push(`/studies/${studyId}/${existing.sessionId}`);
    } else {
      // No session yet — show persona detail modal
      const persona = personas.find((p) => p.id === personaId);
      if (persona) setDetailPersona(persona);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePersonas.map((persona) => {
          const session = personaSessionMap[persona.id];
          const isCompleted = session?.status === "COMPLETED";
          const isRunning = session?.status === "RUNNING" || persona.id === runningPersonaId;
          const hasSession = !!session;
          const isSelected = selectedPersonaId === persona.id;

          return (
            <div
              key={persona.id}
              onClick={() => handleClick(persona.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition-all cursor-pointer",
                isSelected
                  ? "border-foreground/30 bg-foreground/5 ring-1 ring-foreground/10"
                  : isCompleted
                    ? "border-green-200 bg-green-50/50 hover:bg-green-50"
                    : isRunning
                      ? "border-primary/20 bg-primary/5 animate-pulse-glow"
                      : "border-border hover:border-foreground/20"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{persona.name}</p>
                  {isCompleted && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500 animate-scale-in" />
                  )}
                  {isRunning && (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 text-primary animate-spin" />
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
              </div>
              <div className="shrink-0 flex flex-col items-center gap-1">
                {isCompleted ? (
                  <>
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="text-[9px] text-muted-foreground">
                      View
                    </span>
                  </>
                ) : isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-[9px] text-muted-foreground">
                      Running
                    </span>
                  </>
                ) : (
                  <User className="h-4 w-4 text-muted-foreground/40" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {shouldCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show all {personas.length} personas
            </>
          )}
        </button>
      )}

      <PersonaDetailModal
        open={!!detailPersona}
        onOpenChange={(open) => { if (!open) setDetailPersona(null); }}
        persona={detailPersona}
      />
    </div>
  );
}
