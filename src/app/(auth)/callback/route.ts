import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAppBaseUrl } from "@/lib/url/app-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const appBaseUrl = resolveAppBaseUrl(request.headers);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${appBaseUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${appBaseUrl}/login?message=Could not authenticate`);
}
