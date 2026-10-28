import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function SignupPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isGuest = Boolean(session?.user.is_anonymous);

  if (!loading && session && !isGuest) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username")).trim();
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    setError(null);

    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      setError("Username must be 3–20 characters: letters, numbers, underscores.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setPending(true);
    try {
      if (isGuest) {
        // Upgrade the anonymous user in place, so XP and badges carry over.
        const { error } = await supabase.auth.updateUser({ email, password, data: { username } });
        if (error) throw error;
        await api.patch("/me", { username });
        await queryClient.invalidateQueries();
        setNotice("Account created! Your guest progress is saved. Check your inbox if Supabase asks you to confirm your email.");
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
      if (error) throw error;
      if (!data.session) {
        setNotice("Almost there! Check your inbox to confirm your email, then log in.");
        return;
      }
      navigate("/avatar", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout title={isGuest ? "Save your progress" : "Join CipherCats"} subtitle={isGuest ? "Turn your guest file into a real agent account." : "Pick your alias, agent."}>
      {notice ? (
        <div className="space-y-4 text-center">
          <p className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">{notice}</p>
          <Link to={isGuest ? "/" : "/login"} className="text-sm text-primary hover:underline">
            {isGuest ? "Back to the game" : "Go to login"}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" autoComplete="username" minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Creating…" : "Create Account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isGuest ? (
              <Link to="/" className="text-primary hover:underline">
                Keep playing as guest
              </Link>
            ) : (
              <>
                Already an agent?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Log in
                </Link>
              </>
            )}
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
