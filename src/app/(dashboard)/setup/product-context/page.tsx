import Link from "next/link";
import { getActiveOrgId, requireAuthWithOrgs } from "@/lib/auth";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { SetupChatPanel } from "./setup-chat-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setupStepLabel } from "@/lib/onboarding/dashboard-copy";

export default async function ProductContextSetupPage() {
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);
  if (!activeOrgId) {
    throw new Error("No active organization");
  }

  const activeOrg = organizations.find((org) => org.id === activeOrgId);

  let productContext: Awaited<ReturnType<typeof getOrgProductContext>> = null;
  let contextLoadFailed = false;
  try {
    productContext = await getOrgProductContext(activeOrgId);
  } catch (error) {
    contextLoadFailed = true;
    // Keep setup route usable even if context lookup fails for a specific workspace.
    console.error("[setup/product-context] Failed to load existing context", {
      activeOrgId,
      error,
    });
  }

  const orgName = activeOrg?.isPersonal ? "Personal" : (activeOrg?.name ?? "Workspace");

  const existingData = productContext
    ? {
        productName: productContext.productName,
        productDescription: productContext.productDescription,
        targetAudience: productContext.targetAudience,
        industry: productContext.industry,
        competitors: productContext.competitors,
      }
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to Home
      </Link>
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {setupStepLabel(0)}
        </p>
        <h1 className="ds-page-title">Tell us what you&apos;re building</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Chat in your own words (or tap an example). When we&apos;re confident we understood, we save and send you to{" "}
          <span className="font-medium text-foreground">step 2 — create personas</span>. You can edit everything later in
          Settings.
        </p>
        <ol
          className="mt-3 flex list-none flex-wrap gap-2 text-[11px] text-muted-foreground"
          aria-label="Setup order: product context, then personas, then study"
        >
          <li className="rounded-full bg-foreground px-2 py-0.5 font-medium text-background">1 Context</li>
          <li className="rounded-full border border-border px-2 py-0.5">2 Personas</li>
          <li className="rounded-full border border-border px-2 py-0.5">3 Study</li>
        </ol>
      </header>
      {contextLoadFailed ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-foreground">We could not load your saved context.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can still edit and save your product context below. If this keeps happening, contact support.
          </p>
        </div>
      ) : null}
      {productContext?.setupCompleted ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-500" aria-hidden />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Product context already saved</p>
              <p className="text-sm text-muted-foreground">
                You can review or refine it below. Changes save in this workspace and update future personas and studies.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/personas/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
                  Continue to personas
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <Link href="/settings" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Open Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <SetupChatPanel orgId={activeOrgId} orgName={orgName} existingData={existingData} />
      <p className="text-center text-xs text-muted-foreground">
        Prefer the full settings page?{" "}
        <Link href="/settings" className="font-medium text-foreground underline-offset-4 hover:underline">
          Open Settings
        </Link>
      </p>
    </div>
  );
}
