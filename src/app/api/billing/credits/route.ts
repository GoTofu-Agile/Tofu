import { NextRequest } from "next/server";
import { requireAuth, resolveActiveOrganizationId } from "@/lib/auth";
import {
  getCreditSnapshotForUser,
  getOrgSubscriptionState,
  PLAN_MONTHLY_CREDITS,
} from "@/lib/billing/credits";
import { prisma } from "@/lib/db/prisma";
import { getStripeServerClient } from "@/lib/billing/stripe";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const activeOrgId = await resolveActiveOrganizationId(
      request.cookies.get("activeOrgId")?.value,
      user.id
    );

    if (!activeOrgId) {
      return Response.json({ error: "No active workspace" }, { status: 400 });
    }

    let subscriptionState = await getOrgSubscriptionState(activeOrgId);

    if (subscriptionState.status === "active" || subscriptionState.status === "past_due") {
      const latestSubscriptionLog = await prisma.usageLog.findFirst({
        where: {
          organizationId: activeOrgId,
          userId: user.id,
          action: "BILLING_SUBSCRIPTION_UPDATED",
        },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
      });
      const stripeSubscriptionId =
        ((latestSubscriptionLog?.metadata as { stripeSubscriptionId?: string } | null)
          ?.stripeSubscriptionId ?? null);
      let stripeSubscriptionFound = false;
      if (stripeSubscriptionId) {
        try {
          const stripe = getStripeServerClient();
          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          stripeSubscriptionFound = Boolean(stripeSubscription && typeof stripeSubscription !== "string");
        } catch {
          stripeSubscriptionFound = false;
        }
      }
      if (!stripeSubscriptionFound) {
        subscriptionState = {
          status: "none",
          planTier: null,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        };
      }
    }

    const minimumPaidCredits =
      subscriptionState.status === "active" && subscriptionState.planTier
        ? PLAN_MONTHLY_CREDITS[subscriptionState.planTier]
        : 0;
    const snapshot = await getCreditSnapshotForUser(user.id, activeOrgId, {
      minimumPaidCredits,
    });

    return Response.json({
      ...snapshot,
      mode: "metered",
      currentPlanTier: subscriptionState.planTier,
      cancelAtPeriodEnd: subscriptionState.cancelAtPeriodEnd,
      currentPeriodEnd: subscriptionState.currentPeriodEnd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not authenticated";
    return Response.json({ error: message }, { status: 401 });
  }
}
