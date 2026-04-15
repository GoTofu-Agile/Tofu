import { requireAuthWithActiveOrg } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { SettingsForm } from "./settings-form";
import { OrgSetupChat } from "@/components/org/org-setup-chat";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationSettings } from "@/components/settings/notification-settings";

export default async function SettingsPage() {
  const { user, activeOrgId } = await requireAuthWithActiveOrg();
  const [activeOrg, productContext, dbUser] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { name: true, isPersonal: true },
    }),
    getOrgProductContext(activeOrgId),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { notifyPersonaGenComplete: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your workspace settings." />

      <SettingsForm
        orgId={activeOrgId}
        orgName={activeOrg?.name ?? "Workspace"}
      />

      <NotificationSettings
        notifyPersonaGenComplete={dbUser?.notifyPersonaGenComplete ?? true}
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
