"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { duplicatePersona } from "@/app/(dashboard)/personas/actions";
import { trackEvent } from "@/lib/analytics/track";

interface PersonaDetailActionsProps {
  personaId: string;
}

export function PersonaDetailActions({ personaId }: PersonaDetailActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDuplicate = () => {
    trackEvent("persona_duplicate_clicked", { personaId });
    startTransition(async () => {
      const result = await duplicatePersona(personaId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Persona duplicated.");
      router.push(`/personas/${result.groupId}/${result.personaId}`);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <Copy className="h-3.5 w-3.5" />
      Duplicate
    </button>
  );
}
