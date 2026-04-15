/** Shared badge class map for Study.status values. */
export const studyStatusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export const studyStatusGlow: Record<string, string> = {
  ACTIVE: "hover:border-green-300 hover:shadow-[0_0_12px_rgba(34,197,94,0.1)]",
  COMPLETED: "hover:border-blue-300 hover:shadow-[0_0_12px_rgba(59,130,246,0.1)]",
  DRAFT: "hover:border-foreground/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
  ARCHIVED: "hover:border-foreground/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
};
