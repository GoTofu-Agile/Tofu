"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
}

export function OrgSwitcher({ organizations, activeOrgId }: OrgSwitcherProps) {
  const router = useRouter();

  const activeOrg = organizations.find((org) => org.id === activeOrgId);
  const displayName = activeOrg?.isPersonal ? "Personal" : activeOrg?.name ?? "Select workspace";

  function switchOrg(orgId: string) {
    document.cookie = `activeOrgId=${orgId}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-accent transition-colors"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
            Workspace
          </span>
          <span className="text-sm font-semibold truncate leading-tight mt-0.5">
            {displayName}
          </span>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-[220px]">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
