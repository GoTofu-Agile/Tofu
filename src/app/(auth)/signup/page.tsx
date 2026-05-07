"use client";

import { Suspense, useState, useTransition, useDeferredValue } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { GoogleButton } from "@/components/auth/google-button";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signup } from "../actions";

function mapError(message: string): string {
  const t = message.toLowerCase();
  if (t.includes("already registered") || t.includes("already exists"))
    return "This email is already in use. Try signing in instead.";
  if (t.includes("password")) return "Password must meet the minimum requirements.";
  if (t.includes("rate limit") || t.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  return "Could not create your account right now. Please try again.";
}

function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [password, setPassword] = useState("");
  // Defer strength meter updates so they never block the input render
  const deferredPassword = useDeferredValue(password);

  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const busy = isPending || googleBusy;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await signup(formData);
        if (result?.error) setError(mapError(result.error));
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError("Could not create your account right now. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
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

      <GoogleButton
        next={next}
        disabled={isPending}
        onError={setError}
        onLoadingChange={setGoogleBusy}
      />

      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

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
            autoFocus
            required
            disabled={busy}
            onChange={() => setError(null)}
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
            onChange={() => setError(null)}
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
          <PasswordStrength password={deferredPassword} />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {isPending ? (
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
        <Link href="https://gotofu.io/terms" target="_blank" className="underline underline-offset-4 hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="https://gotofu.io/privacy" target="_blank" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>

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
