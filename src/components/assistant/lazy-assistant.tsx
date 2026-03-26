"use client";

import dynamic from "next/dynamic";
import { useAssistant } from "./assistant-provider";

const AssistantChat = dynamic(
  () =>
    import("./assistant-chat").then((m) => ({ default: m.AssistantChat })),
  { ssr: false }
);

export function LazyAssistant() {
  const { isOpen } = useAssistant();
  if (!isOpen) return null;
  return <AssistantChat />;
}
