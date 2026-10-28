import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { play } from "@/lib/sound";

export default function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"login" | "guest" | null>(null);

  if (!loading && session) return <Navigate to={from} replace />;

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setPending("login");
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    setPending(null);
    if (error) {
      play("error");
      setError(error.message);
    } else {
      play("success");
      navigate(from, { replace: true });
    }
  }

  async function onGuest() {
    setError(null);
    setPending("guest");
    const { error } = await supabase.auth.signInAnonymously();
    setPending(null);
    if (error) setError(error.message);
    else navigate("/avatar", { replace: true });
  }

  return (
    <AuthLayout title="CipherCats" subtitle="Enter the cipher, agent.">
      <form onSubmit={onLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending !== null} className="w-full">
          {pending === "login" ? "Starting…" : "Start Game"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" size="lg" className="w-full" disabled={pending !== null} onClick={onGuest}>
        {pending === "guest" ? "Spinning up guest…" : "Continue as Guest"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">Guest progress saves on this browser. Create an account later to keep it.</p>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
