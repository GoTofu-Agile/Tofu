"use client";

import { useAssistant } from "@/components/assistant/assistant-provider";
import { AssistantAutopilotOverlay } from "@/components/assistant/assistant-autopilot-overlay";
import { cn } from "@/lib/utils";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { isOpen, autopilot } = useAssistant();

  return (
    <div
      className={cn(
        "absolute flex transition-all duration-300 ease-in-out overflow-hidden bg-white",
        isOpen
          ? "top-4 left-4 bottom-4 right-[21rem] rounded-[1.25rem] shadow-lg ring-1 ring-stone-200"
          : "top-0 left-0 bottom-0 right-0"
      )}
    >
      <div className={cn("flex w-full", autopilot.active ? "transition-all duration-300 blur-[1px] saturate-75" : "")}>
        {children}
      </div>
      <AssistantAutopilotOverlay />
    </div>
  );
}
