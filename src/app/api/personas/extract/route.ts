import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";
import {
  extractRequestSchema,
  extractedContextSchema,
} from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const dbUser = await getUser(authUser.id);
  if (!dbUser) {
    return Response.json({ error: "User not found" }, { status: 401 });
  }

  let body;
  try {
    body = extractRequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const orgParts: string[] = [];
  if (body.orgContext) {
    const oc = body.orgContext;
    if (oc.productName) orgParts.push(`Product: ${oc.productName}`);
    if (oc.productDescription) orgParts.push(`Description: ${oc.productDescription}`);
    if (oc.targetAudience) orgParts.push(`Target audience: ${oc.targetAudience}`);
    if (oc.industry) orgParts.push(`Industry: ${oc.industry}`);
    if (oc.competitors) orgParts.push(`Competitors: ${oc.competitors}`);
  }
  const orgContextStr = orgParts.length > 0
    ? `\n\nOrganization context:\n${orgParts.join("\n")}`
    : "";

  const { object } = await generateObject({
    model: getModel(),
    schema: extractedContextSchema,
    prompt: `You are helping a user create synthetic personas for user research. Extract structured information from their description.

User input: "${body.freetext}"
${orgContextStr}

Extract:
- groupName: A short descriptive name for this persona group (max 60 chars)
- targetUserRole: The primary role/type of user they're describing (e.g. "ER Nurse", "SaaS Product Manager")
- industry: The industry or domain, or null if unclear
- painPoints: Array of likely pain points for this user type (infer 3-5 even if not explicitly stated)
- demographicsHints: Age range, location, or other demographic hints, or null
- domainContext: A rich paragraph combining ALL available context (user input + org context) that will be fed to the persona generation AI. Include the user description, inferred details about this user type, and any organization context. This should be detailed enough to generate realistic personas.

For short inputs like "ER nurses", infer reasonable details. For longer inputs, preserve all user-provided details.`,
  });

  return Response.json(object);
}
