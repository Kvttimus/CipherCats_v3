import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { normalizeAnswer } from "@/lib/crypto/caesar";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { answer?: string; time_taken_ms?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const answer = String(body.answer ?? "").slice(0, 2000);
  if (!answer) {
    return NextResponse.json({ error: "Answer is required" }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data: lab } = await admin
    .from("labs")
    .select("id, xp_reward")
    .eq("slug", slug)
    .maybeSingle();

  if (!lab) {
    return NextResponse.json({ error: "Lab not found" }, { status: 404 });
  }

  const { data: solutionRow } = await admin
    .from("lab_solutions")
    .select("solution")
    .eq("lab_id", lab.id)
    .maybeSingle();

  if (!solutionRow) {
    return NextResponse.json({ error: "Lab has no solution configured" }, { status: 500 });
  }

  const correct = normalizeAnswer(answer) === normalizeAnswer(solutionRow.solution);

  await admin.from("lab_attempts").insert({
    user_id: user.id,
    lab_id: lab.id,
    submitted_answer: answer,
    correct,
    time_taken_ms: typeof body.time_taken_ms === "number" ? body.time_taken_ms : null,
  });

  let xpAwarded = 0;

  if (correct) {
    const { data: existing } = await admin
      .from("lab_completions")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("lab_id", lab.id)
      .maybeSingle();

    if (!existing) {
      await admin.from("lab_completions").insert({
        user_id: user.id,
        lab_id: lab.id,
        attempts_count: 1,
      });

      const { data: profile } = await admin
        .from("profiles")
        .select("xp")
        .eq("id", user.id)
        .maybeSingle();

      const newXp = (profile?.xp ?? 0) + lab.xp_reward;
      await admin.from("profiles").update({ xp: newXp }).eq("id", user.id);
      xpAwarded = lab.xp_reward;
    }

    revalidatePath("/", "layout");
  }

  return NextResponse.json({ correct, xp_awarded: xpAwarded });
}
