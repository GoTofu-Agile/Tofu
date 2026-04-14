/** Keep in sync with `PersonaGenerationFloatingWidget` storage key. */
export const PERSONA_WIDGET_STORAGE_KEY = "personaGenerationWidgetRun";

export function publishPersonaGenerationWidgetRun(payload: {
  runId: string;
  groupId: string;
  total: number;
  phase?: "starting" | "researching" | "generating";
}) {
  if (typeof window === "undefined") return;
  const run = {
    runId: payload.runId,
    groupId: payload.groupId,
    phase: payload.phase ?? "generating",
    completed: 0,
    total: payload.total,
    currentName: null,
    message: null,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(PERSONA_WIDGET_STORAGE_KEY, JSON.stringify(run));
  window.dispatchEvent(new Event("persona-generation-widget-update"));
}
