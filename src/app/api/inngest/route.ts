import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runBatchInterview } from "@/lib/inngest/functions/run-batch-interview";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runBatchInterview],
});
