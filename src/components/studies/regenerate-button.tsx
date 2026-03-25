"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { triggerInsights } from "@/app/(dashboard)/studies/actions";

interface RegenerateButtonProps {
  studyId: string;
  label?: string;
}

export function RegenerateButton({
  studyId,
  label = "Regenerate Insights",
}: RegenerateButtonProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    const result = await triggerInsights(studyId);
    if (result.error) {
      toast.error(result.error);
      setGenerating(false);
      return;
    }
    toast.success(
      "Generating insights in the background. Refresh in a moment."
    );
    setTimeout(() => {
      router.refresh();
      setGenerating(false);
    }, 8000);
  }

  const isGenerate = label.startsWith("Generate");

  return (
    <Button
      variant={isGenerate ? "default" : "outline"}
      size="sm"
      className="mt-4"
      onClick={handleGenerate}
      disabled={generating}
    >
      {generating ? (
        <>
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          {isGenerate ? (
            <Sparkles className="mr-2 h-3 w-3" />
          ) : (
            <RefreshCw className="mr-2 h-3 w-3" />
          )}
          {label}
        </>
      )}
    </Button>
  );
}
