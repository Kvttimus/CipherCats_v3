import { useState } from "react";
import { useNavigate } from "react-router";
import { CatAvatar } from "@/components/CatAvatar";
import { AVATARS } from "@/lib/avatars";
import { Button } from "@/components/ui/button";
import { useMe, useSetAvatar } from "@/hooks/queries";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";

export default function AvatarPage() {
  const { data: me } = useMe();
  const [selected, setSelected] = useState<number>(me?.avatar_chosen ? me.avatar_id : 0);
  const setAvatar = useSetAvatar();
  const navigate = useNavigate();

  async function confirm() {
    await setAvatar.mutateAsync(selected);
    play("unlock");
    navigate("/", { replace: true });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="panel p-8">
        <p className="text-sm font-semibold tracking-widest text-primary">STEP 1</p>
        <h1 className="mb-6 text-2xl font-bold">Choose your agent</h1>
        <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Avatar">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={selected === a.id}
              onClick={() => {
                setSelected(a.id);
                play("click");
              }}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-xl border-2 bg-muted/30 p-4 transition",
                selected === a.id ? "border-primary bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/60",
              )}
            >
              <CatAvatar avatarId={a.id} className={cn("size-24 transition-transform", selected === a.id && "scale-110 animate-float")} />
              <span className="text-sm font-medium">{a.name}</span>
            </button>
          ))}
        </div>
        {setAvatar.isError && <p className="mt-4 text-sm text-destructive">{setAvatar.error.message}</p>}
        <Button size="lg" className="mt-6 w-full" onClick={confirm} disabled={setAvatar.isPending}>
          {setAvatar.isPending ? "Saving…" : me?.avatar_chosen ? "Save avatar" : "Begin your journey"}
        </Button>
      </div>
    </div>
  );
}
