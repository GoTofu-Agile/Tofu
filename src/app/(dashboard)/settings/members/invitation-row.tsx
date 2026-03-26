"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { revokeInvite } from "./actions";

interface InvitationRowProps {
  invitation: {
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    token: string;
    expiresAt: Date;
    createdAt: Date;
  };
  canManage: boolean;
}

export function InvitationRow({ invitation, canManage }: InvitationRowProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      setDaysLeft(
        Math.ceil(
          (new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      );
    });
  }, [invitation.expiresAt]);

  const inviteUrl = `${window.location.origin}/accept-invite/${invitation.token}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke() {
    if (!confirm("Revoke this invitation?")) return;
    setRevoking(true);
    const result = await revokeInvite(invitation.id);
    setRevoking(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Invitation revoked");
      router.refresh();
    }
  }

  const displayEmail = invitation.email === "invite@placeholder.local" ? "—" : invitation.email;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{displayEmail}</p>
        <p className="text-xs text-muted-foreground">
          {invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()} · expires in {daysLeft}d
        </p>
      </div>

      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
      >
        {copied ? (
          <><Check className="h-3 w-3 text-green-600" /> Copied</>
        ) : (
          <><Copy className="h-3 w-3" /> Copy link</>
        )}
      </button>

      {canManage && (
        <button
          onClick={handleRevoke}
          disabled={revoking}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          Revoke
        </button>
      )}
    </div>
  );
}
