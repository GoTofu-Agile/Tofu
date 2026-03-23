import { requireAuthWithActiveOrg } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { SettingsForm } from "./settings-form";
import { OrgSetupChat } from "@/components/org/org-setup-chat";

export default async function SettingsPage() {
  const { activeOrgId } = await requireAuthWithActiveOrg();
  const activeOrg = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: { name: true, isPersonal: true },
  });
  const productContext = await getOrgProductContext(activeOrgId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your workspace settings.
        </p>
      </div>

      <SettingsForm
        orgId={activeOrgId}
        orgName={activeOrg?.name ?? "Workspace"}
      />

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-medium">Product Context</h3>
          <p className="text-sm text-muted-foreground">
            Tell us about your product so we can create better personas. This info is used as context for all persona generation in this workspace.
          </p>
        </div>
        <OrgSetupChat
          orgId={activeOrgId}
          orgName={activeOrg?.name ?? "Personal"}
          existingData={productContext ? {
            productName: productContext.productName,
            productDescription: productContext.productDescription,
            targetAudience: productContext.targetAudience,
            industry: productContext.industry,
            competitors: productContext.competitors,
          } : undefined}
        />
      </div>
    </div>
  );
}
