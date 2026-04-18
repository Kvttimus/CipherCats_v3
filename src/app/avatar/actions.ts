"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function selectAvatar(formData: FormData) {
  const avatarId = Number(formData.get("avatar_id"));
  if (!Number.isInteger(avatarId) || avatarId < 0 || avatarId > 3) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ avatar_id: avatarId }).eq("id", user.id);
  redirect("/");
}
