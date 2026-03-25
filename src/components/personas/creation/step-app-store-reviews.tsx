"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Sparkles, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppStoreAudienceMappedApp } from "@/lib/validation/schemas";
import {
  AudienceAppMappingPreview,
  type AudienceMappingUiStatus,
} from "./audience-app-mapping-preview";

type Mode = "app" | "audience";

const APP_EXAMPLES: { label: string; url: string }[] = [
  {
    label: "Duolingo",
    url: "https://apps.apple.com/us/app/duolingo-language-lessons/id570060128",
  },
  {
    label: "Notion",
    url: "https://apps.apple.com/us/app/notion-notes-docs-tasks/id1232780281",
  },
  {
    label: "Headspace",
    url: "https://apps.apple.com/us/app/headspace-mindfulness-sleep/id493145008",
  },
  {
    label: "Strava",
    url: "https://apps.apple.com/us/app/strava-run-bike-hike/id426826309",
  },
  {
    label: "Revolut",
    url: "https://apps.apple.com/gb/app/revolut-spend-save-trade/id932493382",
  },
  {
    label: "Tinder",
    url: "https://apps.apple.com/us/app/tinder-dating-app-chat-date/id547702041",
  },
];

const AUDIENCE_EXAMPLES = [
  "New parents trying to build healthy routines",
  "Students learning a new language",
  "Busy team leads juggling stakeholder feedback",
  "Frequent travelers managing expenses",
  "Creators posting daily on social media",
  "People training for a marathon",
];

interface StepAppStoreReviewsProps {
  onSubmitAppUrl: (appUrl: string) => void;
  /** Plain target-audience text (not pre-wrapped). */
  onSubmitAudience: (audiencePlain: string) => void;
  loading: boolean;
  hasOrgContext: boolean;
  initialText?: string;
  personaCount: number;
  onPersonaCountChange: (count: number) => void;
  audienceMappingStatus: AudienceMappingUiStatus;
  audienceMappedApps: AppStoreAudienceMappedApp[] | null;
  audienceMappingError: string | null;
  audienceTavilyDisabled?: boolean;
  /** Clear audience mapping preview when switching to the App tab. */
  onClearAudienceMapping?: () => void;
}

export function StepAppStoreReviews({
  onSubmitAppUrl,
  onSubmitAudience,
  loading,
  hasOrgContext,
  initialText,
  personaCount,
  onPersonaCountChange,
  audienceMappingStatus,
  audienceMappedApps,
  audienceMappingError,
  audienceTavilyDisabled,
  onClearAudienceMapping,
}: StepAppStoreReviewsProps) {
  const [mode, setMode] = useState<Mode>("app");
  const [text, setText] = useState(initialText ?? "");

  useEffect(() => {
    if (initialText !== undefined) {
      queueMicrotask(() => setText(initialText));
    }
  }, [initialText]);

  useEffect(() => {
    if (mode === "app") onClearAudienceMapping?.();
  }, [mode, onClearAudienceMapping]);

  type ExampleRow =
    | { label: string; url: string; kind: "app" }
    | { label: string; value: string; kind: "audience" };

  const examples = useMemo((): ExampleRow[] => {
    if (mode === "app") return APP_EXAMPLES.map((e) => ({ ...e, kind: "app" as const }));
    return AUDIENCE_EXAMPLES.map((t) => ({ label: t, value: t, kind: "audience" as const }));
  }, [mode]);

  const placeholder =
    mode === "app"
      ? "Paste an App Store URL (apps.apple.com/...)"
      : "e.g. Busy team leads in tech who struggle to keep track of stakeholder feedback…";

  function normalizeAppStoreUrl(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("apps.apple.com/")) return `https://${trimmed}`;
    return trimmed;
  }

  function isValidAppStoreUrl(input: string) {
    try {
      const u = new URL(normalizeAppStoreUrl(input));
      return u.hostname.includes("apps.apple.com");
    } catch {
      return false;
    }
  }

  function handleContinue() {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    if (mode === "app") {
      const normalized = normalizeAppStoreUrl(trimmed);
      if (!isValidAppStoreUrl(normalized)) return;
      onSubmitAppUrl(normalized);
      return;
    }
    onSubmitAudience(trimmed);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="app-store-input">What should we base reviews on?</Label>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="w-full" variant="default">
            <TabsTrigger value="app" className="text-xs">
              <Zap className="h-4 w-4" />
              App
            </TabsTrigger>
            <TabsTrigger value="audience" className="text-xs">
              <Users className="h-4 w-4" />
              Target audience
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          id="app-store-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          className="h-11 text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleContinue();
            }
          }}
        />
      </div>

      {hasOrgContext && (
        <p className="text-xs text-muted-foreground">
          <Sparkles className="inline h-3 w-3 mr-1" />
          Your product context from Settings will be used automatically.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Or try an example:</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() =>
                setText(ex.kind === "app" ? ex.url : ex.value)
              }
              disabled={loading}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

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
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>100</span>
        </div>
      </div>

      <Button
        onClick={handleContinue}
        disabled={
          loading ||
          text.trim().length < 2 ||
          (mode === "app" && !isValidAppStoreUrl(text.trim()))
        }
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

      {mode === "audience" && (
        <AudienceAppMappingPreview
          status={audienceMappingStatus}
          apps={audienceMappedApps}
          errorMessage={audienceMappingError}
          tavilyDisabled={audienceTavilyDisabled}
        />
      )}
    </div>
  );
}

