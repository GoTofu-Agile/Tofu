"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { createOrgForCustomer } from "./actions";

export function CreateOrgForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ orgName: string; inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !email.trim()) {
      toast.error("Workspace name and founder email are required");
      return;
    }
    setLoading(true);
    try {
      const res = await createOrgForCustomer(name, email);
      setResult({ orgName: res.orgName, inviteUrl: res.inviteUrl });
      setName("");
      setEmail("");
      toast.success(`Workspace "${res.orgName}" created!`);
    } catch (e) {
      toast.error("Failed to create workspace");
    }
    setLoading(false);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.inviteUrl);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Startup name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Input
          type="email"
          placeholder="Founder email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleCreate} disabled={loading}>
          {loading ? "Creating..." : "Create"}
        </Button>
      </div>

      {result && (
        <div className="space-y-2">
          <p className="text-sm text-green-600">
            Workspace <strong>{result.orgName}</strong> created. Send this invite link to the founder:
          </p>
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
            <code className="flex-1 truncate text-xs">{result.inviteUrl}</code>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
