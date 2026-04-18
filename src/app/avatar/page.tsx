import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { selectAvatar } from "./actions";

const AVATARS = [
  { id: 0, name: "Crimson", color: "bg-red-500" },
  { id: 1, name: "Azure", color: "bg-sky-400" },
  { id: 2, name: "Verdant", color: "bg-emerald-500" },
  { id: 3, name: "Ember", color: "bg-orange-500" },
];

export default function AvatarPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-zinc-900/80 border-zinc-800 rounded-2xl">
        <CardContent className="space-y-6 p-8">
          <div className="text-center space-y-1">
            <p className="text-amber-300 font-semibold tracking-widest text-sm">STEP 1</p>
            <h1 className="text-2xl font-bold">Choose an Avatar</h1>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {AVATARS.map((a) => (
              <form key={a.id} action={selectAvatar}>
                <input type="hidden" name="avatar_id" value={a.id} />
                <Button
                  type="submit"
                  variant="outline"
                  className="h-32 w-full flex-col gap-2 border-zinc-800 hover:border-amber-300 hover:bg-zinc-800 rounded-xl"
                >
                  <div className={`size-16 rounded-full ${a.color}`} aria-hidden />
                  <span className="text-sm text-zinc-300">{a.name}</span>
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
