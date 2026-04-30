import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, resolveActiveOrganizationId } from "@/lib/auth";
import { PLAN_MONTHLY_CREDITS, type BillingPlanTier, markStripeCheckoutStarted } from "@/lib/billing/credits";
import {
  assertStripeEnvConfigured,
  getOrCreateStripeCustomerForUser,
  getPriceIdForTier,
  getPublicAppUrl,
  getStripeServerClient,
} from "@/lib/billing/stripe";

const bodySchema = z.object({
  planTier: z.enum(["pilot", "builder", "studio"]),
});

export async function POST(request: NextRequest) {
  try {
    assertStripeEnvConfigured();
    const user = await requireAuth();
    const activeOrgId = await resolveActiveOrganizationId(
      request.cookies.get("activeOrgId")?.value,
      user.id
    );
    if (!activeOrgId) {
      return Response.json({ error: "No active workspace" }, { status: 400 });
    }

    const payload = bodySchema.parse(await request.json());
    const planTier = payload.planTier as BillingPlanTier;
    const stripe = getStripeServerClient();
    const customerId = await getOrCreateStripeCustomerForUser({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      organizationId: activeOrgId,
    });
    const priceId = getPriceIdForTier(planTier);
    const appUrl = getPublicAppUrl().replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}&expected_user_id=${encodeURIComponent(user.id)}&expected_org_id=${encodeURIComponent(activeOrgId)}`,
      cancel_url: `${appUrl}/dashboard?billing=cancelled`,
      metadata: {
        userId: user.id,
        organizationId: activeOrgId,
        planTier,
        creditsPerMonth: String(PLAN_MONTHLY_CREDITS[planTier]),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          organizationId: activeOrgId,
          planTier,
          creditsPerMonth: String(PLAN_MONTHLY_CREDITS[planTier]),
        },
      },
      allow_promotion_codes: true,
    });

    await markStripeCheckoutStarted({
      userId: user.id,
      organizationId: activeOrgId,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: session.id,
      stripePriceId: priceId,
      planTier,
    });

    if (!session.url) {
      return Response.json({ error: "Failed to start checkout session" }, { status: 500 });
    }
    return Response.json({ checkoutUrl: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid plan selection" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to start checkout";
    return Response.json({ error: message }, { status: 500 });
  }
}
