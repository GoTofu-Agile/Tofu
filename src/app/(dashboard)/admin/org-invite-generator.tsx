"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Check, Link2 } from "lucide-react";
import { generateAdminInviteLink } from "./actions";

interface OrgInviteGeneratorProps {
  orgId: string;
}

export function OrgInviteGenerator({ orgId }: OrgInviteGeneratorProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const result = await generateAdminInviteLink(orgId, email, "ADMIN");
    setLoading(false);
    setLink(result.inviteUrl);
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 h-8 text-xs"
        />
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={loading}>
          <Link2 className="mr-1.5 h-3 w-3" />
          {loading ? "..." : "Invite link"}
        </Button>
      </div>
      {link && (
        <div className="flex items-center gap-2 rounded border bg-muted/50 p-2">
          <code className="flex-1 truncate text-xs">{link}</code>
          <button onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      )}
    </div>
  );
}
