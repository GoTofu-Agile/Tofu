"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createPersonaGroupSchema } from "@/lib/validation/schemas";
import {
  createPersonaGroup,
  deletePersonaGroup,
  getPersonaGroup,
} from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";

export async function createGroup(formData: FormData) {
  const user = await requireAuth();

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("activeOrgId")?.value;
  if (!activeOrgId) {
    return { error: "No active organization" };
  }

  const role = await getUserRole(activeOrgId, user.id);
  if (!role) {
    return { error: "Not a member of this organization" };
  }

  const parsed = createPersonaGroupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    domainContext: formData.get("domainContext") || undefined,
    count: Number(formData.get("count")) || 5,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const group = await createPersonaGroup({
    organizationId: activeOrgId,
    name: parsed.data.name,
    description: parsed.data.description,
    domainContext: parsed.data.domainContext,
  });

  revalidatePath("/personas");
  return {
    success: true,
    groupId: group.id,
    count: parsed.data.count,
    domainContext: parsed.data.domainContext,
  };
}

export async function removeGroup(groupId: string) {
  const user = await requireAuth();

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("activeOrgId")?.value;
  if (!activeOrgId) {
    return { error: "No active organization" };
  }

  const role = await getUserRole(activeOrgId, user.id);
  if (!role || role === "VIEWER") {
    return { error: "Insufficient permissions" };
  }

  // Verify group belongs to active org
  const group = await getPersonaGroup(groupId);
  if (!group || group.organizationId !== activeOrgId) {
    return { error: "Group not found" };
  }

  await deletePersonaGroup(groupId);
  revalidatePath("/personas");
  return { success: true };
}
