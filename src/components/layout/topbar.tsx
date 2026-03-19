"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  Settings,
  UserPlus,
  ShieldCheck,
  Sparkles,
  PanelLeft,
} from "lucide-react";
import { useAssistant } from "@/components/assistant/assistant-provider";

const routes: Record<string, { title: string; icon: typeof LayoutDashboard }> = {
  "/dashboard": { title: "Home", icon: LayoutDashboard },
  "/personas": { title: "Personas", icon: Users },
  "/studies": { title: "Studies", icon: FlaskConical },
  "/settings": { title: "Settings", icon: Settings },
  "/settings/members": { title: "Members", icon: UserPlus },
  "/admin": { title: "Admin", icon: ShieldCheck },
};

export function Topbar() {
  const pathname = usePathname();
  const { toggle, isOpen, toggleSidebar } = useAssistant();

  const route = routes[pathname] ?? { title: "GoTofu", icon: LayoutDashboard };
  const Icon = route.icon;

  return (
    <header className="flex h-12 items-center justify-between px-4 border-b border-border">
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1.5 text-muted-foreground/50 hover:text-foreground transition-colors"
          title="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 ml-1">
          <Icon className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-[13px] font-medium text-muted-foreground">
            {route.title}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggle}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-all ${
            isOpen
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          Ask
        </button>
      </div>
    </header>
  );
}
