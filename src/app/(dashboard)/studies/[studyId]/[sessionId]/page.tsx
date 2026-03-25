import { notFound } from "next/navigation";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getSession } from "@/lib/db/queries/studies";
import { InterviewChat } from "@/components/studies/interview-chat";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ studyId: string; sessionId: string }>;
}) {
  const { studyId, sessionId } = await params;
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const session = await getSession(sessionId);
  if (
    !session ||
    session.studyId !== studyId ||
    session.study.organizationId !== activeOrgId
  ) {
    notFound();
  }

  // Convert DB messages to chat format
  const initialMessages = session.messages
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      id: m.id,
      role: m.role === "INTERVIEWER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  return (
    <InterviewChat
      sessionId={session.id}
      studyId={studyId}
      studyTitle={session.study.title}
      persona={{
        name: session.persona.name,
        archetype: session.persona.archetype,
        occupation: session.persona.occupation,
        age: session.persona.age,
      }}
      interviewGuide={session.study.interviewGuide}
      initialMessages={initialMessages}
      isCompleted={session.status === "COMPLETED"}
    />
  );
}
