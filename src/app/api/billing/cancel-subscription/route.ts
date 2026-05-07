import { NextRequest } from "next/server";
import { requireAuth, resolveActiveOrganizationId } from "@/lib/auth";
import { getStripeServerClient, subscriptionCurrentPeriodEnd } from "@/lib/billing/stripe";
import { BillingPlanTier, markSubscriptionUpdated } from "@/lib/billing/credits";

function tierFromMetadata(planTierRaw: string | undefined): BillingPlanTier | null {
  if (planTierRaw === "pilot" || planTierRaw === "builder" || planTierRaw === "studio") {
    return planTierRaw;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const activeOrgId = await resolveActiveOrganizationId(
      request.cookies.get("activeOrgId")?.value,
      user.id
    );
    if (!activeOrgId) {
      return Response.json({ error: "No active workspace" }, { status: 400 });
    }

    const stripe = getStripeServerClient();
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 10,
    });
    const customer = customers.data.find(
      (c) =>
        !c.deleted &&
        c.metadata?.userId === user.id &&
        (!c.metadata?.organizationId || c.metadata.organizationId === activeOrgId)
    );

    if (!customer) {
      return Response.json({ error: "No billing profile found for this workspace." }, { status: 400 });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    const subscription =
      subscriptions.data.find((s) => s.status === "active" || s.status === "trialing") ??
      subscriptions.data[0];
    if (!subscription) {
      return Response.json({ error: "No subscription found to cancel." }, { status: 400 });
    }

    let updated = subscription;
    if (!subscription.cancel_at_period_end) {
      updated = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
    }

    const planTier = tierFromMetadata(updated.metadata?.planTier);
    const currentPeriodEnd = subscriptionCurrentPeriodEnd(updated);
    await markSubscriptionUpdated({
      userId: user.id,
      organizationId: activeOrgId,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: updated.id,
      status: updated.status,
      planTier,
      cancelAtPeriodEnd: updated.cancel_at_period_end ?? true,
      currentPeriodEnd,
    });

    return Response.json({
      scheduled: updated.cancel_at_period_end ?? true,
      currentPeriodEnd,
      planTier,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to schedule cancellation.";
    return Response.json({ error: message }, { status: 500 });
  }
}

