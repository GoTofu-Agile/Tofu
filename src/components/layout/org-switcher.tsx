"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";

interface OrgSwitcherProps {
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    isPersonal: boolean;
    members: Array<{ role: string }>;
    _count: { members: number };
  }>;
  activeOrgId: string;
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
}

export function OrgSwitcher({ organizations, activeOrgId, user }: OrgSwitcherProps) {
  const router = useRouter();

  const activeOrg = organizations.find((org) => org.id === activeOrgId);
  const displayName = activeOrg?.isPersonal ? "Personal" : activeOrg?.name ?? "Select workspace";
  const initials = displayName.slice(0, 2).toUpperCase();

  function switchOrg(orgId: string) {
    document.cookie = `activeOrgId=${orgId}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium truncate max-w-[120px]">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {user.email}
            </span>
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8}>
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrg(org.id)}
            className="cursor-pointer"
          >
            <span className="flex-1 truncate">
              {org.isPersonal ? "Personal" : org.name}
            </span>
            {org.id === activeOrgId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/settings?new=true")}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create workspace
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className={cn("cursor-pointer text-destructive")}
          variant="destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
