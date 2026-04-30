"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Check, ChevronDown, Crown, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpgrade } from "@/components/billing/upgrade-provider";

type CreditSnapshot = {
  limits: { persona: number; study: number };
  used: { persona: number; study: number };
  remaining: { persona: number; study: number };
  total: { granted: number; consumed: number; remaining: number };
  mode?: "metered" | "unlimited";
  currentPlanTier?: "pilot" | "builder" | "studio" | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number | null;
};

const pricingPlans = [
  {
    name: "Pilot",
    badge: "50% off - launch price",
    oldPrice: "€25.99",
    price: "€12.99",
    billingLabel: "monthly",
    creditsLabel: "100 credits",
    creditsBonus: null,
    points: ["Perfect for trying GoToFu", "1 seat", "Email support", "Great for early validation"],
    icon: BadgeDollarSign,
  },
  {
    name: "Builder",
    badge: "Most popular",
    oldPrice: "€49.99",
    price: "€29.99",
    billingLabel: "monthly",
    creditsLabel: "300 credits",
    creditsBonus: null,
    points: ["For serious validation work", "3 seats", "Priority support", "Built for weekly research loops"],
    icon: Rocket,
    featured: true,
  },
  {
    name: "Studio",
    badge: "60% off - launch price",
    oldPrice: "€99.99",
    price: "€69.99",
    billingLabel: "monthly",
    creditsLabel: "1000 credits",
    creditsBonus: null,
    points: ["For teams & power users", "Up to 10 seats", "Dedicated support", "Best cost per credit"],
    icon: Crown,
  },
];

export function UpgradeDialog() {
  const { isOpen, closeUpgrade, reason } = useUpgrade();
  const [snapshot, setSnapshot] = useState<CreditSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [usageExpanded, setUsageExpanded] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Builder");

  async function refreshCredits() {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/credits", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load credits");
      const data = (await response.json()) as CreditSnapshot;
      setSnapshot(data);
    } catch {
      toast.error("Could not load credit usage.");
      setSnapshot((prev) => prev);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    setSnapshot(null);
    setUsageExpanded(false);
    void refreshCredits();
  }, [isOpen]);

  useEffect(() => {
    const handleSubscriptionSynced = () => {
      void refreshCredits();
    };

    window.addEventListener("billing:subscription-synced", handleSubscriptionSynced);
    return () => {
      window.removeEventListener("billing:subscription-synced", handleSubscriptionSynced);
    };
  }, []);

  const usageStats = useMemo(() => {
    const base: CreditSnapshot = snapshot ?? {
      limits: { persona: 3, study: 3 },
      used: { persona: 0, study: 0 },
      remaining: { persona: 3, study: 3 },
      total: { granted: 6, consumed: 0, remaining: 6 },
      mode: "metered",
      currentPlanTier: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    };
    const isUnlimited = base.mode === "unlimited";
    const totalRemaining = base.total.remaining;
    const totalGranted = base.total.granted;
    const totalUsed = base.total.consumed;
    const starterGranted = base.limits.persona + base.limits.study;
    const starterRemaining = Math.max(0, starterGranted - totalUsed);
    const subscriptionGranted = Math.max(0, totalGranted - starterGranted);
    const subscriptionRemaining = Math.max(0, totalRemaining - starterRemaining);
    const remainingRatio = totalGranted > 0 ? totalRemaining / totalGranted : 0;
    return {
      totalRemaining,
      totalGranted,
      totalUsed,
      starterGranted,
      starterRemaining,
      subscriptionGranted,
      subscriptionRemaining,
      isLowBalance: !isUnlimited && totalRemaining > 0 && remainingRatio <= 0.2,
      isUnlimited,
      currentPlanTier: base.currentPlanTier ?? null,
    };
  }, [snapshot]);

  const hasActiveSubscription = Boolean(usageStats.currentPlanTier);

  const ctaLabel = useMemo(() => {
    const selectedTier = selectedPlan.toLowerCase() as "pilot" | "builder" | "studio";
    const currentPlanTier = usageStats.currentPlanTier;
    if (!currentPlanTier) {
      return `Subscribe to ${selectedPlan}`;
    }
    if (selectedTier === currentPlanTier) {
      return `Current plan: ${selectedPlan}`;
    }
    return `Upgrade to ${selectedPlan}`;
  }, [selectedPlan, usageStats.currentPlanTier, usageStats.isUnlimited]);

  const ctaDisabled = useMemo(() => {
    const selectedTier = selectedPlan.toLowerCase() as "pilot" | "builder" | "studio";
    const isCurrentTier = Boolean(usageStats.currentPlanTier) && selectedTier === usageStats.currentPlanTier;
    const isInitialLoading = loading && snapshot === null;
    return isCurrentTier || isInitialLoading;
  }, [selectedPlan, usageStats.currentPlanTier, usageStats.isUnlimited]);

  const isCancellationScheduled = snapshot?.cancelAtPeriodEnd === true;
  const cancellationDateLabel = useMemo(() => {
    if (!snapshot?.currentPeriodEnd) return null;
    try {
      return new Date(snapshot.currentPeriodEnd * 1000).toLocaleDateString();
    } catch {
      return null;
    }
  }, [snapshot]);

  async function startCheckout() {
    const selectedTier = selectedPlan.toLowerCase();
    if (
      selectedTier !== "pilot" &&
      selectedTier !== "builder" &&
      selectedTier !== "studio"
    ) {
      toast.error("Please choose a valid plan.");
      return;
    }
    setStartingCheckout(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: selectedTier }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? "Failed to start Stripe checkout");
      }
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error("Could not open Stripe checkout.");
    } finally {
      setStartingCheckout(false);
    }
  }

  async function cancelSubscriptionAtPeriodEnd() {
    setCancelingSubscription(true);
    try {
      const response = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        scheduled?: boolean;
        currentPeriodEnd?: number | null;
        error?: string;
      };
      if (!response.ok || !data.scheduled) {
        throw new Error(data.error ?? "Could not schedule cancellation");
      }
      toast.success("Cancellation scheduled. Your plan stays active until period end.");
      setCancelDialogOpen(false);
      await refreshCredits();
    } catch {
      toast.error("Could not schedule cancellation right now.");
    } finally {
      setCancelingSubscription(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? closeUpgrade() : undefined)}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <div className="border-b p-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl">Upgrade to continue</DialogTitle>
            <DialogDescription className="text-sm">
              {reason ?? "Free credits are limited. Upgrade to keep creating personas and studies."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-xl border bg-muted/30 p-4">
            <button
              type="button"
              onClick={() => setUsageExpanded((open) => !open)}
              className="w-full rounded-lg border bg-background px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Usage &amp; Credits</p>
                  {loading && snapshot === null ? (
                    <p className="mt-1 text-xs text-muted-foreground">Loading plan details...</p>
                  ) : hasActiveSubscription ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {usageStats.totalRemaining} total remaining credits
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {usageStats.totalRemaining} total remaining credits
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${usageExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </div>
            </button>

            {usageExpanded ? (
              <div className="mt-3 rounded-lg border bg-background px-4 py-3">
                {loading && snapshot === null ? (
                  <p className="text-sm text-muted-foreground">Loading current billing state...</p>
                ) : hasActiveSubscription ? (
                  <>
                    <p className="text-3xl font-semibold tracking-tight">
                      {usageStats.totalRemaining} total remaining credits
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {usageStats.totalUsed} used of {usageStats.totalGranted} total granted
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Active plan: {usageStats.currentPlanTier?.charAt(0).toUpperCase()}{usageStats.currentPlanTier?.slice(1)}.
                      Usage rules: 1 persona = 1 credit, 1 study run (1 persona) = 0.5 credit.
                    </p>
                    {isCancellationScheduled ? (
                      <p className="mt-2 text-xs font-medium text-amber-600">
                        Cancellation scheduled{cancellationDateLabel ? ` for ${cancellationDateLabel}` : ""}. Credits remain usable until then.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-semibold tracking-tight">
                      {usageStats.totalRemaining} total remaining credits
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {usageStats.totalUsed} used of {usageStats.totalGranted} total granted
                    </p>
                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>
                        Starter credits (one-time):{" "}
                        <span className="font-medium text-foreground">{usageStats.starterRemaining}</span> /{" "}
                        {usageStats.starterGranted}
                      </p>
                      <p>
                        Subscription credits granted:{" "}
                        <span className="font-medium text-foreground">{usageStats.subscriptionRemaining}</span> /{" "}
                        {usageStats.subscriptionGranted}
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      You start with 3 persona and 3 study credits. 1 persona = 1 credit. 1 study run (1 persona) = 0.5 credit.
                    </p>
                    {usageStats.isLowBalance ? (
                      <p className="mt-2 text-xs font-medium text-amber-600">
                        Low balance. Upgrade now to avoid interruptions.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-6">
          <p className="mb-3 text-sm font-medium">Plans</p>
          <div className="grid gap-3 md:grid-cols-3">
            {pricingPlans.map((plan) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.name;
              return (
                <button
                  key={plan.name}
                  type="button"
                  onClick={() => setSelectedPlan(plan.name)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        plan.featured
                          ? "bg-primary/15 text-primary"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}
                    >
                      {plan.badge}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold">{plan.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground line-through">{plan.oldPrice}</p>
                  <p className="mt-1 text-5xl font-bold tracking-tight">{plan.price}</p>
                  <p className="mt-1 text-base text-muted-foreground">{plan.billingLabel}</p>
                  <div className="mt-3 rounded-lg bg-muted/80 px-3 py-2 text-sm font-medium">
                    <span>{plan.creditsLabel}</span>
                    {plan.creditsBonus ? (
                      <span className="ml-1.5 font-semibold text-primary">{plan.creditsBonus}</span>
                    ) : null}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    {plan.points.map((point) => (
                      <li key={point} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCancelDialogOpen(true)}
              disabled={!hasActiveSubscription}
              className="text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-0"
            >
              Cancel subscription
            </button>
            <Button
              type="button"
              onClick={startCheckout}
              disabled={startingCheckout || ctaDisabled}
              className="text-xs sm:text-sm"
            >
              {startingCheckout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                ctaLabel
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle>Cancel subscription</DialogTitle>
            <DialogDescription>
              This will schedule cancellation at the end of your current billing period. Your unlimited access stays active until then.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelingSubscription}
            >
              Keep subscription
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={cancelSubscriptionAtPeriodEnd}
              disabled={cancelingSubscription}
            >
              {cancelingSubscription ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Confirm cancellation"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
