"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FlaskConical,
  Settings,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgSwitcher } from "./org-switcher";
import { signOut } from "@/app/(auth)/actions";
import { useAssistant } from "@/components/assistant/assistant-provider";

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
  isAdmin?: boolean;
}

const mainNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Personas", href: "/personas", icon: Users },
  { name: "Studies", href: "/studies", icon: FlaskConical },
];

export function Sidebar({ user, organizations, activeOrgId, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useAssistant();
  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const isPersonalWorkspace = activeOrg?.isPersonal ?? false;

  useEffect(() => {
    const m = pathname?.match(/^\/o\/([^/]+)/);
    const pathSlug = m?.[1];
    const orgFromPath = pathSlug
      ? organizations.find((o) => o.slug === pathSlug)
      : undefined;

    if (orgFromPath) {
      document.cookie = `activeOrgId=${orgFromPath.id}; path=/; max-age=31536000`;
      document.cookie = `activeOrgSlug=${orgFromPath.slug}; path=/; max-age=31536000`;
      return;
    }

    document.cookie = `activeOrgId=${activeOrgId}; path=/; max-age=31536000`;
    if (activeOrg?.slug) {
      document.cookie = `activeOrgSlug=${activeOrg.slug}; path=/; max-age=31536000`;
    }
  }, [activeOrgId, activeOrg?.slug, pathname, organizations]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/settings") return pathname === "/settings";
    return pathname.startsWith(href);
  }

  const collapsed = sidebarCollapsed;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col transition-all duration-200 overflow-hidden bg-stone-50",
        collapsed ? "w-14" : "w-52"
      )}
    >
      {/* Brand + Workspace */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <Link href="/dashboard" className="text-xs font-bold text-foreground">
            GT
          </Link>
          <OrgSwitcher
            organizations={organizations}
            activeOrgId={activeOrgId}
            collapsed
          />
        </div>
      ) : (
        <>
          <div className="px-4 pt-4 pb-1">
            <Link href="/dashboard" className="text-base font-bold tracking-tight">
              GoTofu
            </Link>
          </div>
          <div className="px-2 py-2">
            <OrgSwitcher
              organizations={organizations}
              activeOrgId={activeOrgId}
            />
          </div>
        </>
      )}

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto pb-4", collapsed ? "px-1.5" : "px-2")}>
        {!collapsed && (
          <p className="px-3 pb-1 pt-3 text-[11px] font-medium text-muted-foreground/70">
            Playground
          </p>
        )}
        {mainNav.map((item) => (
          <NavItem
            key={item.name}
            href={item.href}
            icon={item.icon}
            active={isActive(item.href)}
            collapsed={collapsed}
          >
            {item.name}
          </NavItem>
        ))}

        {collapsed ? (
          <div className="my-3 mx-2 border-t border-border" />
        ) : (
          <p className="mt-6 mb-1 px-3 text-[11px] font-medium text-muted-foreground/70">
            Workspace
          </p>
        )}

        {!isPersonalWorkspace && (
          <NavItem
            href="/settings/members"
            icon={UserPlus}
            active={isActive("/settings/members")}
            collapsed={collapsed}
          >
            Members
          </NavItem>
        )}
        <NavItem
          href="/settings"
          icon={Settings}
          active={isActive("/settings")}
          collapsed={collapsed}
        >
          Settings
        </NavItem>
        {isAdmin && (
          <NavItem
            href="/admin"
            icon={ShieldCheck}
            active={isActive("/admin")}
            collapsed={collapsed}
          >
            Admin
          </NavItem>
        )}
      </nav>

      {/* User */}
      <div className={cn("py-3", collapsed ? "px-1.5" : "px-3")}>
        {collapsed ? (
          <button
            onClick={() => signOut()}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground/50 hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{user.name || "User"}</p>
              <p className="text-[11px] text-muted-foreground/70 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="rounded-lg p-1.5 text-muted-foreground/50 hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  active,
  collapsed,
  children,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  if (collapsed) {
    return (
      <Link
        href={href}
        title={children as string}
        className={cn(
          "flex items-center justify-center rounded-lg p-2 transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground/50 hover:text-foreground hover:bg-accent/50"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
        active
          ? "font-semibold text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
