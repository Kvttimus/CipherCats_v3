import { useState } from "react";
import { useNavigate } from "react-router";
import { Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingScreen } from "@/components/States";
import { useStorylines } from "@/hooks/queries";
import type { StorylineSummary } from "@/lib/api";
import { DIFFICULTY_STYLE } from "@/lib/display";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";

export default function MenuPage() {
  const { data, isPending, error, refetch } = useStorylines();
  const [selected, setSelected] = useState<StorylineSummary | null>(null);
  const navigate = useNavigate();

  if (isPending) return <LoadingScreen />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="panel p-6">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-wide">Menu</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Choose any storyline. Each one is a separate campaign through a different corner of cryptography, so start wherever you like.
        </p>
        {data.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No storylines yet. Run supabase/seed.sql to load content.</p>
        )}
        <ul className="space-y-2">
          {data.map((s) => {
            const pct = s.labs_total ? Math.round((100 * s.labs_completed) / s.labs_total) : 0;
            return (
              <li key={s.slug}>
                <button
                  onClick={() => {
                    setSelected(s);
                    play("click");
                  }}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl border border-border bg-background/50 p-4 text-left transition hover:border-primary/40 hover:bg-muted/50",
                    !s.available && "opacity-60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold">
                      {s.title}
                      {!s.available && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                          Coming soon
                        </span>
                      )}
                      {s.available && pct === 100 && <Trophy className="size-4 text-primary" />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{s.theme}</p>
                    {s.available && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-success" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 capitalize", DIFFICULTY_STYLE[s.difficulty])}>
                    Difficulty: {s.difficulty}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="border border-primary/40 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">{selected.title}</DialogTitle>
              <DialogDescription className={cn("capitalize", DIFFICULTY_STYLE[selected.difficulty].split(" ")[0])}>
                Difficulty: {selected.difficulty}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-foreground/85">{selected.description}</p>
            {selected.vibe && <p className="text-xs text-muted-foreground italic">{selected.vibe}</p>}
            {!selected.available && selected.preview.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground">PLANNED LABS</p>
                <ol className="list-inside list-decimal text-sm text-foreground/75">
                  {selected.preview.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </div>
            )}
            <p className="text-sm">
              <span className="text-muted-foreground">Reward:</span> <span className="text-primary">{selected.reward}</span>
            </p>
            <Button
              size="lg"
              disabled={!selected.available}
              onClick={() => navigate(`/storylines/${selected.slug}`)}
              className="w-full"
            >
              {selected.available ? (selected.labs_completed ? "Continue Path" : "Start Path") : "Coming soon"}
            </Button>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
