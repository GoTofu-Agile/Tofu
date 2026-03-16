import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getInvitationByToken, acceptInvitation } from "@/lib/db/queries/organizations";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    // Not logged in — send back to the invite page
    return NextResponse.redirect(`${origin}/accept-invite/${token}`);
  }

  const dbUser = await getUser(authUser.id);
  if (!dbUser) {
    return NextResponse.redirect(`${origin}/accept-invite/${token}`);
  }

  const invitation = await getInvitationByToken(token);
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return NextResponse.redirect(`${origin}/accept-invite/${token}?error=invalid`);
  }

  let org;
  try {
    org = await acceptInvitation(token, dbUser.id);
  } catch {
    // Already a member or DB error — redirect gracefully
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  if (!org) {
    return NextResponse.redirect(`${origin}/accept-invite/${token}?error=invalid`);
  }

  const response = NextResponse.redirect(`${origin}/dashboard`);
  response.cookies.set("activeOrgId", org.id, {
    maxAge: 60 * 60 * 24 * 365 * 30,
    path: "/",
  });

  return response;
}
