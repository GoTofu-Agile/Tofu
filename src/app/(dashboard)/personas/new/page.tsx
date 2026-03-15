import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { PersonaCreationFlow } from "@/components/personas/creation/persona-creation-flow";

export default async function NewPersonaGroupPage() {
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);
  const productContext = await getOrgProductContext(activeOrgId);

  return (
    <PersonaCreationFlow
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
  );
}
