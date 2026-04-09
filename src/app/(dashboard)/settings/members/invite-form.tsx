"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Check, Link2, Loader2 } from "lucide-react";
import { createInviteLink } from "./actions";

const ROLES = ["MEMBER", "ADMIN", "VIEWER"] as const;
type Role = typeof ROLES[number];

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const result = await createInviteLink(email, role);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    setGeneratedLink(result.inviteUrl);
    toast.success("Invite link created.");
  }

  async function handleCopy() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <Input
          type="email"
          placeholder="teammate@company.com (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          aria-label="Invitee email (optional)"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
          aria-label="Invite role"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0) + r.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
          <Link2 className="mr-2 h-4 w-4" />
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Link"
          )}
        </Button>
      </div>

      {generatedLink && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
          <code className="flex-1 truncate text-xs">{generatedLink}</code>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
