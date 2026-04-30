"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useUpgrade } from "@/components/billing/upgrade-provider";

export function BillingToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { openUpgrade } = useUpgrade();

  useEffect(() => {
    const status = searchParams.get("billing");
    const sessionId = searchParams.get("session_id");
    const expectedUserId = searchParams.get("expected_user_id");
    const expectedOrgId = searchParams.get("expected_org_id");
    if (!status) return;

    if (status === "success") {
      const run = async () => {
        const syncResponse = await fetch("/api/billing/sync-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, expectedUserId, expectedOrgId }),
        }).catch(() => null);

        if (!syncResponse?.ok) {
          toast.error("Checkout completed, but you returned in a different account. Please sign in with the subscribing account.");
          return;
        }

        window.dispatchEvent(new CustomEvent("billing:subscription-synced"));
        toast.success("Subscription active — unlimited personas and studies unlocked.");
        openUpgrade("billing");
      };
      void run();
    } else if (status === "cancelled") {
      toast.info("Checkout cancelled. You can upgrade anytime from the top bar.");
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("billing");
    params.delete("session_id");
    params.delete("expected_user_id");
    params.delete("expected_org_id");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [searchParams, router, pathname]);

  return null;
}

