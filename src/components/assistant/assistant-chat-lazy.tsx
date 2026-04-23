"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useAssistant } from "@/components/assistant/assistant-provider";

/** Shown while the Ask chunk loads so the slot stays visibly open (matches `AssistantChat` aside shell). */
function AskPanelChunkLoading() {
  const { isOpen } = useAssistant();
  if (!isOpen) return null;
  return (
    <aside
      aria-hidden
      className={cn(
        "fixed z-30 flex flex-col overflow-hidden bg-background shadow-2xl ring-1 ring-border/80",
        "inset-0 h-dvh w-screen rounded-none sm:top-2 sm:bottom-2 sm:right-0 sm:left-auto sm:h-auto sm:w-[min(23rem,100vw-0.75rem)] sm:rounded-l-2xl"
      )}
    >
      <div className="flex h-12 items-center border-b border-stone-200/80 px-3">
        <div className="h-3 w-28 animate-pulse rounded bg-stone-200" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-20 animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-16 animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-16 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    </aside>
  );
}

const AssistantChat = dynamic(
  () => import("@/components/assistant/assistant-chat").then((m) => m.AssistantChat),
  { ssr: false, loading: () => <AskPanelChunkLoading /> }
);

export function AssistantChatLazy() {
  return <AssistantChat />;
}
