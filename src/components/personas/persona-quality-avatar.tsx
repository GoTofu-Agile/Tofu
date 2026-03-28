"use client";

import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonaQualityAvatarProps {
  name: string;
  qualityScore?: number | null;
  size?: "sm" | "md" | "lg";
  showPercent?: boolean;
}

function clampScore(score?: number | null) {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  return Math.min(1, Math.max(0, score));
}

function getQualityColor(score: number | null) {
  if (score === null) return "bg-slate-400";
  if (score >= 0.85) return "bg-emerald-500";
  if (score >= 0.7) return "bg-lime-500";
  if (score >= 0.55) return "bg-amber-500";
  return "bg-rose-500";
}

export function PersonaQualityAvatar({
  name,
  qualityScore,
  size = "md",
  showPercent = true,
}: PersonaQualityAvatarProps) {
  const score = clampScore(qualityScore);
  const percent = score === null ? null : Math.round(score * 100);
  const ringDegrees = score === null ? 0 : Math.round(score * 360);

  const sizeClasses =
    size === "sm"
      ? { outer: "h-10 w-10", inner: "h-8 w-8 text-[10px]", badge: "text-[9px] px-1.5 py-0.5 -bottom-1" }
      : size === "lg"
        ? { outer: "h-16 w-16", inner: "h-12 w-12 text-sm", badge: "text-[10px] px-2 py-0.5 -bottom-2" }
        : { outer: "h-12 w-12", inner: "h-9 w-9 text-xs", badge: "text-[9px] px-1.5 py-0.5 -bottom-1.5" };

  return (
    <div className="relative inline-flex flex-col items-center">
      <div
        className={cn(
          "grid place-items-center rounded-full bg-slate-200 p-[2px]",
          sizeClasses.outer
        )}
        style={{
          background:
            score === null
              ? undefined
              : `conic-gradient(rgb(15 23 42 / 0.1) ${360 - ringDegrees}deg, ${
                  score >= 0.85
                    ? "rgb(16 185 129)"
                    : score >= 0.7
                      ? "rgb(132 204 22)"
                      : score >= 0.55
                        ? "rgb(245 158 11)"
                        : "rgb(244 63 94)"
                } ${360 - ringDegrees}deg)`,
        }}
        aria-label={
          percent === null
            ? `${name} quality not available`
            : `${name} quality score ${percent} percent`
        }
      >
        <div
          className={cn(
            "grid place-items-center rounded-full bg-background font-semibold text-foreground",
            sizeClasses.inner
          )}
        >
          <UserRound
            className={cn(
              size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5",
              "text-foreground/80"
            )}
            aria-hidden="true"
          />
        </div>
      </div>
      {showPercent && (
        <span
          className={cn(
            "absolute rounded-full border bg-background/95 backdrop-blur-sm font-medium text-muted-foreground",
            sizeClasses.badge
          )}
        >
          {percent === null ? "N/A" : `${percent}%`}
        </span>
      )}
      <span className={cn("sr-only", getQualityColor(score))}>
        {percent === null ? "Quality score unavailable" : `Quality score ${percent} percent`}
      </span>
    </div>
  );
}
