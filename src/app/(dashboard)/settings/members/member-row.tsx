"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { kickMember, changeMemberRole } from "./actions";

type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

interface MemberRowProps {
  member: {
    id: string;
    role: OrgRole;
    user: { id: string; email: string; name: string | null; avatarUrl: string | null };
  };
  currentUserId: string;
  canManage: boolean;
}

const roleColors: Record<OrgRole, string> = {
  OWNER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  MEMBER: "bg-muted text-muted-foreground",
  VIEWER: "bg-muted text-muted-foreground",
};

export function MemberRow({ member, currentUserId, canManage }: MemberRowProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isSelf = member.user.id === currentUserId;
  const isOwner = member.role === "OWNER";
  const initials = (member.user.name ?? member.user.email).slice(0, 2).toUpperCase();

  async function handleRemove() {
    if (!confirm(`Remove ${member.user.name ?? member.user.email}?`)) return;
    setLoading(true);
    const result = await kickMember(member.user.id);
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Member removed");
      router.refresh();
    }
  }

  async function handleRoleChange(newRole: "ADMIN" | "MEMBER" | "VIEWER") {
    setLoading(true);
    const result = await changeMemberRole(member.user.id, newRole);
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Role updated");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {member.user.avatarUrl ? (
          <img src={member.user.avatarUrl} className="h-8 w-8 rounded-full object-cover" alt="" />
        ) : (
          initials
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {member.user.name ?? member.user.email}
          {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
        </p>
        {member.user.name && (
          <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
        )}
      </div>

      {/* Role */}
      {canManage && !isOwner && !isSelf ? (
        <select
          value={member.role}
          onChange={(e) => handleRoleChange(e.target.value as "ADMIN" | "MEMBER" | "VIEWER")}
          disabled={loading}
          className="rounded-md border bg-background px-2 py-1 text-xs"
        >
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </select>
      ) : (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[member.role]}`}>
          {member.role.toLowerCase()}
        </span>
      )}

      {/* Remove */}
      {canManage && !isOwner && !isSelf && (
        <button
          onClick={handleRemove}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          Remove
        </button>
      )}
    </div>
  );
}
