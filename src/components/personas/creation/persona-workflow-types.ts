export type WorkflowStepStatus = "pending" | "active" | "done" | "skipped";

export type WorkflowSourceStatus = "loading" | "done" | "skipped";

export type WorkflowSourceKind = "appStore" | "playStore" | "webSearch" | "browsed";

export interface WorkflowSourceRow {
  id: string;
  kind: WorkflowSourceKind;
  label: string;
  badge?: string;
  status: WorkflowSourceStatus;
}

export interface WorkflowStepView {
  id: string;
  title: string;
  status: WorkflowStepStatus;
  sources: WorkflowSourceRow[];
  findings: string[];
}

