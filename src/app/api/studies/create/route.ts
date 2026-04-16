import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getUserRole } from "@/lib/db/queries/organizations";
import { resolveActiveOrganizationId } from "@/lib/auth";
import { createStudy } from "@/lib/db/queries/studies";
import type { StudyType } from "@prisma/client";

const requestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  interviewGuide: z.string().optional(),
  personaGroupIds: z.array(z.string()).min(1),
});

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

  const activeOrgId = await resolveActiveOrganizationId(
    request.cookies.get("activeOrgId")?.value,
    dbUser.id
  );
  if (!activeOrgId) {
    return Response.json({ error: "No active workspace" }, { status: 400 });
  }

  const role = await getUserRole(activeOrgId, dbUser.id);
  if (!role || (role !== "OWNER" && role !== "ADMIN" && role !== "MEMBER")) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const study = await createStudy({
      organizationId: activeOrgId,
      createdById: dbUser.id,
      title: body.title,
      description: body.description,
      studyType: "INTERVIEW" as StudyType,
      interviewGuide: body.interviewGuide,
      personaGroupIds: body.personaGroupIds,
    });

    return Response.json({
      id: study.id,
      title: study.title,
      url: `/studies/${study.id}`,
      message: `Created study "${study.title}"`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create study";
    return Response.json({ error: message }, { status: 500 });
  }
}

