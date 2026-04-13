"use client";

import { useAssistant } from "@/components/assistant/assistant-provider";
import { AssistantAutopilotOverlay } from "@/components/assistant/assistant-autopilot-overlay";
import { cn } from "@/lib/utils";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { isOpen, autopilot } = useAssistant();

  return (
    <div
      // Inset transitions (top/left/bottom/right) force layout reflow on every
      // animation frame. `will-change: top, left, bottom, right` promotes this
      // element to its own compositor layer so the browser can rasterise it
      // independently, reducing paint work during the assistant-open animation.
      // Long-term: replace inset animation with a GPU-composited transform approach.
      style={{ willChange: isOpen ? "top, left, bottom, right" : "auto" }}
      className={cn(
        "absolute flex overflow-hidden bg-background transition-all duration-[var(--duration-normal)] ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        isOpen
          ? "top-4 left-4 bottom-4 right-[23rem] rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] ring-1 ring-border"
          : "top-0 left-0 bottom-0 right-0"
      )}
    >
      <div
        className={cn(
          "flex w-full",
          autopilot.active ? "transition-all duration-[var(--duration-normal)] blur-[1px] saturate-75" : ""
        )}
      >
        {children}
      </div>
      <AssistantAutopilotOverlay />
    </div>
  );
}
