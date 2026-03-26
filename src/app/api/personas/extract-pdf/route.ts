import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";
import { extractedContextSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const dbUser = await getUser(authUser.id);
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let pdfText = "";
  try {
    // Use require for pdf-parse (CJS module)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(buffer);
    pdfText = parsed.text;
  } catch {
    return Response.json({ error: "Could not parse PDF" }, { status: 400 });
  }

  if (!pdfText.trim()) {
    return Response.json({ error: "PDF appears to be empty or image-only" }, { status: 400 });
  }

  // Truncate to avoid token overflow (LinkedIn PDFs are typically short)
  const truncated = pdfText.slice(0, 6000);

  const { object } = await generateObject({
    model: getModel(),
    schema: extractedContextSchema,
    prompt: `You are helping create a synthetic persona based on a LinkedIn profile PDF.

LinkedIn profile content:
${truncated}

Extract a persona based on this real professional profile:
- groupName: A descriptive name for a persona group this person represents (e.g. "Senior Product Managers at FinTech Scale-ups")
- targetUserRole: Their job title / role
- industry: Their industry or domain
- painPoints: Infer 3-5 realistic pain points for someone in their role/industry
- demographicsHints: Location, seniority level, career stage from the profile
- domainContext: A rich paragraph describing this type of user — their background, expertise, challenges, and what makes them tick. Use the profile as inspiration but generalize slightly to represent a persona type, not just this one person.`,
  });

  return Response.json(object);
}
