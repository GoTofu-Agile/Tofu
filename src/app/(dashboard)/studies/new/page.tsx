import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getPersonaGroupsForOrg } from "@/lib/db/queries/personas";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { CreateStudyForm } from "@/components/studies/create-study-form";

export default async function NewStudyPage() {
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const [groups, orgContext] = await Promise.all([
    getPersonaGroupsForOrg(activeOrgId),
    getOrgProductContext(activeOrgId),
  ]);

  const productContext =
    orgContext?.setupCompleted
      ? {
          productName: orgContext.productName,
          productDescription: orgContext.productDescription,
          targetAudience: orgContext.targetAudience,
          industry: orgContext.industry,
        }
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">New Study</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a study to gather insights from your synthetic personas.
        </p>
      </div>
      <CreateStudyForm personaGroups={groups} orgContext={productContext} />
    </div>
  );
}
