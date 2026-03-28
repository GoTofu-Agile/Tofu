"use client";

import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Layers,
  LayoutTemplate,
  Zap,
  Globe,
  SearchCheck,
  Users,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PERSONA_GENERATION_MAX } from "@/lib/constants/persona-limits";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const PERSONA_PRESETS = [5, 10, 20, 50] as const;

interface PersonaChatBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, dataSourceId: string) => void;
  loading?: boolean;
  personaCount: number;
  onPersonaCountChange: (count: number) => void;
}

const DATA_SOURCES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "All Data Sources", icon: Layers },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "app-store", label: "App Store reviews", icon: Zap },
  { id: "company-urls", label: "Company URLs", icon: Globe },
  { id: "deep-search", label: "Deep search", icon: SearchCheck },
];
export function PersonaChatBar({
  value,
  onChange,
  onSubmit,
  loading,
  personaCount,
  onPersonaCountChange,
}: PersonaChatBarProps) {
  const [dataSource, setDataSource] = useState<(typeof DATA_SOURCES)[0]>(DATA_SOURCES[0]);
  const [customDraft, setCustomDraft] = useState<string>("");

  function clampCount(n: number) {
    return Math.min(PERSONA_GENERATION_MAX, Math.max(1, Math.round(n)));
  }

  function applyCustomFromDraft() {
    const n = Number.parseInt(customDraft, 10);
    if (!Number.isNaN(n) && n >= 1) {
      onPersonaCountChange(clampCount(n));
    }
    setCustomDraft("");
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed, dataSource.id);
  }

  const DataSourceIcon = dataSource.icon;
  return (
    <div className="mb-6 flex flex-col gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
        <textarea
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }
          }}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Describe your target users in one sentence…"
          disabled={loading}
          rows={1}
          className="min-w-0 flex-1 resize-none border-0 bg-transparent px-0 py-1 text-sm shadow-none outline-none placeholder:text-muted-foreground/50 focus-visible:ring-0 disabled:opacity-50"
        />
      </div>
      <div className="flex items-center gap-2 self-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className="inline-flex h-8 shrink-0 items-center rounded-md px-2.5 text-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground"
        >
          <DataSourceIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          {dataSource.label}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end">
          {DATA_SOURCES.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.id}
                onClick={() => setDataSource(option)}
                className="text-xs"
              >
                <Icon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {option.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground"
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">{personaCount}</span>
          <span className="hidden sm:inline">personas</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="min-w-56 p-0">
          <div className="px-3 pt-3 pb-2">
            <p className="text-xs font-medium text-muted-foreground">Persona count</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {PERSONA_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onPersonaCountChange(n)}
                  className={`rounded-md border py-1.5 text-xs font-medium tabular-nums transition-colors ${
                    personaCount === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/80 bg-background hover:bg-muted/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div
            className="p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-medium text-muted-foreground">Custom (1–{PERSONA_GENERATION_MAX})</p>
            <div className="mt-2 flex gap-2">
              <Input
                type="number"
                min={1}
                max={PERSONA_GENERATION_MAX}
                placeholder={String(personaCount)}
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCustomFromDraft();
                  }
                }}
                onBlur={() => {
                  if (customDraft.trim() !== "") applyCustomFromDraft();
                }}
                className="h-8 text-xs tabular-nums"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 px-3 text-xs"
                onClick={() => applyCustomFromDraft()}
              >
                Set
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        size="icon"
        disabled={loading || !value.trim()}
        onClick={handleSubmit}
        className="h-8 w-8 shrink-0 rounded-lg"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
      </div>
    </div>
  );
}

