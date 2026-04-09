export type PersonaProgressPhase = "starting" | "researching" | "generating" | "done" | "error";

export function getPersonaProgressBadgeLabel(phase: PersonaProgressPhase): string {
  if (phase === "done") return "Completed";
  if (phase === "error") return "Paused";
  if (phase === "starting") return "Starting";
  return "In progress";
}

export function getPersonaProgressHeadline(args: {
  phase: PersonaProgressPhase;
  currentName?: string | null;
}): string {
  const { phase, currentName } = args;
  if (phase === "done") return "All personas are ready";
  if (phase === "error") return "Generation paused";
  return currentName || "Starting generation...";
}

export function getPersonaProgressStepCopy(args: {
  phase: "researching" | "generating" | "done";
  researchLabel?: string;
  genCompleted: number;
  genTotal: number;
}): {
  research: string;
  generate: string;
  quality: string;
} {
  const { phase, researchLabel, genCompleted, genTotal } = args;
  return {
    research:
      phase === "researching"
        ? researchLabel || "In progress"
        : "Signals gathered",
    generate:
      phase === "done"
        ? "All personas created"
        : genTotal > 0
          ? `Persona ${genCompleted} of ${genTotal}`
          : "Starting",
    quality: phase === "done" ? "Complete" : "In progress",
  };
}
