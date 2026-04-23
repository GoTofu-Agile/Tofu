import type { PersonaGenerationStatus } from "@/lib/server/persona-generation-types";
import {
  getPersonaGenerationStatusByRunId,
  savePersonaGenerationStatusToDb,
} from "@/lib/server/persona-generation-db";

export type { PersonaGenerationStatus };

const runs = new Map<string, PersonaGenerationStatus>();
const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

function now() {
  return Date.now();
}

function prune() {
  const cutoff = now() - 1000 * 60 * 60 * 6;
  for (const [runId, run] of runs.entries()) {
    if (run.updatedAt < cutoff) runs.delete(runId);
  }
}

async function persistPersonaGenerationRunFromMap(runId: string) {
  const s = runs.get(runId);
  if (!s) return;
  try {
    await savePersonaGenerationStatusToDb(s);
  } catch (e) {
    console.error("[persona-generation] persist failed:", e);
  }
}

function schedulePersistToDb(runId: string) {
  const existing = persistTimers.get(runId);
  if (existing) clearTimeout(existing);
  persistTimers.set(
    runId,
    setTimeout(() => {
      persistTimers.delete(runId);
      void persistPersonaGenerationRunFromMap(runId);
    }, 400)
  );
}

export async function flushPersonaGenerationPersistence(runId: string) {
  const t = persistTimers.get(runId);
  if (t) {
    clearTimeout(t);
    persistTimers.delete(runId);
  }
  await persistPersonaGenerationRunFromMap(runId);
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
  schedulePersistToDb(input.runId);
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
  schedulePersistToDb(runId);
}

/** Merges in-memory (same instance) with Postgres (all instances / Inngest). */
export async function getPersonaGenerationRun(runId: string): Promise<PersonaGenerationStatus | null> {
  prune();
  const [mem, db] = await Promise.all([Promise.resolve(runs.get(runId) ?? null), getPersonaGenerationStatusByRunId(runId)]);
  if (!mem && !db) return null;
  if (!mem) return db;
  if (!db) return mem;
  return db.updatedAt >= mem.updatedAt ? db : mem;
}
