"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signup } from "../actions";
import { AuthShell } from "@/components/auth/auth-shell";

function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const result = await signup(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError("Could not create your account right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
    <Card className="border-border/80 shadow-[var(--shadow-card)]">
      <CardHeader className="text-center sm:text-left">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Create your account
        </CardTitle>
        <CardDescription>
          We’ll email you a confirmation link—then you’ll land in the app ready to set up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <form action={handleSubmit} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-2">
            <Label htmlFor="name">How should we greet you?</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Alex Kim"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">Minimum 6 characters. Use a unique password you don’t reuse elsewhere.</p>
          </div>
          <Button type="submit" className="w-full cursor-pointer" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border/60 pt-6 sm:justify-start">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
