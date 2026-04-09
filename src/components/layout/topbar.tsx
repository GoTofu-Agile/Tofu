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
  Upload,
} from "lucide-react";
import { useAssistant } from "@/components/assistant/assistant-provider";

const routes: Record<string, { title: string; icon: typeof LayoutDashboard }> = {
  "/dashboard": { title: "Home", icon: LayoutDashboard },
  "/personas": { title: "Personas", icon: Users },
  "/studies": { title: "Studies", icon: FlaskConical },
  "/settings": { title: "Settings", icon: Settings },
  "/settings/members": { title: "Members", icon: UserPlus },
  "/admin": { title: "Admin", icon: ShieldCheck },
  "/uploads": { title: "Uploads", icon: Upload },
};

function resolveRoute(pathname: string): { title: string; icon: typeof LayoutDashboard } {
  const exact = routes[pathname];
  if (exact) return exact;

  if (pathname.startsWith("/personas/new")) {
    return { title: "New persona group", icon: Users };
  }
  if (/^\/personas\/[^/]+$/.test(pathname)) {
    return { title: "Persona group", icon: Users };
  }
  if (pathname.startsWith("/studies/new")) {
    return { title: "New study", icon: FlaskConical };
  }
  if (/^\/studies\/[^/]+/.test(pathname)) {
    return { title: "Study", icon: FlaskConical };
  }
  if (pathname.startsWith("/o/")) {
    return { title: "Workspace", icon: LayoutDashboard };
  }

  return { title: "GoTofu", icon: LayoutDashboard };
}

export function Topbar() {
  const pathname = usePathname();
  const { toggle, isOpen, toggleSidebar, sidebarCollapsed } = useAssistant();

  const route = resolveRoute(pathname);
  const Icon = route.icon;

  return (
    <header className="flex h-12 items-center justify-between px-4 border-b border-border">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={sidebarCollapsed}
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
          type="button"
          onClick={toggle}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${
            isOpen
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
          aria-label="Open Ask — your research copilot"
          aria-expanded={isOpen}
          aria-controls="ask-panel"
        >
          <Sparkles className="h-3 w-3" />
          <span className="hidden sm:inline">Ask AI</span>
          <span className="sm:hidden">Ask</span>
        </button>
      </div>
    </header>
  );
}
