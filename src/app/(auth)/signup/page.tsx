"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { signup } from "../actions";
import { createClient } from "@/lib/supabase/client";

function mapError(message: string): string {
  const t = message.toLowerCase();
  if (t.includes("already registered") || t.includes("already exists"))
    return "This email is already in use. Try signing in instead.";
  if (t.includes("password")) return "Password must meet the minimum requirements.";
  if (t.includes("rate limit") || t.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  return "Could not create your account right now. Please try again.";
}

function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 1;
  if (pw.length >= 8) score++;
  if (pw.length >= 12 || (/[A-Z]/.test(pw) && /[0-9!@#$%^&*]/.test(pw))) score++;
  return score as 0 | 1 | 2 | 3;
}

const scoreLabel = ["", "Weak", "Fair", "Strong"];
const scoreColor = ["", "bg-destructive", "bg-orange-400", "bg-green-500"];
const scoreFg = ["", "text-destructive", "text-orange-500", "text-green-600"];

function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  if (!password) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= score ? scoreColor[score] : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${scoreFg[score]}`}>
        {scoreLabel[score]}
      </p>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none">
      <path d="M21.6 12.23c0-.82-.07-1.61-.21-2.36H12v4.47h5.4a4.62 4.62 0 0 1-2.01 3.03v2.52h3.25c1.9-1.75 2.96-4.33 2.96-7.66Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.25-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.06v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.42 13.89a5.99 5.99 0 0 1 0-3.78v-2.6H3.06a10 10 0 0 0 0 8.98l3.36-2.6Z" fill="#FBBC05" />
      <path d="M12 5.98c1.47 0 2.8.5 3.84 1.49l2.88-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.36 2.6C7.2 7.74 9.4 5.98 12 5.98Z" fill="#EA4335" />
    </svg>
  );
}

function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const busy = loading || googleLoading;

  async function handleSubmit(formData: FormData) {
    if (busy) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signup(formData);
      if (result?.error) setError(mapError(result.error));
    } catch {
      setError("Could not create your account right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectPath = next
        ? `/callback?next=${encodeURIComponent(next)}`
        : "/callback";
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      ).replace(/\/$/, "");
      await supabase.auth.signOut();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}${redirectPath}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) {
        setError("Google sign-up is unavailable right now. Try again.");
        return;
      }
      if (data.url) window.location.assign(data.url);
    } catch {
      setError("Could not start Google sign-up. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Start your free account—no credit card required.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Google — primary CTA */}
      <Button
        variant="outline"
        className="w-full gap-2"
        size="lg"
        onClick={handleGoogle}
        disabled={busy}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Form */}
      <form action={handleSubmit} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Alex Kim"
            required
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Minimum 6 characters"
            required
            minLength={6}
            disabled={busy}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="https://gotofu.io/terms" className="underline underline-offset-4 hover:text-foreground" target="_blank">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="https://gotofu.io/privacy" className="underline underline-offset-4 hover:text-foreground" target="_blank">
          Privacy Policy
        </Link>
        .
      </p>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
