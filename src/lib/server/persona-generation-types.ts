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
