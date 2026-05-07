import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export const FREE_PERSONA_CREDITS = 3;
export const FREE_STUDY_CREDITS = 3;
export const PLAN_MONTHLY_CREDITS = {
  pilot: 100,
  builder: 300,
  studio: 1000,
} as const;

const ACTION_PERSONA_CONSUMED = "BILLING_PERSONA_CREDIT_CONSUMED";
const ACTION_STUDY_CONSUMED = "BILLING_STUDY_CREDIT_CONSUMED";
const ACTION_CREDIT_GRANT = "BILLING_CREDIT_GRANT";
const ACTION_CHECKOUT_SESSION_CREATED = "BILLING_CHECKOUT_SESSION_CREATED";
const ACTION_SUBSCRIPTION_UPDATED = "BILLING_SUBSCRIPTION_UPDATED";
const ACTION_SUBSCRIPTION_CANCELED = "BILLING_SUBSCRIPTION_CANCELED";
const ACTION_PAYMENT_FAILED = "BILLING_PAYMENT_FAILED";

type SubscriptionStatus = "none" | "active" | "past_due" | "canceled";

type CreditKind = "persona" | "study";
export type BillingPlanTier = keyof typeof PLAN_MONTHLY_CREDITS;
type OrgSubscriptionState = {
  status: SubscriptionStatus;
  planTier: BillingPlanTier | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
};

export type CreditSnapshot = {
  limits: {
    persona: number;
    study: number;
  };
  used: {
    persona: number;
    study: number;
  };
  remaining: {
    persona: number;
    study: number;
  };
  total: {
    granted: number;
    consumed: number;
    remaining: number;
  };
};

export class BillingUpgradeRequiredError extends Error {
  readonly code = "BILLING_UPGRADE_REQUIRED";
  readonly snapshot: CreditSnapshot;
  readonly kind: CreditKind;

  constructor(kind: CreditKind, snapshot: CreditSnapshot, message?: string) {
    super(message ?? `No ${kind} credits remaining. Please upgrade to continue.`);
    this.name = "BillingUpgradeRequiredError";
    this.kind = kind;
    this.snapshot = snapshot;
  }
}

function clampRemaining(limit: number, used: number): number {
  return Math.max(0, limit - used);
}

export async function getCreditSnapshotForUser(
  userId: string,
  organizationId: string,
  options?: { minimumPaidCredits?: number }
): Promise<CreditSnapshot> {
  const minimumPaidCredits = options?.minimumPaidCredits ?? 0;
  const [personaUsed, studyUsed, paidCreditsGranted] = await Promise.all([
    prisma.usageLog.count({ where: { userId, organizationId, action: ACTION_PERSONA_CONSUMED } }),
    prisma.usageLog.count({ where: { userId, organizationId, action: ACTION_STUDY_CONSUMED } }),
    prisma.usageLog.aggregate({
      where: { userId, organizationId, action: ACTION_CREDIT_GRANT },
      _sum: { tokensUsed: true },
    }),
  ]);
  const studyUsedCredits = studyUsed * 0.5;
  const totalConsumed = personaUsed + studyUsedCredits;
  const freeCreditsTotal = FREE_PERSONA_CREDITS + FREE_STUDY_CREDITS;
  const paidGranted = Math.max(paidCreditsGranted._sum.tokensUsed ?? 0, minimumPaidCredits);
  const totalGranted = freeCreditsTotal + paidGranted;
  const totalRemaining = clampRemaining(totalGranted, totalConsumed);

  return {
    limits: {
      persona: FREE_PERSONA_CREDITS,
      study: FREE_STUDY_CREDITS,
    },
    used: {
      persona: personaUsed,
      study: studyUsedCredits,
    },
    remaining: {
      persona: clampRemaining(FREE_PERSONA_CREDITS, personaUsed),
      study: clampRemaining(FREE_STUDY_CREDITS, studyUsedCredits),
    },
    total: {
      granted: totalGranted,
      consumed: totalConsumed,
      remaining: totalRemaining,
    },
  };
}

export async function getOrgSubscriptionState(
  organizationId: string
): Promise<OrgSubscriptionState> {
  const latestEvent = await prisma.usageLog.findFirst({
    where: {
      organizationId,
      action: {
        in: [ACTION_SUBSCRIPTION_UPDATED, ACTION_SUBSCRIPTION_CANCELED, ACTION_PAYMENT_FAILED],
      },
    },
    orderBy: { createdAt: "desc" },
    select: { action: true, metadata: true },
  });

  if (!latestEvent) {
    return { status: "none", planTier: null, cancelAtPeriodEnd: false, currentPeriodEnd: null };
  }

  const metadata = (latestEvent.metadata as Record<string, unknown> | null) ?? null;
  const rawPlanTier = metadata?.planTier as string | undefined;
  const planTier: BillingPlanTier | null =
    rawPlanTier === "pilot" || rawPlanTier === "builder" || rawPlanTier === "studio"
      ? rawPlanTier
      : null;
  const cancelAtPeriodEnd = metadata?.cancelAtPeriodEnd === true;
  const currentPeriodEndValue = metadata?.currentPeriodEnd;
  const currentPeriodEnd =
    typeof currentPeriodEndValue === "number" ? currentPeriodEndValue : null;

  if (latestEvent.action === ACTION_SUBSCRIPTION_CANCELED) {
    return { status: "canceled", planTier, cancelAtPeriodEnd, currentPeriodEnd };
  }

  if (latestEvent.action === ACTION_PAYMENT_FAILED) {
    return { status: "past_due", planTier, cancelAtPeriodEnd, currentPeriodEnd };
  }

  const status = metadata?.status as string | undefined;
  if (typeof status === "string") {
    if (status === "active" || status === "trialing") {
      return { status: "active", planTier, cancelAtPeriodEnd, currentPeriodEnd };
    }
    if (status === "past_due" || status === "unpaid") {
      return { status: "past_due", planTier, cancelAtPeriodEnd, currentPeriodEnd };
    }
    if (status === "canceled") {
      return { status: "canceled", planTier, cancelAtPeriodEnd, currentPeriodEnd };
    }
  }
  return { status: "none", planTier, cancelAtPeriodEnd, currentPeriodEnd };
}

export async function orgHasUnlimitedUsage(organizationId: string): Promise<boolean> {
  const { status } = await getOrgSubscriptionState(organizationId);
  return status === "active";
}

export async function consumeCreditOrThrow(params: {
  userId: string;
  organizationId: string;
  kind: CreditKind;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  const { userId, organizationId, kind, metadata, idempotencyKey } = params;
  const requiredCredits = kind === "persona" ? 1 : 0.5;
  const usageLogId = idempotencyKey
    ? `billing_credit_consume_${kind}_${idempotencyKey}`
    : undefined;

  if (usageLogId) {
    const existing = await prisma.usageLog.findUnique({
      where: { id: usageLogId },
      select: { id: true },
    });
    if (existing) return;
  }

  const snapshot = await getCreditSnapshotForUser(userId, organizationId);

  if (snapshot.total.remaining < requiredCredits) {
    throw new BillingUpgradeRequiredError(kind, snapshot);
  }

  try {
    await prisma.usageLog.create({
      data: {
        ...(usageLogId ? { id: usageLogId } : {}),
        userId,
        organizationId,
        action: kind === "persona" ? ACTION_PERSONA_CONSUMED : ACTION_STUDY_CONSUMED,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      usageLogId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Concurrent duplicate request for the same idempotency key; already consumed once.
      return;
    }
    throw error;
  }
}

export async function grantCreditsFromInvoice(params: {
  userId: string;
  organizationId: string;
  credits: number;
  stripeEventId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeInvoiceId: string;
  planTier: BillingPlanTier;
  amountEurCents?: number;
}) {
  const {
    userId,
    organizationId,
    credits,
    stripeEventId,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeInvoiceId,
    planTier,
    amountEurCents,
  } = params;
  if (credits <= 0) return;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.usageLog.findUnique({
      where: { id: `stripe_evt_${stripeEventId}` },
      select: { id: true },
    });
    if (existing) return;

    await tx.usageLog.create({
      data: {
        id: `stripe_evt_${stripeEventId}`,
        userId,
        organizationId,
        action: "BILLING_STRIPE_EVENT_PROCESSED",
        metadata: {
          type: "invoice.paid",
          stripeEventId,
          stripeInvoiceId,
        },
      },
    });

    await tx.usageLog.create({
      data: {
        userId,
        organizationId,
        action: ACTION_CREDIT_GRANT,
        tokensUsed: credits,
        cost: typeof amountEurCents === "number" ? amountEurCents / 100 : null,
        metadata: {
          source: "stripe-invoice",
          stripeCustomerId,
          stripeSubscriptionId,
          stripeInvoiceId,
          stripeEventId,
          planTier,
        },
      },
    });
  });
}

export async function markStripeCheckoutStarted(params: {
  userId: string;
  organizationId: string;
  stripeCustomerId: string;
  stripeCheckoutSessionId: string;
  stripePriceId: string;
  planTier: BillingPlanTier;
}) {
  const { userId, organizationId, stripeCustomerId, stripeCheckoutSessionId, stripePriceId, planTier } = params;
  await prisma.usageLog.create({
    data: {
      userId,
      organizationId,
      action: ACTION_CHECKOUT_SESSION_CREATED,
      metadata: {
        stripeCustomerId,
        stripeCheckoutSessionId,
        stripePriceId,
        planTier,
      },
    },
  });
}

export async function markSubscriptionUpdated(params: {
  userId: string;
  organizationId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  planTier?: BillingPlanTier | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number | null;
}) {
  const {
    userId,
    organizationId,
    stripeSubscriptionId,
    stripeCustomerId,
    status,
    planTier,
    cancelAtPeriodEnd,
    currentPeriodEnd,
  } = params;
  await prisma.usageLog.create({
    data: {
      userId,
      organizationId,
      action: ACTION_SUBSCRIPTION_UPDATED,
      metadata: {
        stripeSubscriptionId,
        stripeCustomerId,
        status,
        planTier: planTier ?? null,
        cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
        currentPeriodEnd: typeof currentPeriodEnd === "number" ? currentPeriodEnd : null,
      },
    },
  });
}

export async function markSubscriptionCanceled(params: {
  userId: string;
  organizationId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
}) {
  const { userId, organizationId, stripeSubscriptionId, stripeCustomerId } = params;
  await prisma.usageLog.create({
    data: {
      userId,
      organizationId,
      action: ACTION_SUBSCRIPTION_CANCELED,
      metadata: {
        stripeSubscriptionId,
        stripeCustomerId,
      },
    },
  });
}

export async function markPaymentFailed(params: {
  userId: string;
  organizationId: string;
  stripeInvoiceId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
}) {
  const { userId, organizationId, stripeInvoiceId, stripeCustomerId, stripeSubscriptionId } = params;
  await prisma.usageLog.create({
    data: {
      userId,
      organizationId,
      action: ACTION_PAYMENT_FAILED,
      metadata: {
        stripeInvoiceId,
        stripeCustomerId,
        stripeSubscriptionId: stripeSubscriptionId ?? null,
      },
    },
  });
}
