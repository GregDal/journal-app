"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, CheckCircle, Loader2 } from "lucide-react";

type PageState = "loading" | "ready" | "saving" | "done" | "invalid";

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase browser client exchanges the code/token in the URL automatically.
    // Listen for the PASSWORD_RECOVERY event which fires once the session is set.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("ready");
      } else if (event === "SIGNED_IN" && session) {
        // In case the session was already established (e.g. page refresh)
        setPageState("ready");
      }
    });

    // Also check if a session is already active (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState("ready");
    });

    // If nothing fires within 5 seconds, the link is invalid/expired
    const timeout = setTimeout(() => {
      setPageState((prev) => (prev === "loading" ? "invalid" : prev));
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setPageState("saving");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setPageState("ready");
    } else {
      setPageState("done");
      setTimeout(() => router.push("/"), 2000);
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
          {pageState === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Verifying your reset link…
              </p>
            </div>
          )}

          {pageState === "invalid" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="font-medium text-destructive">Link expired</p>
              <p className="text-sm text-muted-foreground">
                This reset link is invalid or has expired. Please request a new
                one.
              </p>
              <Link
                href="/forgot-password"
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Request a new link
              </Link>
            </div>
          )}

          {(pageState === "ready" || pageState === "saving") && (
            <>
              <p className="mb-5 text-center text-sm font-medium text-foreground">
                Choose a new password
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Same as above"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={pageState === "saving"}
                >
                  {pageState === "saving" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Set new password"
                  )}
                </Button>
              </form>
            </>
          )}

          {pageState === "done" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
              <p className="font-medium">Password updated!</p>
              <p className="text-sm text-muted-foreground">
                Redirecting you to your journal…
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
