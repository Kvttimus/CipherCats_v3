import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-300",
  hard: "text-orange-400",
  extreme: "text-red-400",
};

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: storylines } = await supabase
    .from("storylines")
    .select("id, slug, title, description, difficulty, order_index")
    .order("order_index", { ascending: true });

  // Fetch all lab slugs grouped by storyline (used to deep-link Play -> first lab)
  const { data: labs } = await supabase
    .from("labs")
    .select("storyline_id, slug, order_index")
    .order("order_index", { ascending: true });

  const firstLabByStoryline = new Map<string, string>();
  for (const l of labs ?? []) {
    if (!firstLabByStoryline.has(l.storyline_id)) {
      firstLabByStoryline.set(l.storyline_id, l.slug);
    }
  }

  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-zinc-900/80 border-zinc-800 rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-zinc-400 hover:text-zinc-100 text-sm">
              ← Back
            </Link>
            <h1 className="text-xl font-bold tracking-wide">Menu</h1>
            <span className="w-10" />
          </div>

          <ul className="space-y-2">
            {(storylines ?? []).map((s) => {
              const firstLab = firstLabByStoryline.get(s.id);
              const href = firstLab ? `/labs/${firstLab}` : "#";
              return (
                <li key={s.id}>
                  <Link
                    href={href}
                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/60 transition"
                  >
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-xs text-zinc-400">{s.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`border-zinc-700 ${difficultyColor[s.difficulty] ?? "text-zinc-300"}`}
                    >
                      Difficulty: {s.difficulty}
                    </Badge>
                  </Link>
                </li>
              );
            })}
            {(!storylines || storylines.length === 0) && (
              <li className="text-center text-sm text-zinc-500 py-8">
                No storylines yet. Seed the database to see content here.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
