import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getStudy, getStudyTranscripts } from "@/lib/db/queries/studies";
import { getUserRole } from "@/lib/db/queries/organizations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const { studyId } = await params;

  // Auth
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

  const study = await getStudy(studyId);
  if (!study) {
    return Response.json({ error: "Study not found" }, { status: 404 });
  }
  const role = await getUserRole(study.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const transcripts = await getStudyTranscripts(studyId);

  // Build CSV
  const rows: string[] = [
    "Session,Persona,Archetype,Occupation,Age,Role,Message,Timestamp",
  ];

  for (const session of transcripts) {
    const p = session.persona;
    for (const msg of session.messages) {
      const role = msg.role === "INTERVIEWER" ? "Interviewer" : p.name;
      const escaped = msg.content.replace(/"/g, '""');
      rows.push(
        `"${p.name}","${p.name}","${p.archetype || ""}","${p.occupation || ""}",${p.age || ""},"${role}","${escaped}","${msg.createdAt.toISOString()}"`
      );
    }
  }

  const csv = rows.join("\n");
  const filename = `${study.title.replace(/[^a-zA-Z0-9]/g, "_")}_transcripts.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
