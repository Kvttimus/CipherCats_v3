import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, Check, Crown, Lock } from "lucide-react";
import { ErrorState, LoadingScreen } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useStoryline } from "@/hooks/queries";
import { DIFFICULTY_STYLE } from "@/lib/display";
import { cn } from "@/lib/utils";

const STEP = 130; // px between nodes
const XS = [50, 76, 30, 70, 50, 26, 62]; // zig-zag x positions (%)

export default function StorylineMapPage() {
  const { slug = "" } = useParams();
  const { data, isPending, error, refetch } = useStoryline(slug);

  if (isPending) return <LoadingScreen />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data.available) return <Navigate to="/menu" replace />;

  // Draw the path bottom-up like a board game: lab 1 at the bottom.
  const labs = data.labs;
  const height = labs.length * STEP + 40;
  const points = labs.map((_, i) => ({ x: XS[i % XS.length], y: height - 60 - i * STEP }));
  const pct = (100 * data.labs_completed) / (data.labs_total || 1);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="panel h-fit space-y-4 p-6 lg:sticky lg:top-20">
        <Link to="/menu" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Menu
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <p className="text-sm text-primary">{data.theme}</p>
        </div>
        <Badge variant="outline" className={cn("capitalize", DIFFICULTY_STYLE[data.difficulty])}>
          {data.difficulty}
        </Badge>
        <p className="text-sm text-foreground/80">{data.description}</p>
        {data.vibe && <p className="text-xs text-muted-foreground italic">{data.vibe}</p>}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>
              {data.labs_completed}/{data.labs_total} labs
            </span>
          </div>
          <Progress value={pct} className="[&_[data-slot=progress-indicator]]:bg-success" />
        </div>
        {data.next_lab_slug ? (
          <Link
            to={`/labs/${data.next_lab_slug}`}
            className="block rounded-lg bg-primary px-4 py-2.5 text-center font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            {data.labs_completed ? "Continue" : "Start first lab"}
          </Link>
        ) : (
          <p className="rounded-lg border border-success/40 bg-success/10 p-3 text-center text-sm text-success">Storyline complete. Nice work, agent.</p>
        )}
      </aside>

      <section className="panel relative overflow-hidden p-4" aria-label="Storyline map">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, oklch(0.75 0.08 80 / 0.25), transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.7 0.1 60 / 0.2), transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-md" style={{ height }}>
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
            {points.slice(1).map((p, i) => {
              const prev = points[i];
              const done = labs[i].status === "completed";
              return (
                <path
                  key={i}
                  d={`M ${prev.x} ${prev.y} C ${prev.x} ${prev.y - STEP / 2}, ${p.x} ${p.y + STEP / 2}, ${p.x} ${p.y}`}
                  fill="none"
                  stroke={done ? "var(--color-primary)" : "var(--color-border)"}
                  strokeWidth={done ? 4 : 3}
                  strokeDasharray={done ? undefined : "2 8"}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {labs.map((lab, i) => {
            const p = points[i];
            const locked = lab.status === "locked";
            const node = (
              <span
                className={cn(
                  "relative flex items-center justify-center rounded-full border-4 font-bold shadow-lg transition",
                  lab.is_boss ? "size-20 text-xl" : "size-16 text-lg",
                  lab.status === "completed" && "border-primary bg-primary text-primary-foreground",
                  lab.status === "unlocked" && "border-primary/60 bg-card text-primary hover:scale-105",
                  lab.slug === data.next_lab_slug && "animate-pulse-ring border-primary",
                  locked && "border-border bg-muted text-muted-foreground",
                )}
              >
                {lab.status === "completed" ? <Check className="size-7" /> : locked ? <Lock className="size-6" /> : lab.is_boss ? <Crown className="size-8" /> : i + 1}
                {lab.is_boss && !locked && lab.status !== "completed" && <span className="sr-only">Boss lab</span>}
              </span>
            );
            const label = (
              <span className="mt-2 block w-40 text-center">
                <span className={cn("block text-sm font-semibold", locked && "text-muted-foreground")}>{lab.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {lab.is_boss ? "Boss · " : ""}
                  {lab.xp_reward} XP
                </span>
              </span>
            );
            return (
              <div
                key={lab.slug}
                className="absolute flex -translate-x-1/2 -translate-y-8 flex-col items-center"
                style={{ left: `${p.x}%`, top: p.y }}
              >
                {locked ? (
                  <div title="Finish the previous lab to unlock" className="flex flex-col items-center">
                    {node}
                    {label}
                  </div>
                ) : (
                  <Link to={`/labs/${lab.slug}`} className="flex flex-col items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring">
                    {node}
                    {label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
