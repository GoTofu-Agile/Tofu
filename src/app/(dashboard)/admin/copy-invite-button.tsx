"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

interface CopyInviteButtonProps {
  token: string;
}

export function CopyInviteButton({ token }: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/accept-invite/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      <span>copy link</span>
    </button>
  );
}
