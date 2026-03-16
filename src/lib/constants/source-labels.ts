export const SOURCE_LABELS = {
  PROMPT_GENERATED: {
    label: "Prompted",
    className: "bg-muted text-muted-foreground",
  },
  DATA_BASED: {
    label: "Data Backed",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  UPLOAD_BASED: {
    label: "Own Data",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
} as const;

export type SourceTypeKey = keyof typeof SOURCE_LABELS;
