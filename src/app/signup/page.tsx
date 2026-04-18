"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(signup, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm bg-zinc-900/80 border-zinc-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl tracking-wide">
            Join CipherCats
          </CardTitle>
          <p className="text-center text-sm text-zinc-400">Your first alias, agent.</p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                required
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-red-400" role="alert">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="w-full bg-amber-300 text-zinc-950 hover:bg-amber-200">
              {pending ? "Creating…" : "Create Account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-400">
            Already an agent?{" "}
            <Link href="/login" className="text-amber-300 hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
