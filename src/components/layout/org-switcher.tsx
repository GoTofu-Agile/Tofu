"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  }>;
  activeOrgId: string;
  collapsed?: boolean;
}

export function OrgSwitcher({ organizations, activeOrgId, collapsed }: OrgSwitcherProps) {
  const router = useRouter();
  const activeOrg = organizations.find((org) => org.id === activeOrgId);
  const displayName = activeOrg?.isPersonal ? "Personal" : activeOrg?.name ?? "Workspace";

  function switchOrg(orgId: string) {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `activeOrgId=${orgId}; path=/; max-age=31536000`;
    router.refresh();
  }

  // Collapsed: just a colored dot
  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center justify-center rounded-lg p-1.5 hover:bg-white/10 transition-colors">
          <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-[200px]">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem key={org.id} onClick={() => switchOrg(org.id)} className="cursor-pointer">
                <span className="flex-1 truncate">{org.isPersonal ? "Personal" : org.name}</span>
                {org.id === activeOrgId && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings?new=true")} className="cursor-pointer">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Expanded: dot + name + chevron
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/50 transition-colors">
        <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="text-[13px] font-medium truncate flex-1">{displayName}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="w-[200px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem key={org.id} onClick={() => switchOrg(org.id)} className="cursor-pointer">
              <span className="flex-1 truncate">{org.isPersonal ? "Personal" : org.name}</span>
              {org.id === activeOrgId && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings?new=true")} className="cursor-pointer">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
