const LEGACY_PERSONA_GROUP_DISPLAY_NAME: Record<string, string> = {
  "Office Manager (buyer signal)": "Office Manager",
  "Handly BDR / Sales Rep": "Sales Representative",
};

/** Map seeded legacy PersonaGroup.name to the current display label (visual only until DB rename). */
export function resolvePersonaGroupDisplayName(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  return LEGACY_PERSONA_GROUP_DISPLAY_NAME[raw] ?? raw;
}
