"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { removeGroup } from "@/app/(dashboard)/personas/actions";
import { trackEvent } from "@/lib/analytics/track";

interface PersonaGroupActionsProps {
  groupId: string;
  groupName: string;
}

export function PersonaGroupActions({ groupId, groupName }: PersonaGroupActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${groupName}" and all personas in this group? This cannot be undone.`
    );
    if (!confirmed) return;

    trackEvent("persona_group_delete_confirmed", { groupId });
    startTransition(async () => {
      const result = await removeGroup(groupId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Persona group deleted.");
      router.push("/personas");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete group
    </button>
  );
}
