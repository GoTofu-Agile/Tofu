import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getStudiesForOrg } from "@/lib/db/queries/studies";
import { StudiesList, StudiesHeader } from "@/components/studies/studies-list";
import { MotionPageEnter } from "@/components/motion/page-motion";

export default async function StudiesPage() {
  const { activeOrgId } = await requireAuthWithActiveOrg();

  const studies = await getStudiesForOrg(activeOrgId);

  return (
    <MotionPageEnter className="space-y-6">
      <StudiesHeader />
      <StudiesList studies={studies} />
    </MotionPageEnter>
  );
}
