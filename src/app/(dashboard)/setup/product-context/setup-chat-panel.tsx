"use client";

import { useRouter } from "next/navigation";
import { OrgSetupChat } from "@/components/org/org-setup-chat";

type Existing = {
  productName?: string | null;
  productDescription?: string | null;
  targetAudience?: string | null;
  industry?: string | null;
  competitors?: string | null;
};

export function SetupChatPanel({
  orgId,
  orgName,
  existingData,
}: {
  orgId: string;
  orgName: string;
  existingData?: Existing;
}) {
  const router = useRouter();
  return (
    <OrgSetupChat
      orgId={orgId}
      orgName={orgName}
      existingData={existingData}
      onComplete={() => router.push("/personas/new")}
    />
  );
}
