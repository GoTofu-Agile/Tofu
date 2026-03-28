import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { UnifiedCreationFlow } from "@/components/personas/creation/unified-creation-flow";
import { MotionPageEnter } from "@/components/motion/page-motion";

export default async function NewPersonaGroupPage() {
  const { activeOrgId } = await requireAuthWithActiveOrg();
  const productContext = await getOrgProductContext(activeOrgId);

  return (
    <MotionPageEnter>
    <UnifiedCreationFlow
      orgContext={
        productContext?.setupCompleted
          ? {
              productName: productContext.productName ?? undefined,
              productDescription: productContext.productDescription ?? undefined,
              targetAudience: productContext.targetAudience ?? undefined,
              industry: productContext.industry ?? undefined,
              competitors: productContext.competitors ?? undefined,
            }
          : undefined
      }
    />
    </MotionPageEnter>
  );
}
