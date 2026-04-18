import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LabClient from "./LabClient";

export default async function LabPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: lab } = await supabase
    .from("labs")
    .select("id, slug, title, description, story_segment, challenge_prompt, cipher_type, payload, xp_reward")
    .eq("slug", slug)
    .maybeSingle();

  if (!lab) notFound();

  const { data: completion } = await supabase
    .from("lab_completions")
    .select("first_completed_at")
    .eq("lab_id", lab.id)
    .maybeSingle();

  return (
    <main className="min-h-screen p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/menu" className="text-zinc-400 hover:text-zinc-100 text-sm">
            ← Menu
          </Link>
          <h1 className="text-xl font-bold tracking-wide">{lab.title}</h1>
          <span className="w-10" />
        </div>

        <LabClient
          slug={lab.slug}
          title={lab.title}
          storySegment={lab.story_segment ?? ""}
          challengePrompt={lab.challenge_prompt ?? ""}
          payload={(lab.payload as Record<string, unknown>) ?? {}}
          xpReward={lab.xp_reward}
          alreadyCompleted={!!completion}
        />
      </div>
    </main>
  );
}
