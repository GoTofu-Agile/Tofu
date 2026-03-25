"use server";

import { revalidatePath } from "next/cache";

export async function revalidatePersonas() {
  revalidatePath("/personas");
}

export async function revalidateDashboard() {
  revalidatePath("/dashboard");
}

export async function revalidateStudy(studyId: string) {
  revalidatePath(`/studies/${studyId}`);
}
