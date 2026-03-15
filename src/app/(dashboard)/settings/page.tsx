import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);
  const activeOrg = organizations.find((o) => o.id === activeOrgId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your workspace settings.
        </p>
      </div>
      <SettingsForm
        orgId={activeOrgId}
        orgName={activeOrg?.name ?? ""}
      />
    </div>
  );
}
