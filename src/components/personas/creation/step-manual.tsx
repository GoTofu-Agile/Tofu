"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2 } from "lucide-react";
import type { ExtractedContext } from "@/lib/validation/schemas";

interface StepManualProps {
  onSubmit: (extracted: ExtractedContext) => void;
  personaCount: number;
  onPersonaCountChange: (count: number) => void;
  loading?: boolean;
}

export function StepManual({
  onSubmit,
  personaCount,
  onPersonaCountChange,
  loading = false,
}: StepManualProps) {
  const [groupName, setGroupName] = useState("");
  const [targetUserRole, setTargetUserRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [painPointsText, setPainPointsText] = useState("");
  const [domainContext, setDomainContext] = useState("");

  function handleSubmit() {
    const painPoints = painPointsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    onSubmit({
      groupName: groupName.trim() || targetUserRole.trim() || "Persona Group",
      targetUserRole: targetUserRole.trim(),
      industry: industry.trim() || null,
      painPoints: painPoints.length > 0 ? painPoints : ["Unspecified challenges"],
      demographicsHints: null,
      domainContext: domainContext.trim() || `${targetUserRole} in ${industry || "their domain"}. ${painPointsText}`,
    });
  }

  const valid = targetUserRole.trim().length > 1;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="role">Target user role *</Label>
          <Input
            id="role"
            placeholder="e.g. Product Manager, ER Nurse, Freelance Designer"
            value={targetUserRole}
            onChange={(e) => setTargetUserRole(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="group-name">Group name</Label>
          <Input
            id="group-name"
            placeholder="e.g. Senior PMs at Series B startups (auto-generated if blank)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry / Domain</Label>
          <Input
            id="industry"
            placeholder="e.g. FinTech, Healthcare, E-Commerce"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pain-points">Pain points (one per line)</Label>
          <Textarea
            id="pain-points"
            placeholder={"e.g.\nToo much time in meetings\nHard to align stakeholders\nSlowly moving company"}
            rows={4}
            value={painPointsText}
            onChange={(e) => setPainPointsText(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="domain-context">Additional context (optional)</Label>
          <Textarea
            id="domain-context"
            placeholder="Any extra details about this user type, their environment, goals, etc."
            rows={3}
            value={domainContext}
            onChange={(e) => setDomainContext(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Persona count + full-width Continue (max 100, same cap as App Store Reviews) */}
      <div className="space-y-2">
        <Label>
          Number of Personas: <span className="font-semibold">{personaCount}</span>
        </Label>
        <input
          type="range"
          min={1}
          max={100}
          value={personaCount}
          onChange={(e) => onPersonaCountChange(Number(e.target.value))}
          disabled={loading}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>100</span>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !valid}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing your description...
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
