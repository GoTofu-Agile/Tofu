"use client";

import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAssistant } from "@/components/assistant/assistant-provider";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/personas": "Personas",
  "/studies": "Studies",
  "/settings": "Settings",
  "/settings/members": "Members",
  "/admin": "Admin",
};

export function Topbar() {
  const pathname = usePathname();
  const { toggle, isOpen } = useAssistant();
  const title = titles[pathname] ?? "GoTofu";

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <button
        onClick={toggle}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
          isOpen
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Ask AI</span>
      </button>
    </header>
  );
}
