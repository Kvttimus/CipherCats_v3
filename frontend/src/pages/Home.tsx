import { useState } from "react";
import { Link } from "react-router";
import { ChevronRight, LayoutDashboard, Map, Play, Settings, Sparkles } from "lucide-react";
import { CatAvatar } from "@/components/CatAvatar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Progress } from "@/components/ui/progress";
import { useMe } from "@/hooks/queries";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";

const item =
  "group flex w-full items-center gap-3 rounded-xl px-5 py-3 text-left text-lg font-semibold tracking-wide transition hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary outline-none";

export default function HomePage() {
  const { data: me } = useMe();
  const [playOpen, setPlayOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (!me) return null;

  const cont = me.continue_journey;

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_380px]">
      <section className="flex flex-col items-center gap-6 py-6 text-center lg:items-start lg:text-left">
        <div className="flex items-center gap-4">
          <CatAvatar avatarId={me.avatar_id} className="size-20 animate-float" />
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <p className="text-2xl font-bold">{me.username}</p>
          </div>
        </div>
        <h1 className="text-5xl font-black tracking-wider text-primary glow-text sm:text-6xl">CipherCats</h1>
        <p className="max-w-md text-muted-foreground">Crack ciphers, outwit the Black Paw syndicate, and become a master codebreaker, one lab at a time.</p>
        <div className="w-full max-w-sm space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="font-medium text-primary">Level {me.level}</span>
            <span>
              {me.xp_into_level} / {me.xp_for_next} XP · {me.xp} total
            </span>
          </div>
          <Progress value={(me.xp_into_level / me.xp_for_next) * 100} className="[&_[data-slot=progress-track]]:h-2" />
        </div>
        {me.is_anonymous && (
          <p className="max-w-sm rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-primary/90">
            Playing as guest. Progress saves on this browser only.{" "}
            <Link to="/signup" className="underline hover:text-primary">
              Create an account
            </Link>{" "}
            to keep it everywhere.
          </p>
        )}
      </section>

      <nav className="panel p-3" aria-label="Main menu">
        <button
          className={cn(item, "text-primary")}
          aria-expanded={playOpen}
          onClick={() => {
            setPlayOpen((o) => !o);
            play("click");
          }}
        >
          <Play className="size-5" /> Play
          <ChevronRight className={cn("ml-auto size-5 transition-transform", playOpen && "rotate-90")} />
        </button>
        {playOpen && (
          <div className="mb-2 ml-6 space-y-1 border-l border-primary/30 pl-3">
            {cont && (
              <Link to={`/labs/${cont.lab_slug}`} className={cn(item, "py-2 text-base")}>
                <Sparkles className="size-4 text-primary" />
                <span>
                  Continue current story
                  <span className="block text-xs font-normal text-muted-foreground">
                    {cont.storyline_title} · {cont.lab_title} ({cont.labs_completed}/{cont.labs_total})
                  </span>
                </span>
              </Link>
            )}
            <Link to="/menu" className={cn(item, "py-2 text-base")}>
              <Map className="size-4 text-primary" /> New story
            </Link>
          </div>
        )}
        <button className={item} onClick={() => setSettingsOpen(true)}>
          <Settings className="size-5" /> Settings
        </button>
        <Link to="/dashboard" className={item}>
          <LayoutDashboard className="size-5" /> Dashboard
        </Link>
        <Link to="/menu" className={item}>
          <Map className="size-5" /> Menu
          <span className="ml-auto text-xs font-normal text-muted-foreground">all storylines</span>
        </Link>

        {cont && !playOpen && (
          <Link
            to={`/labs/${cont.lab_slug}`}
            className="mt-3 block rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent p-4 transition hover:border-primary/60"
          >
            <p className="text-xs font-semibold tracking-widest text-primary">CONTINUE YOUR JOURNEY</p>
            <p className="mt-1 font-semibold">{cont.lab_title}</p>
            <p className="text-xs text-muted-foreground">
              {cont.storyline_title} · {cont.labs_completed}/{cont.labs_total} labs done
            </p>
          </Link>
        )}
      </nav>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
