import { requireAuthWithActiveOrg } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { getPersonaCreationContext } from "@/lib/personas/persona-creation-context";
import { UnifiedCreationFlow } from "@/components/personas/creation/unified-creation-flow";
import { MotionPageEnter } from "@/components/motion/page-motion";
import { SetupContextCallout } from "@/components/onboarding/setup-context-callout";
import { PersonaCreationWalkthrough } from "@/components/personas/persona-creation-walkthrough";

export default async function NewPersonaGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>;
}) {
  const { activeOrgId } = await requireAuthWithActiveOrg();
  const [productContext, creationContext, personaGroupCount] = await Promise.all([
    getOrgProductContext(activeOrgId),
    getPersonaCreationContext(activeOrgId),
    prisma.personaGroup.count({ where: { organizationId: activeOrgId } }),
  ]);
  const q = await searchParams;
  const prefill = q.prefill?.trim() || undefined;

  return (
    <MotionPageEnter>
      {!productContext?.setupCompleted ? (
        <div className="mb-6">
          <SetupContextCallout
            orgId={activeOrgId}
            variant={personaGroupCount > 0 ? "optional" : "primary"}
          />
        </div>
      ) : null}
      <PersonaCreationWalkthrough orgId={activeOrgId} autoOpen={personaGroupCount === 0} />
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
