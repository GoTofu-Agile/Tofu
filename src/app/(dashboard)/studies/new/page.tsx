import { redirect } from "next/navigation";
import { requireAuthWithActiveOrg } from "@/lib/auth";
import { createDraftStudy } from "@/lib/db/queries/studies";

export default async function NewStudyPage() {
  const { activeOrgId, user } = await requireAuthWithActiveOrg();

  const study = await createDraftStudy({
    organizationId: activeOrgId,
    createdById: user.id,
  });

  redirect(`/studies/${study.id}`);
}
