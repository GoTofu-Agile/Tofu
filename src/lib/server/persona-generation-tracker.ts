export type PersonaGenerationStatus = {
  runId: string;
  userId: string;
  groupId: string;
  phase: "starting" | "researching" | "generating" | "done" | "error";
  completed: number;
  total: number;
  currentName: string | null;
  generated: number;
  errors: number;
  message: string | null;
  updatedAt: number;
};

const runs = new Map<string, PersonaGenerationStatus>();

function now() {
  return Date.now();
}

function prune() {
  const cutoff = now() - 1000 * 60 * 60 * 6;
  for (const [runId, run] of runs.entries()) {
    if (run.updatedAt < cutoff) runs.delete(runId);
  }
}

export function initPersonaGenerationRun(input: {
  runId: string;
  userId: string;
  groupId: string;
  total: number;
}) {
  prune();
  runs.set(input.runId, {
    runId: input.runId,
    userId: input.userId,
    groupId: input.groupId,
    phase: "starting",
    completed: 0,
    total: input.total,
    currentName: null,
    generated: 0,
    errors: 0,
    message: null,
    updatedAt: now(),
  });
}

export function updatePersonaGenerationRun(
  runId: string,
  patch: Partial<Omit<PersonaGenerationStatus, "runId" | "userId" | "groupId">>
) {
  const current = runs.get(runId);
  if (!current) return;
  runs.set(runId, {
    ...current,
    ...patch,
    updatedAt: now(),
  });
}

export function getPersonaGenerationRun(runId: string) {
  prune();
  return runs.get(runId) ?? null;
}
