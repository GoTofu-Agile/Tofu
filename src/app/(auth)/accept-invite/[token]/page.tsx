import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getInvitationByToken } from "@/lib/db/queries/organizations";
import { Users } from "lucide-react";

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function AcceptInvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;

  const invitation = await getInvitationByToken(token);

  // Redirect already-authed users straight to the accept handler
  const authUser = await getAuthUser();
  if (authUser && invitation && !invitation.acceptedAt && invitation.expiresAt > new Date()) {
    redirect(`/api/accept-invite?token=${token}`);
  }

  const isExpiredOrInvalid =
    error === "invalid" ||
    !invitation ||
    !!invitation.acceptedAt ||
    invitation.expiresAt < new Date();

  if (isExpiredOrInvalid) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Users className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-semibold">Invite invalid or expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite link is no longer valid. Ask the workspace owner for a new one.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 h-10 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Go to login
        </Link>
      </div>
    );
  }

  const orgName = invitation.organization.name;
  const roleName = invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase();
  const nowMs = new Date().getTime();
  const daysUntilExpiry = Math.ceil(
    (new Date(invitation.expiresAt).getTime() - nowMs) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-semibold">You&apos;re invited to join</h1>
        <p className="text-2xl font-bold">{orgName}</p>
        <p className="text-sm text-muted-foreground">
          You&apos;ll join as a <strong>{roleName}</strong>.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href={`/signup?next=/api/accept-invite?token=${token}`}
          className="flex w-full items-center justify-center rounded-lg bg-primary px-4 h-10 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Create account &amp; join
        </Link>
        <Link
          href={`/login?next=/api/accept-invite?token=${token}`}
          className="flex w-full items-center justify-center rounded-lg border px-4 h-10 text-sm font-medium hover:bg-muted transition-colors"
        >
          Log in &amp; join
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Invite expires in {daysUntilExpiry} days.
      </p>
    </div>
  );
}
