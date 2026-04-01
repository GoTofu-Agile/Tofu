import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { getPersonaCreationContext } from "@/lib/personas/persona-creation-context";
import { UnifiedCreationFlow } from "@/components/personas/creation/unified-creation-flow";
import { MotionPageEnter } from "@/components/motion/page-motion";

export default async function NewPersonaGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>;
}) {
  const { activeOrgId } = await requireAuthWithActiveOrg();
  const productContext = await getOrgProductContext(activeOrgId);
  const creationContext = await getPersonaCreationContext(activeOrgId);
  const q = await searchParams;
  const prefill = q.prefill?.trim() || undefined;

  return (
    <MotionPageEnter>
      <UnifiedCreationFlow
        initialCreationContext={creationContext}
        initialPrompt={prefill}
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
