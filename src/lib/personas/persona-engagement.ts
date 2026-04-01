/**
 * Client-side engagement state (milestones, session counts, prompt history).
 * Complements server data; safe no-ops on server.
 */

export const PERSONA_ENGAGEMENT_STORAGE_KEY = "gotofu-persona-engagement-v1";
const STORAGE_KEY = PERSONA_ENGAGEMENT_STORAGE_KEY;
const MAX_HISTORY = 8;

export type PersonaEngagementState = {
  lifetimeGenerated: number;
  sessionGenerated: number;
  sessionDay: string;
  promptHistory: string[];
  /** Milestone ids user has been notified of */
  milestonesToastSeen: string[];
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultState(): PersonaEngagementState {
  return {
    lifetimeGenerated: 0,
    sessionGenerated: 0,
    sessionDay: today(),
    promptHistory: [],
    milestonesToastSeen: [],
  };
}

export function loadPersonaEngagement(): PersonaEngagementState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PersonaEngagementState>;
    const base = defaultState();
    let sessionGenerated = parsed.sessionGenerated ?? 0;
    let sessionDay = parsed.sessionDay ?? today();
    if (sessionDay !== today()) {
      sessionGenerated = 0;
      sessionDay = today();
    }
    return {
      lifetimeGenerated: Math.max(0, parsed.lifetimeGenerated ?? 0),
      sessionGenerated: Math.max(0, sessionGenerated),
      sessionDay,
      promptHistory: Array.isArray(parsed.promptHistory)
        ? parsed.promptHistory.filter((x) => typeof x === "string").slice(0, MAX_HISTORY)
        : [],
      milestonesToastSeen: Array.isArray(parsed.milestonesToastSeen)
        ? parsed.milestonesToastSeen.filter((x) => typeof x === "string")
        : [],
    };
  } catch {
    return defaultState();
  }
}

function save(state: PersonaEngagementState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

/** Call after a successful batch generation (count = personas created). */
export function recordPersonasGenerated(count: number, lastPrompt?: string): PersonaEngagementState {
  if (typeof window === "undefined" || count <= 0) return loadPersonaEngagement();
  const s = loadPersonaEngagement();
  let sessionGen = s.sessionGenerated;
  let sessionDay = s.sessionDay;
  if (sessionDay !== today()) {
    sessionGen = 0;
    sessionDay = today();
  }
  const next: PersonaEngagementState = {
    ...s,
    lifetimeGenerated: s.lifetimeGenerated + count,
    sessionGenerated: sessionGen + count,
    sessionDay,
    promptHistory: lastPrompt?.trim()
      ? [lastPrompt.trim(), ...s.promptHistory.filter((p) => p !== lastPrompt.trim())].slice(
          0,
          MAX_HISTORY
        )
      : s.promptHistory,
  };
  save(next);
  return next;
}

export const MILESTONE_THRESHOLDS = [1, 5, 10, 25] as const;

export function milestoneLabel(n: number): string {
  if (n === 1) return "First persona batch";
  if (n === 5) return "5 personas generated";
  if (n === 10) return "10 personas generated";
  if (n === 25) return "25 personas — power user";
  return `${n} personas`;
}

/** Next threshold strictly above current lifetime count, or null if past last. */
export function nextMilestoneAfter(currentLifetime: number): number | null {
  for (const t of MILESTONE_THRESHOLDS) {
    if (currentLifetime < t) return t;
  }
  return null;
}

/** Milestone thresholds crossed when lifetime goes from `before` to `after` (exclusive of before, inclusive of after). */
export function getNewlyReachedMilestones(before: number, after: number): number[] {
  if (after <= before) return [];
  return MILESTONE_THRESHOLDS.filter((t) => before < t && after >= t);
}
