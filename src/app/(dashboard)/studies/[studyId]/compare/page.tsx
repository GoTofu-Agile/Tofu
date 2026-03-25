import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getStudyTranscripts } from "@/lib/db/queries/studies";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default async function CompareSessionsPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const study = await prisma.study.findUnique({
    where: { id: studyId },
    select: { id: true, title: true, organizationId: true },
  });
  if (!study || study.organizationId !== activeOrgId) {
    notFound();
  }

  const transcripts = await getStudyTranscripts(studyId);

  if (transcripts.length === 0) {
    return (
      <div className="space-y-6">
        <Link
          href={`/studies/${studyId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to study
        </Link>
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No completed interviews to compare.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/studies/${studyId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to study
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">
            Compare Sessions
          </h2>
          <p className="text-muted-foreground">
            {study.title} — {transcripts.length} interviews side by side
          </p>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(transcripts.length, 3)}, 1fr)` }}>
        {transcripts.slice(0, 3).map((session) => (
          <div key={session.id} className="rounded-lg border overflow-hidden">
            {/* Persona header */}
            <div className="border-b bg-muted/30 p-3">
              <p className="font-medium text-sm">{session.persona.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {session.persona.archetype && (
                  <Badge variant="secondary" className="text-[10px]">
                    {session.persona.archetype}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {session.persona.occupation}
                  {session.persona.age ? `, ${session.persona.age}` : ""}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
              {session.messages.map((msg, i) => (
                <div key={i}>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground mb-0.5">
                    {msg.role === "INTERVIEWER" ? "Interviewer" : session.persona.name}
                  </p>
                  <p className={`text-xs leading-relaxed ${msg.role === "INTERVIEWER" ? "text-muted-foreground" : ""}`}>
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {transcripts.length > 3 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing first 3 of {transcripts.length} sessions. Export CSV for full data.
        </p>
      )}
    </div>
  );
}
