"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { startSession } from "@/app/(dashboard)/studies/actions";
import { MessageSquare, CheckCircle2, Loader2 } from "lucide-react";

interface Persona {
  id: string;
  name: string;
  archetype: string | null;
  occupation: string | null;
  age: number | null;
  gender: string | null;
  groupName: string;
}

export function StudyPersonaList({
  personas,
  studyId,
  personasWithSessions,
}: {
  personas: Persona[];
  studyId: string;
  personasWithSessions: string[];
}) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);

  async function handleStartSession(personaId: string) {
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

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {personas.map((persona) => {
        const hasSession = personasWithSessions.includes(persona.id);
        const isStarting = starting === persona.id;

        return (
          <button
            key={persona.id}
            onClick={() => handleStartSession(persona.id)}
            disabled={isStarting}
            className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30 disabled:opacity-50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{persona.name}</p>
                {hasSession && (
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
            <div className="shrink-0">
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
