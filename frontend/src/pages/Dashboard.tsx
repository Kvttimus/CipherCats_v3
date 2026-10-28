import { Link } from "react-router";
import { Check, Clock } from "lucide-react";
import { CatAvatar } from "@/components/CatAvatar";
import { BadgeIcon } from "@/components/BadgeIcon";
import { ErrorState, LoadingScreen } from "@/components/States";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from "@/hooks/queries";
import type { Dashboard } from "@/lib/api";
import { formatDuration } from "@/lib/display";
import { cn } from "@/lib/utils";

const RANK_STYLE: Record<string, string> = {
  Expert: "text-primary",
  Intermediate: "text-sky-300",
  Beginner: "text-success",
  Locked: "text-muted-foreground",
};

export default function DashboardPage() {
  const { data, isPending, error, refetch } = useDashboard();
  if (isPending) return <LoadingScreen />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div className="panel p-4 sm:p-6">
      <h1 className="sr-only">Dashboard</h1>
      <Tabs defaultValue="overview">
        <TabsList className="h-auto! w-full flex-wrap justify-start bg-background/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="storylines">Storylines</TabsTrigger>
          <TabsTrigger value="completed">Completed Labs</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <Overview data={data} />
        </TabsContent>
        <TabsContent value="stats" className="pt-4">
          <Stats data={data} />
        </TabsContent>
        <TabsContent value="badges" className="pt-4">
          <Badges data={data} />
        </TabsContent>
        <TabsContent value="storylines" className="pt-4">
          <Storylines data={data} />
        </TabsContent>
        <TabsContent value="completed" className="pt-4">
          <Completed data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Overview({ data }: { data: Dashboard }) {
  const { profile, skills, badges, completed_labs } = data;
  const earned = badges.filter((b) => b.earned);
  const recent = [
    ...earned.map((b) => ({ when: b.earned_at!, label: `Badge: ${b.name}` })),
    ...completed_labs.map((c) => ({ when: c.completed_at, label: `Completed ${c.title}` })),
  ]
    .sort((x, y) => y.when.localeCompare(x.when))
    .slice(0, 5);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.2fr_1fr]">
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-4">
          <CatAvatar avatarId={profile.avatar_id} className="size-16" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{profile.username}</p>
            <p className="text-xs text-primary">Level {profile.level}</p>
            <Progress value={(profile.xp_into_level / profile.xp_for_next) * 100} className="mt-1.5" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {profile.xp_into_level}/{profile.xp_for_next} XP to level {profile.level + 1}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background/50 p-4">
          <p className="mb-2 text-sm font-semibold">Skills learned</p>
          <ul className="space-y-2">
            {skills.map((s) => (
              <li key={s.skill} className="text-sm">
                <div className="flex justify-between">
                  <span>{s.skill}</span>
                  <span className={cn("text-xs font-semibold", RANK_STYLE[s.rank])}>{s.rank}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary/70" style={{ width: `${(100 * s.completed) / s.total}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Badges</p>
          <span className="text-xs text-muted-foreground">
            {earned.length}/{badges.length}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {badges.slice(0, 8).map((b) => (
            <div key={b.id} className="flex flex-col items-center gap-1 text-center" title={b.description}>
              <BadgeIcon icon={b.icon} earned={b.earned} />
              <span className={cn("text-[10px] leading-tight", !b.earned && "text-muted-foreground")}>{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Tile label="Total XP" value={profile.xp} />
          <Tile label="Labs" value={`${data.stats.labs_completed}/${data.stats.labs_total}`} />
        </div>
        <div className="rounded-xl border border-border bg-background/50 p-4">
          <p className="mb-2 text-sm font-semibold">Latest achievements</p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet.{" "}
              <Link to="/menu" className="text-primary hover:underline">
                Start a storyline
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {recent.map((r, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{r.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(r.when).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stats({ data }: { data: Dashboard }) {
  const s = data.stats;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile label="Labs completed" value={`${s.labs_completed}/${s.labs_total}`} />
      <Tile label="Storylines completed" value={s.storylines_completed} />
      <Tile label="Total submissions" value={s.total_attempts} />
      <Tile label="Mistakes made" value={s.incorrect_submissions} sub="incorrect submissions" />
      <Tile label="Accuracy" value={s.accuracy == null ? "—" : `${s.accuracy}%`} />
      <Tile label="Avg. completion time" value={formatDuration(s.avg_completion_ms)} />
      <Tile label="Total time on labs" value={formatDuration(s.total_time_ms)} />
      <Tile label="Hints used" value={s.hints_used} sub={`${s.solutions_revealed} solution(s) revealed`} />
    </div>
  );
}

function Badges({ data }: { data: Dashboard }) {
  const earned = data.badges.filter((b) => b.earned).length;
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_180px]">
      <div className="grid grid-cols-3 gap-4 rounded-xl border border-border bg-gradient-to-br from-sky-950/40 to-background/40 p-5 sm:grid-cols-4">
        {data.badges.map((b) => (
          <div key={b.id} className="flex flex-col items-center gap-1.5 text-center">
            <BadgeIcon icon={b.icon} earned={b.earned} className="size-14" />
            <span className={cn("text-xs font-semibold tracking-wide uppercase", !b.earned && "text-muted-foreground")}>{b.name}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">{b.description}</span>
          </div>
        ))}
      </div>
      <div className="h-fit rounded-xl border border-border bg-background/50 p-4 text-center">
        <p className="text-3xl font-black text-primary">
          {earned}/{data.badges.length}
        </p>
        <p className="text-sm text-muted-foreground">Badges collected</p>
      </div>
    </div>
  );
}

function Storylines({ data }: { data: Dashboard }) {
  return (
    <ul className="space-y-2">
      {data.storylines.map((s) => {
        const pct = s.labs_total ? Math.round((100 * s.labs_completed) / s.labs_total) : 0;
        return (
          <li key={s.slug} className={cn("flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4", !s.available && "opacity-55")}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-success/60 bg-success/10 text-success">
              {!s.available ? <Clock className="size-5 text-muted-foreground" /> : pct === 100 ? <Check className="size-6" /> : `${pct}%`}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                {s.available ? (
                  <Link to={`/storylines/${s.slug}`} className="font-semibold hover:text-primary">
                    {s.title}
                  </Link>
                ) : (
                  <span className="font-semibold">{s.title}</span>
                )}
                <span className="text-xs text-muted-foreground">{s.available ? `${s.labs_completed}/${s.labs_total} labs` : "Coming soon"}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Completed({ data }: { data: Dashboard }) {
  if (data.completed_labs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No labs completed yet.{" "}
        <Link to="/menu" className="text-primary hover:underline">
          Head to the menu
        </Link>{" "}
        to start.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-3 font-medium">Lab</th>
            <th className="py-2 pr-3 font-medium">Storyline</th>
            <th className="py-2 pr-3 font-medium">Attempts</th>
            <th className="py-2 pr-3 font-medium">Time</th>
            <th className="py-2 pr-3 font-medium">Hints</th>
            <th className="py-2 pr-3 font-medium">XP</th>
            <th className="py-2 font-medium">Completed</th>
          </tr>
        </thead>
        <tbody>
          {data.completed_labs.map((c) => (
            <tr key={c.slug} className="border-b border-border/50">
              <td className="py-2 pr-3">
                <Link to={`/labs/${c.slug}`} className="font-medium hover:text-primary">
                  {c.title}
                </Link>
              </td>
              <td className="py-2 pr-3 text-muted-foreground">{c.storyline_title}</td>
              <td className="py-2 pr-3 tabular-nums">{c.attempts}</td>
              <td className="py-2 pr-3 tabular-nums">{formatDuration(c.time_taken_ms)}</td>
              <td className="py-2 pr-3 tabular-nums">{c.revealed ? "revealed" : c.hints_used}</td>
              <td className="py-2 pr-3 text-primary tabular-nums">+{c.xp_awarded}</td>
              <td className="py-2 text-muted-foreground">{new Date(c.completed_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
