import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_id, xp")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: storylines } = await supabase
    .from("storylines")
    .select("id, title")
    .order("order_index");

  const { data: labsByStoryline } = await supabase
    .from("labs")
    .select("id, storyline_id");

  const { data: completions } = await supabase
    .from("lab_completions")
    .select("lab_id");

  const completedLabIds = new Set(completions?.map((c) => c.lab_id) ?? []);
  const totalByStoryline = new Map<string, number>();
  const doneByStoryline = new Map<string, number>();
  for (const l of labsByStoryline ?? []) {
    totalByStoryline.set(l.storyline_id, (totalByStoryline.get(l.storyline_id) ?? 0) + 1);
    if (completedLabIds.has(l.id)) {
      doneByStoryline.set(l.storyline_id, (doneByStoryline.get(l.storyline_id) ?? 0) + 1);
    }
  }

  const xp = profile?.xp ?? 0;
  const nextLevelXp = 500;

  return (
    <main className="min-h-screen p-4">
      <Card className="mx-auto max-w-3xl bg-zinc-900/80 border-zinc-800 rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-zinc-400 hover:text-zinc-100 text-sm">
              ← Back
            </Link>
            <h1 className="text-xl font-bold tracking-wide">Dashboard</h1>
            <span className="w-10" />
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-5 bg-zinc-950 border border-zinc-800">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="badges">Badges</TabsTrigger>
              <TabsTrigger value="storylines">Storylines</TabsTrigger>
              <TabsTrigger value="completed">Completed Labs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-amber-300/20 border border-amber-300/40" />
                <div className="flex-1">
                  <p className="text-lg font-semibold">{profile?.username ?? "Agent"}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={(xp / nextLevelXp) * 100} className="flex-1" />
                    <span className="text-xs text-zinc-400">{xp} / {nextLevelXp} XP</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                  <p className="text-xs text-zinc-400">Labs completed</p>
                  <p className="text-2xl font-bold">{completedLabIds.size}</p>
                </div>
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
                  <p className="text-xs text-zinc-400">Storylines active</p>
                  <p className="text-2xl font-bold">{(storylines ?? []).length}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="pt-4 text-zinc-500 text-sm">
              Stats coming soon.
            </TabsContent>
            <TabsContent value="badges" className="pt-4 text-zinc-500 text-sm">
              Badges coming soon.
            </TabsContent>

            <TabsContent value="storylines" className="pt-4 space-y-2">
              {(storylines ?? []).map((s) => {
                const total = totalByStoryline.get(s.id) ?? 0;
                const done = doneByStoryline.get(s.id) ?? 0;
                const pct = total === 0 ? 0 : (done / total) * 100;
                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{s.title}</p>
                      <span className="text-xs text-zinc-400">{Math.round(pct)}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="completed" className="pt-4 text-zinc-500 text-sm">
              {completedLabIds.size === 0
                ? "No labs completed yet. Head to the menu to start."
                : `${completedLabIds.size} lab(s) completed.`}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
