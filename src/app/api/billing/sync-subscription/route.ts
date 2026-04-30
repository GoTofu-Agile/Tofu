import { NextRequest } from "next/server";
import { requireAuth, resolveActiveOrganizationId } from "@/lib/auth";
import { getStripeServerClient, subscriptionCurrentPeriodEnd } from "@/lib/billing/stripe";
import { BillingPlanTier, markSubscriptionUpdated } from "@/lib/billing/credits";

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

    const body = (await request.json().catch(() => ({}))) as {
      sessionId?: string;
      expectedUserId?: string;
      expectedOrgId?: string;
    };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const expectedUserId = typeof body.expectedUserId === "string" ? body.expectedUserId : "";
    const expectedOrgId = typeof body.expectedOrgId === "string" ? body.expectedOrgId : "";

    if (expectedUserId && expectedUserId !== user.id) {
      return Response.json(
        { error: "Authenticated user does not match checkout initiator." },
        { status: 409 }
      );
    }
    if (expectedOrgId && expectedOrgId !== activeOrgId) {
      return Response.json(
        { error: "Active workspace does not match checkout workspace." },
        { status: 409 }
      );
    }

    const stripe = getStripeServerClient();

    let customerIdFromSession: string | null = null;
    let subscriptionIdFromSession: string | null = null;
    let subscriptionStatusFromSession: string | null = null;
    let planTierFromSession: BillingPlanTier | null = null;
    let cancelAtPeriodEndFromSession = false;
    let currentPeriodEndFromSession: number | null = null;

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      customerIdFromSession =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      subscriptionIdFromSession =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;
      if (subscriptionIdFromSession) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionIdFromSession);
        subscriptionStatusFromSession = subscription.status;
        cancelAtPeriodEndFromSession = subscription.cancel_at_period_end ?? false;
        currentPeriodEndFromSession = subscriptionCurrentPeriodEnd(subscription);
        const planTierRaw = subscription.metadata?.planTier;
        planTierFromSession =
          planTierRaw === "pilot" || planTierRaw === "builder" || planTierRaw === "studio"
            ? planTierRaw
            : null;
      }
    }

    const customers = await stripe.customers.list({
      email: user.email,
      limit: 10,
    });
    const customer = customers.data.find(
      (c) => !c.deleted && c.metadata?.userId === user.id
    );

    const effectiveCustomerId = customerIdFromSession ?? (customer ? customer.id : null);
    if (!effectiveCustomerId) {
      return Response.json({ synced: false, reason: "customer_not_found" });
    }

    let preferred:
      | { id: string; status: string }
      | undefined;

    if (subscriptionIdFromSession && subscriptionStatusFromSession) {
      preferred = {
        id: subscriptionIdFromSession,
        status: subscriptionStatusFromSession,
      };
    } else {
      const subscriptions = await stripe.subscriptions.list({
        customer: effectiveCustomerId,
        status: "all",
        limit: 20,
      });
      preferred =
        subscriptions.data.find((s) => s.status === "active" || s.status === "trialing") ??
        subscriptions.data[0];
    }

    if (!preferred) {
      return Response.json({ synced: false, reason: "subscription_not_found" });
    }

    await markSubscriptionUpdated({
      userId: user.id,
      organizationId: activeOrgId,
      stripeCustomerId: effectiveCustomerId,
      stripeSubscriptionId: preferred.id,
      status: preferred.status,
      planTier: planTierFromSession,
      cancelAtPeriodEnd: cancelAtPeriodEndFromSession,
      currentPeriodEnd: currentPeriodEndFromSession,
    });

    return Response.json({
      synced: true,
      status: preferred.status,
      cancelAtPeriodEnd: cancelAtPeriodEndFromSession,
      currentPeriodEnd: currentPeriodEndFromSession,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync subscription";
    return Response.json({ error: message }, { status: 500 });
  }
}

