"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  Upload,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgSwitcher } from "./org-switcher";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Personas", href: "/personas", icon: Users },
  { name: "Studies", href: "/studies", icon: FlaskConical },
  { name: "Uploads", href: "/uploads", icon: Upload },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    isPersonal: boolean;
    members: Array<{ role: string }>;
    _count: { members: number };
  }>;
  activeOrgId: string;
}

export function Sidebar({ user, organizations, activeOrgId }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          GoTofu
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <OrgSwitcher
          organizations={organizations}
          activeOrgId={activeOrgId}
          user={user}
        />
      </div>
    </aside>
  );
}
