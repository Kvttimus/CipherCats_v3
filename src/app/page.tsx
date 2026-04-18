import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, xp")
    .eq("id", user!.id)
    .maybeSingle();

  const tileBase = "h-24 text-lg rounded-xl flex items-center justify-center";

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-zinc-900/80 border-zinc-800 rounded-2xl p-8">
        <CardContent className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold tracking-wider text-amber-300">
              CipherCats
            </h1>
            <p className="text-zinc-400">
              Welcome back,{" "}
              <span className="text-amber-300">{profile?.username ?? "agent"}</span>.{" "}
              <span className="text-zinc-500">{profile?.xp ?? 0} XP</span>
            </p>
          </div>

          {user?.is_anonymous && (
            <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-center text-sm text-amber-200/90">
              Playing as guest. Progress saves on this browser only.{" "}
              <Link href="/signup" className="text-amber-300 underline hover:text-amber-200">
                Create an account
              </Link>{" "}
              to keep your XP across devices.
            </div>
          )}

          <nav className="grid grid-cols-2 gap-4">
            <Link
              href="/menu"
              className={cn(
                buttonVariants({ size: "lg" }),
                tileBase,
                "bg-amber-300 text-zinc-950 hover:bg-amber-200"
              )}
            >
              Play
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                tileBase,
                "border-zinc-700 hover:bg-zinc-800"
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/menu"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                tileBase,
                "border-zinc-700 hover:bg-zinc-800"
              )}
            >
              Menu
            </Link>
            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                size="lg"
                variant="ghost"
                className={cn(tileBase, "w-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")}
              >
                Sign Out
              </Button>
            </form>
          </nav>
        </CardContent>
      </Card>
    </main>
  );
}
