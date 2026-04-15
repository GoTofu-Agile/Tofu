import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPersonaGenCompleteEmail({
  to,
  userName,
  groupName,
  generated,
  groupId,
}: {
  to: string;
  userName?: string | null;
  groupName: string;
  generated: number;
  groupId: string;
}) {
  const displayName = userName ?? to.split("@")[0];
  const personaWord = generated === 1 ? "persona" : "personas";
  const groupUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.gotofu.io"}/personas/${groupId}`;

  await resend.emails.send({
    from: "GoTofu <notifications@gotofu.io>",
    to,
    subject: `Your ${generated} ${personaWord} are ready — ${groupName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="padding:32px 40px 24px;">
          <p style="margin:0 0 6px;font-size:22px;font-weight:600;color:#111827;">
            ${generated} ${personaWord} ready ✓
          </p>
          <p style="margin:0;font-size:14px;color:#6b7280;">
            Hi ${displayName}, your generation for <strong>${groupName}</strong> has finished.
          </p>
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <a href="${groupUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;padding:10px 20px;border-radius:6px;">
            View personas →
          </a>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            You're receiving this because you enabled generation notifications in your
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.gotofu.io"}/settings" style="color:#6b7280;">GoTofu settings</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
