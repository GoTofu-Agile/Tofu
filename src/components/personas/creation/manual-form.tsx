"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { ManualFormInput } from "@/lib/validation/schemas";

const AGE_RANGES = ["Any", "18-25", "26-35", "36-45", "46-55", "56+"] as const;

interface ManualFormProps {
  onSubmit: (data: ManualFormInput) => void;
  onBack: () => void;
  loading: boolean;
  loadingMessage?: string;
}

export function ManualForm({
  onSubmit,
  onBack,
  loading,
  loadingMessage,
}: ManualFormProps) {
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [company, setCompany] = useState("");
  const [ageRange, setAgeRange] = useState<(typeof AGE_RANGES)[number]>("Any");
  const [location, setLocation] = useState("");
  const [background, setBackground] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [tools, setTools] = useState("");

  function handleSubmit() {
    onSubmit({
      role,
      industry: industry || undefined,
      company: company || undefined,
      ageRange,
      location: location || undefined,
      background: background || undefined,
      painPoints: painPoints || undefined,
      tools: tools || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">
            Role / Occupation <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Product Manager, ER Nurse"
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. Healthcare, SaaS, E-Commerce"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company">Company Type / Size</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Series A Startup, Large Hospital"
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ageRange">Age Range</Label>
          <select
            id="ageRange"
            value={ageRange}
            onChange={(e) =>
              setAgeRange(e.target.value as (typeof AGE_RANGES)[number])
            }
            disabled={loading}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {AGE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Berlin, San Francisco, rural India"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="background">Background & Context</Label>
        <Textarea
          id="background"
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          placeholder="Describe who these people are — their day-to-day, what motivates them, what they care about..."
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="painPoints">Pain Points & Frustrations</Label>
        <Textarea
          id="painPoints"
          value={painPoints}
          onChange={(e) => setPainPoints(e.target.value)}
          placeholder="What frustrates them? What problems do they face? What's broken in their workflow?"
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tools">Tools & Products They Use</Label>
        <Input
          id="tools"
          value={tools}
          onChange={(e) => setTools(e.target.value)}
          placeholder="e.g. Slack, Figma, Epic EHR, Shopify"
          disabled={loading}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !role.trim()}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loadingMessage || "Researching..."}
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
