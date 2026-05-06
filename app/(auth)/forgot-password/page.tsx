"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-sm">
          <BookOpen className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your private space for reflection
          </p>
        </div>
      </div>

      <Card className="w-full max-w-sm shadow-sm">
        <CardContent className="pt-6">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <MailCheck className="h-10 w-10 text-primary" />
              <p className="font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to{" "}
                <span className="font-medium text-foreground">{email}</span>.
                It expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-1 text-center text-sm font-medium text-foreground">
                Reset your password
              </p>
              <p className="mb-5 text-center text-xs text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
              <p className="mt-5 text-center text-sm text-muted-foreground">
                Remember it?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
