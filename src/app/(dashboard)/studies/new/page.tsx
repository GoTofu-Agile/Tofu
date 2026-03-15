import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getPersonaGroupsForOrg } from "@/lib/db/queries/personas";
import { CreateStudyForm } from "@/components/studies/create-study-form";

export default async function NewStudyPage() {
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const groups = await getPersonaGroupsForOrg(activeOrgId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">New Study</h2>
        <p className="text-muted-foreground">
          Set up an interview, survey, or focus group with your synthetic personas.
        </p>
      </div>
      <CreateStudyForm personaGroups={groups} />
    </div>
  );
}
