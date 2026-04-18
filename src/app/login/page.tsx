"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, loginAsGuest, type AuthResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(login, undefined);
  const [guestState, guestFormAction, guestPending] = useActionState<AuthResult, FormData>(loginAsGuest, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm bg-zinc-900/80 border-zinc-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl tracking-wide">
            CipherCats
          </CardTitle>
          <p className="text-center text-sm text-zinc-400">Enter the cipher, agent.</p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
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
                autoComplete="current-password"
                required
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-red-400" role="alert">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="w-full bg-amber-300 text-zinc-950 hover:bg-amber-200">
              {pending ? "Starting…" : "Start Game"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-zinc-500">
            <span className="h-px flex-1 bg-zinc-800" />
            or
            <span className="h-px flex-1 bg-zinc-800" />
          </div>

          <form action={guestFormAction}>
            <Button
              type="submit"
              disabled={guestPending}
              variant="outline"
              className="w-full border-zinc-700 hover:bg-zinc-800"
            >
              {guestPending ? "Spinning up guest…" : "Continue as Guest"}
            </Button>
            {guestState?.error && (
              <p className="mt-2 text-sm text-red-400" role="alert">{guestState.error}</p>
            )}
          </form>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Progress saves on this browser only. You can upgrade to an account later.
          </p>

          <p className="mt-4 text-center text-sm text-zinc-400">
            New here?{" "}
            <Link href="/signup" className="text-amber-300 hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
