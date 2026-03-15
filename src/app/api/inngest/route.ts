import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runBatchInterview } from "@/lib/inngest/functions/run-batch-interview";
import { generateInsights } from "@/lib/inngest/functions/generate-insights";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runBatchInterview, generateInsights],
});
