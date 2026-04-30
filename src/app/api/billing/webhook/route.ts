import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import {
  PLAN_MONTHLY_CREDITS,
  type BillingPlanTier,
  grantCreditsFromInvoice,
  markPaymentFailed,
  markSubscriptionCanceled,
  markSubscriptionUpdated,
} from "@/lib/billing/credits";
import {
  assertStripeEnvConfigured,
  getStripeServerClient,
  getStripeWebhookSecret,
  subscriptionCurrentPeriodEnd,
  invoiceSubscriptionId,
} from "@/lib/billing/stripe";

function tierFromSubscription(subscription: Stripe.Subscription): BillingPlanTier | null {
  const metaTier = subscription.metadata.planTier;
  if (metaTier === "pilot" || metaTier === "builder" || metaTier === "studio") {
    return metaTier;
  }
  return null;
}

async function getOrganizationIdForUser(userId: string): Promise<string | null> {
  const member = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  return member?.organizationId ?? null;
}

async function resolveUserFromStripeCustomer(customerId: string): Promise<{
  userId: string;
  organizationId: string;
} | null> {
  const stripe = getStripeServerClient();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  const userId = customer.metadata.userId;
  if (!userId) return null;

  const organizationIdFromMeta = customer.metadata.organizationId;
  const organizationId = organizationIdFromMeta || (await getOrganizationIdForUser(userId));
  if (!organizationId) return null;

  return { userId, organizationId };
}

async function markWebhookEventProcessed(params: {
  eventId: string;
  userId: string;
  organizationId: string;
  type: string;
}) {
  const { eventId, userId, organizationId, type } = params;
  try {
    await prisma.usageLog.create({
      data: {
        id: `stripe_evt_${eventId}`,
        userId,
        organizationId,
        action: "BILLING_STRIPE_EVENT_PROCESSED",
        metadata: { type, eventId },
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    assertStripeEnvConfigured();
    const stripe = getStripeServerClient();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing Stripe signature header", { status: 400 });
    }
    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (!customerId) break;

        const userCtx = await resolveUserFromStripeCustomer(customerId);
        if (!userCtx) break;
        const inserted = await markWebhookEventProcessed({
          eventId: event.id,
          userId: userCtx.userId,
          organizationId: userCtx.organizationId,
          type: event.type,
        });
        if (!inserted) break;

        if (session.subscription) {
          const planTierRaw = session.metadata?.planTier;
          const planTier: BillingPlanTier | null =
            planTierRaw === "pilot" || planTierRaw === "builder" || planTierRaw === "studio"
              ? planTierRaw
              : null;
          await markSubscriptionUpdated({
            userId: userCtx.userId,
            organizationId: userCtx.organizationId,
            stripeCustomerId: customerId,
            stripeSubscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription.id,
            status: "active",
            planTier,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const invoiceId = invoice.id;
        if (!customerId || !subscriptionId || !invoiceId) break;

        const userCtx = await resolveUserFromStripeCustomer(customerId);
        if (!userCtx) break;
        const stripe = getStripeServerClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const planTier = tierFromSubscription(subscription);
        if (!planTier) break;

        await grantCreditsFromInvoice({
          userId: userCtx.userId,
          organizationId: userCtx.organizationId,
          credits: PLAN_MONTHLY_CREDITS[planTier],
          stripeEventId: event.id,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripeInvoiceId: invoiceId,
          planTier,
          amountEurCents:
            typeof invoice.amount_paid === "number" ? invoice.amount_paid : undefined,
        });

        await markSubscriptionUpdated({
          userId: userCtx.userId,
          organizationId: userCtx.organizationId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status: subscription.status,
          planTier,
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
          currentPeriodEnd: subscriptionCurrentPeriodEnd(subscription),
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const invoiceId = invoice.id;
        if (!customerId || !invoiceId) break;
        const userCtx = await resolveUserFromStripeCustomer(customerId);
        if (!userCtx) break;
        const inserted = await markWebhookEventProcessed({
          eventId: event.id,
          userId: userCtx.userId,
          organizationId: userCtx.organizationId,
          type: event.type,
        });
        if (!inserted) break;
        await markPaymentFailed({
          userId: userCtx.userId,
          organizationId: userCtx.organizationId,
          stripeCustomerId: customerId,
          stripeInvoiceId: invoiceId,
          stripeSubscriptionId: invoiceSubscriptionId(invoice),
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const userCtx = await resolveUserFromStripeCustomer(customerId);
        if (!userCtx) break;
        const inserted = await markWebhookEventProcessed({
          eventId: event.id,
          userId: userCtx.userId,
          organizationId: userCtx.organizationId,
          type: event.type,
        });
        if (!inserted) break;
        await markSubscriptionUpdated({
          userId: userCtx.userId,
          organizationId: userCtx.organizationId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          planTier: tierFromSubscription(subscription),
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
          currentPeriodEnd: subscriptionCurrentPeriodEnd(subscription),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const userCtx = await resolveUserFromStripeCustomer(customerId);
        if (!userCtx) break;
        const inserted = await markWebhookEventProcessed({
          eventId: event.id,
          userId: userCtx.userId,
          organizationId: userCtx.organizationId,
          type: event.type,
        });
        if (!inserted) break;
        await markSubscriptionCanceled({
          userId: userCtx.userId,
          organizationId: userCtx.organizationId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
        });
        break;
      }

      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }
}
