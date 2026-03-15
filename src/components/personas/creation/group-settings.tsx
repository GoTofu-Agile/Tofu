"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";

interface GroupSettingsProps {
  groupName: string;
  onGroupNameChange: (name: string) => void;
  personaCount: number;
  onPersonaCountChange: (count: number) => void;
  includeSkeptics: boolean;
  onIncludeSkepticsChange: (value: boolean) => void;
  researchCount?: number;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
}

export function GroupSettings({
  groupName,
  onGroupNameChange,
  personaCount,
  onPersonaCountChange,
  includeSkeptics,
  onIncludeSkepticsChange,
  researchCount,
  onBack,
  onGenerate,
  generating,
}: GroupSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="groupName">Group Name</Label>
        <Input
          id="groupName"
          value={groupName}
          onChange={(e) => onGroupNameChange(e.target.value)}
          placeholder="e.g. Period Tracker Users"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="personaCount">
          Number of Personas: <span className="font-semibold">{personaCount}</span>
        </Label>
        <input
          id="personaCount"
          type="range"
          min={3}
          max={50}
          value={personaCount}
          onChange={(e) => onPersonaCountChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>3</span>
          <span>50</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="includeSkeptics"
          type="checkbox"
          checked={includeSkeptics}
          onChange={(e) => onIncludeSkepticsChange(e.target.checked)}
          className="rounded accent-primary"
        />
        <Label htmlFor="includeSkeptics" className="text-sm cursor-pointer">
          Include skeptics & critics (recommended for honest feedback)
        </Label>
      </div>

      {researchCount !== undefined && researchCount > 0 && (
        <div className="rounded-lg bg-muted/30 border p-3 text-sm text-muted-foreground">
          <CheckCircle2 className="inline h-4 w-4 text-green-500 mr-1.5" />
          Personas will be grounded in {researchCount} real data sources
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onGenerate}
          className="flex-1"
          disabled={generating || !groupName.trim()}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate {personaCount} Personas
        </Button>
      </div>
    </div>
  );
}
