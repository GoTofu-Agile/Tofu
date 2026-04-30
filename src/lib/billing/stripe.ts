import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import type { BillingPlanTier } from "@/lib/billing/credits";

/** Current Stripe Billing API: `current_period_end` is on subscription items, not the subscription root. */
export function subscriptionCurrentPeriodEnd(subscription: Stripe.Subscription): number | null {
  const items = subscription.items?.data ?? [];
  if (items.length === 0) return null;
  return Math.max(...items.map((item) => item.current_period_end));
}

/** Subscription id for an invoice lives under `parent.subscription_details` (not top-level `subscription`). */
export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (parent?.type !== "subscription_details" || !parent.subscription_details) {
    return null;
  }
  const sub = parent.subscription_details.subscription;
  if (typeof sub === "string") return sub;
  return sub?.id ?? null;
}

const REQUIRED_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_PILOT_MONTHLY",
  "STRIPE_PRICE_ID_BUILDER_MONTHLY",
  "STRIPE_PRICE_ID_STUDIO_MONTHLY",
  "NEXT_PUBLIC_APP_URL",
] as const;

function getEnv(name: (typeof REQUIRED_ENV_VARS)[number]): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function assertStripeEnvConfigured() {
  for (const key of REQUIRED_ENV_VARS) getEnv(key);
}

let stripeClient: Stripe | null = null;
export function getStripeServerClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  return getEnv("STRIPE_WEBHOOK_SECRET");
}

export function getPriceIdForTier(tier: BillingPlanTier): string {
  switch (tier) {
    case "pilot":
      return getEnv("STRIPE_PRICE_ID_PILOT_MONTHLY");
    case "builder":
      return getEnv("STRIPE_PRICE_ID_BUILDER_MONTHLY");
    case "studio":
      return getEnv("STRIPE_PRICE_ID_STUDIO_MONTHLY");
  }
}

export function getPublicAppUrl(): string {
  return getEnv("NEXT_PUBLIC_APP_URL");
}

export async function getOrCreateStripeCustomerForUser(params: {
  userId: string;
  userEmail: string;
  userName?: string | null;
  organizationId: string;
}) {
  const { userId, userEmail, userName, organizationId } = params;
  const latestCheckout = await prisma.usageLog.findFirst({
    where: {
      userId,
      action: "BILLING_CHECKOUT_SESSION_CREATED",
    },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });

  const existingCustomerId =
    (latestCheckout?.metadata as { stripeCustomerId?: string } | null)?.stripeCustomerId ?? null;
  if (existingCustomerId) {
    const stripe = getStripeServerClient();
    try {
      const existingCustomer = await stripe.customers.retrieve(existingCustomerId);
      if (!existingCustomer.deleted) {
        return existingCustomerId;
      }
    } catch {
    }
  }

  const stripe = getStripeServerClient();
  const customer = await stripe.customers.create({
    email: userEmail,
    name: userName ?? undefined,
    metadata: {
      userId,
      organizationId,
    },
  });
  return customer.id;
}
