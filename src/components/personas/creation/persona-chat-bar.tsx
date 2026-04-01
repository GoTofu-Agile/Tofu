"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Layers,
  LayoutTemplate,
  Zap,
  FileUp,
  Globe,
  SearchCheck,
  Users,
  ChevronDown,
  Wand2,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import {
  MotionGhostTextButton,
  MotionPersonaSubmitButton,
} from "@/components/motion/persona-creation-motion";
import { cn } from "@/lib/utils";

const PERSONA_PRESETS = [5, 10, 20, 50] as const;
const PERSONA_MAX = 500;

export interface PersonaChatBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, dataSourceId: string) => void;
  loading?: boolean;
  personaCount: number;
  onPersonaCountChange: (count: number) => void;
}

const ROTATING_PLACEHOLDERS = [
  "Product managers at B2B SaaS companies evaluating analytics tools…",
  "Night-shift nurses who rely on mobile apps for scheduling…",
  "First-time home buyers comparing mortgage apps in the UK…",
  "Solo founders shipping their first AI product…",
  "Retail workers who pick up extra shifts via gig apps…",
] as const;

const DATA_SOURCES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "All Data Sources", icon: Layers },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "app-store", label: "App Store reviews", icon: Zap },
  { id: "cvs", label: "CVs", icon: FileUp },
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
  const reduced = useReducedMotion();
  const [dataSource, setDataSource] = useState<(typeof DATA_SOURCES)[0]>(DATA_SOURCES[0]);
  const [customDraft, setCustomDraft] = useState<string>("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [improving, setImproving] = useState(false);
  const [focused, setFocused] = useState(false);
  const [improveFlash, setImproveFlash] = useState(false);

  useEffect(() => {
    if (value.trim().length > 0) return;
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % ROTATING_PLACEHOLDERS.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [value]);

  function clampCount(n: number) {
    return Math.min(PERSONA_MAX, Math.max(1, Math.round(n)));
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

  async function handleImprovePrompt() {
    const trimmed = value.trim();
    if (trimmed.length < 3 || loading || improving) return;
    setImproving(true);
    try {
      const res = await fetch("/api/personas/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Could not improve brief");
      }
      if (typeof data.improved === "string" && data.improved.trim()) {
        onChange(data.improved.trim());
        toast.success("Brief refined");
        setImproveFlash(true);
        window.setTimeout(() => setImproveFlash(false), 900);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not improve brief");
    } finally {
      setImproving(false);
    }
  }

  const DataSourceIcon = dataSource.icon;
  const placeholder =
    ROTATING_PLACEHOLDERS[placeholderIdx] ?? ROTATING_PLACEHOLDERS[0];
  const showOverlay = value.trim().length === 0;

  return (
    <motion.div
      className={cn(
        "group/chat mb-6 flex flex-col gap-2 rounded-2xl border bg-card px-3 py-3 shadow-sm",
        "ring-1 ring-black/[0.04] transition-[box-shadow,transform,border-color] duration-300 ease-out",
        "dark:ring-white/[0.06]",
        focused && "shadow-md ring-primary/20 dark:shadow-none",
        improveFlash && "ring-emerald-400/50 shadow-[0_0_0_3px_rgba(52,211,153,0.2)]"
      )}
      animate={
        reduced
          ? undefined
          : {
              scale: focused ? 1.008 : 1,
            }
      }
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
    >
      <div className="flex items-start gap-2">
        <motion.div
          className="mt-1 shrink-0 text-muted-foreground"
          animate={reduced ? undefined : { opacity: focused ? 1 : 0.88 }}
          transition={{ duration: 0.25 }}
        >
          <Sparkles className="h-5 w-5" aria-hidden />
        </motion.div>
        <div className="relative min-w-0 flex-1">
          {showOverlay && (
            <AnimatePresence mode="wait">
              <motion.span
                key={placeholderIdx}
                initial={reduced ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 0.5, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: reduced ? 0 : 0.28, ease: "easeOut" }}
                className="pointer-events-none absolute left-0 top-1 z-0 line-clamp-4 text-left text-sm leading-normal text-muted-foreground"
              >
                {placeholder}
              </motion.span>
            </AnimatePresence>
          )}
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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder=""
            aria-label="Describe your target users"
            disabled={loading}
            rows={1}
            className="relative z-10 min-h-[1.5rem] min-w-0 flex-1 resize-none border-0 bg-transparent px-0 py-1 text-sm shadow-none outline-none focus-visible:ring-0 disabled:opacity-50"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 self-end">
        <MotionGhostTextButton
          disabled={loading || improving || value.trim().length < 3}
          onClick={() => void handleImprovePrompt()}
        >
          {improving ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          ) : (
            <motion.span
              className="inline-flex"
              whileHover={reduced ? undefined : { rotate: [0, -14, 0] }}
              transition={{ duration: 0.45 }}
            >
              <Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </motion.span>
          )}
          Improve brief
        </MotionGhostTextButton>
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className="inline-flex h-8 shrink-0 items-center rounded-md px-2.5 text-xs text-muted-foreground outline-none transition-transform duration-200 hover:bg-accent hover:text-foreground active:scale-[0.97]"
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
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground outline-none transition-transform duration-200 hover:bg-accent hover:text-foreground active:scale-[0.97]"
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
                  <motion.button
                    key={n}
                    type="button"
                    onClick={() => onPersonaCountChange(n)}
                    whileTap={reduced ? undefined : { scale: 0.94 }}
                    className={`rounded-md border py-1.5 text-xs font-medium tabular-nums transition-colors ${
                      personaCount === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/80 bg-background hover:bg-muted/50"
                    }`}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="p-3" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-medium text-muted-foreground">Custom (1–{PERSONA_MAX})</p>
              <div className="mt-2 flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={PERSONA_MAX}
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
        <MotionPersonaSubmitButton
          disabled={loading || !value.trim()}
          onClick={handleSubmit}
          aria-label="Create personas"
        >
          <ArrowRight className="h-4 w-4" />
        </MotionPersonaSubmitButton>
      </div>
    </motion.div>
  );
}
