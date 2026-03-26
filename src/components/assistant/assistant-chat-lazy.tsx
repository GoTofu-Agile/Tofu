"use client";

import dynamic from "next/dynamic";

const AssistantChat = dynamic(
  () => import("@/components/assistant/assistant-chat").then((m) => m.AssistantChat),
  { ssr: false }
);

export function AssistantChatLazy() {
  return <AssistantChat />;
}
