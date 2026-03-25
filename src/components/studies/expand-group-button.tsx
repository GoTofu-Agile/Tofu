"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface ExpandGroupButtonProps {
  groupId: string;
  onExpanded?: (newCount: number) => void;
}

export function ExpandGroupButton({ groupId, onExpanded }: ExpandGroupButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/personas/expand-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, count: 5 }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to expand group");
      }

      const data = await res.json();
      toast.success(`Generated ${data.generated} more personas`);
      onExpanded?.(data.generated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to expand group");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExpand}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <Plus className="h-2.5 w-2.5" />
      )}
      {loading ? "Adding..." : "Generate more"}
    </button>
  );
}
