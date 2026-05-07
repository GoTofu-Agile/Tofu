"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(formData: FormData): string | null {
  const raw = formData.get("next");
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: str(formData, "email"),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };
  redirect(getSafeNextPath(formData) ?? "/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: str(formData, "email"),
    password: String(formData.get("password") ?? ""),
    options: { data: { name: str(formData, "name") } },
  });
  if (error) return { error: error.message };
  const nextQuery = getSafeNextPath(formData);
  redirect(
    `/login?message=Check your email to confirm your account${nextQuery ? `&next=${encodeURIComponent(nextQuery)}` : ""}`,
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  // Fire and forget — never reveal whether the email is registered
  await supabase.auth.resetPasswordForEmail(str(formData, "email"), {
    redirectTo: `${appUrl}/callback?next=/reset-password`,
  });
  redirect("/forgot-password?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  redirect("/login?message=Password updated. Sign in with your new password.");
}
