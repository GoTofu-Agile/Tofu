"use server";

import { requireAuth } from "@/lib/auth";
import {
  updateOrganization,
  getUserRole,
  createOrganization,
  getOrganizationsForUser,
} from "@/lib/db/queries/organizations";

export async function updateWorkspaceName(orgId: string, name: string) {
  const user = await requireAuth();

  const role = await getUserRole(orgId, user.id);
  if (role !== "OWNER" && role !== "ADMIN") {
    return { error: "You don't have permission to update this workspace." };
  }

  if (!name || name.trim().length === 0) {
    return { error: "Workspace name is required." };
  }

  await updateOrganization(orgId, { name: name.trim() });
  return { success: true };
}

export async function createWorkspace(name: string) {
  const user = await requireAuth();

  if (!name || name.trim().length < 2) {
    return { error: "Workspace name must be at least 2 characters." };
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  try {
    const org = await createOrganization(name.trim(), slug, user.id);
    return { success: true, orgId: org.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { error: "A workspace with this name already exists." };
    }
    throw error;
  }
}
