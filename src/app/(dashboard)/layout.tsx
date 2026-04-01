import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuthWithOrgs } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AppFrame } from "@/components/layout/app-frame";
import { AssistantProvider } from "@/components/assistant/assistant-provider";
import { AssistantChatLazy } from "@/components/assistant/assistant-chat-lazy";
import { FeedbackOverlay } from "@/components/feedback/feedback-overlay";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let authData;
  try {
    authData = await requireAuthWithOrgs();
  } catch {
    redirect(
      "/login?message=" +
        encodeURIComponent(
          "Could not load your account. If you switched Supabase project, verify env vars and run database setup."
        )
    );
  }

  const { user, organizations } = authData;

  if (organizations.length === 0) {
    throw new Error(
      "No organizations found. Please try logging out and back in, or contact support."
    );
  }

  // Determine active org from cookie, default to first
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("activeOrgId")?.value;
  const activeOrgId =
    organizations.find((org) => org.id === cookieOrgId)?.id ??
    organizations[0].id;

  const adminEmails = (process.env.GOTOFU_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim());
  const isAdmin = adminEmails.includes(user.email);

  return (
    <AssistantProvider>
      <div className="relative h-screen w-screen overflow-hidden bg-background">
        <AppFrame>
          <Sidebar
            user={user}
            organizations={organizations}
            activeOrgId={activeOrgId}
            isAdmin={isAdmin}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-[var(--page-padding-x)] sm:py-[var(--page-padding-y)]">
              {children}
            </main>
          </div>
        </AppFrame>
        <AssistantChatLazy />
        <FeedbackOverlay />
      </div>
    </AssistantProvider>
  );
}
