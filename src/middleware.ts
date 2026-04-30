import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    const target = new URL(configuredAppUrl);
    const current = request.nextUrl;
    const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || current.host;
    const hostParts = hostHeader.split(":");
    const headerHostname = hostParts[0] || current.hostname;
    const headerPort = hostParts[1] || current.port;
    const currentPort = headerPort || (current.protocol === "https:" ? "443" : "80");
    const targetPort = target.port || (target.protocol === "https:" ? "443" : "80");
    const hostMismatch =
      headerHostname !== target.hostname ||
      current.protocol !== target.protocol ||
      currentPort !== targetPort;
    if (hostMismatch) {
      const redirectUrl = new URL(current.toString());
      redirectUrl.protocol = target.protocol;
      redirectUrl.hostname = target.hostname;
      redirectUrl.port = target.port;
      return NextResponse.redirect(redirectUrl);
    }
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
