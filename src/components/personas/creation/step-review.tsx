"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import type { ExtractedContext } from "@/lib/validation/schemas";
import type { OrgContext } from "./unified-creation-flow";

interface StepReviewProps {
  extracted: ExtractedContext;
  onChange: (updated: ExtractedContext) => void;
  orgContext?: OrgContext;
  onBack: () => void;
  onContinue: () => void;
}

export function StepReview({
  extracted,
  onChange,
  orgContext,
  onBack,
  onContinue,
}: StepReviewProps) {
  function update(field: keyof ExtractedContext, value: unknown) {
    onChange({ ...extracted, [field]: value });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-3 text-sm">
        <Sparkles className="inline h-4 w-4 text-primary mr-1.5" />
        AI extracted these details from your description. Review and edit as needed.
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="groupName">Group Name</Label>
          <Input
            id="groupName"
            value={extracted.groupName}
            onChange={(e) => update("groupName", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="targetRole">Target User Role</Label>
            <Input
              id="targetRole"
              value={extracted.targetUserRole}
              onChange={(e) => update("targetUserRole", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry / Domain</Label>
            <Input
              id="industry"
              value={extracted.industry || ""}
              onChange={(e) => update("industry", e.target.value || null)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="demographics">Demographics</Label>
          <Input
            id="demographics"
            value={extracted.demographicsHints || ""}
            onChange={(e) => update("demographicsHints", e.target.value || null)}
            placeholder="e.g. 25-40, urban, tech-savvy"
          />
        </div>

        <div className="space-y-2">
          <Label>Pain Points</Label>
          <div className="flex flex-wrap gap-1.5">
            {extracted.painPoints.map((pp, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {pp}
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "painPoints",
                      extracted.painPoints.filter((_, j) => j !== i)
                    )
                  }
                  className="ml-1.5 hover:text-destructive"
                >
                  x
                </button>
              </Badge>
            ))}
          </div>
          <Textarea
            placeholder="Add more pain points (one per line)..."
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const val = e.currentTarget.value.trim();
                if (val) {
                  update("painPoints", [...extracted.painPoints, val]);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </div>
      </div>

      {orgContext && (
        <div className="rounded-lg bg-muted/30 border p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Product context (from Settings)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {orgContext.productName && (
              <Badge variant="outline" className="text-[10px]">
                {orgContext.productName}
              </Badge>
            )}
            {orgContext.industry && (
              <Badge variant="outline" className="text-[10px]">
                {orgContext.industry}
              </Badge>
            )}
            {orgContext.targetAudience && (
              <Badge variant="outline" className="text-[10px]">
                {orgContext.targetAudience}
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onContinue}
          className="flex-1"
          disabled={!extracted.groupName.trim() || !extracted.targetUserRole.trim()}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
