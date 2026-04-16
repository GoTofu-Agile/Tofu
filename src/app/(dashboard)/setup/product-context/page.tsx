import Link from "next/link";
import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { SetupChatPanel } from "./setup-chat-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setupStepLabel } from "@/lib/onboarding/dashboard-copy";

export default async function ProductContextSetupPage() {
  const { activeOrgId } = await requireAuthWithActiveOrg();
  const [activeOrg, productContext] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { name: true, isPersonal: true },
    }),
    getOrgProductContext(activeOrgId),
  ]);

  const orgName = activeOrg?.isPersonal ? "Personal" : (activeOrg?.name ?? "Workspace");

  if (productContext?.setupCompleted) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Home
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-500" aria-hidden />
            <div className="space-y-1">
              <h1 className="text-lg font-semibold tracking-tight">Product context is set</h1>
              <p className="text-sm text-muted-foreground">
                You can refine it anytime in Settings, or continue with personas and studies.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/personas/new" className={cn(buttonVariants(), "gap-1.5")}>
              Create personas
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
              Edit in Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
