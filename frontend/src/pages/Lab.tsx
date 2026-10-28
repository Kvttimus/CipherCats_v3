import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Check, Copy, Eye, FileText, Lightbulb, Play, SquareTerminal, Trophy } from "lucide-react";
import { CatAvatar } from "@/components/CatAvatar";
import { BadgeIcon } from "@/components/BadgeIcon";
import { ErrorState, LoadingScreen } from "@/components/States";
import { useTerminal } from "@/components/terminal/context";
import { varName } from "@/components/terminal/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { keys, useInvalidateProgress, useLab, useMe } from "@/hooks/queries";
import { api, ApiError, type LabDetail, type SubmitResult } from "@/lib/api";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Success = Extract<SubmitResult, { correct: true }>;

export default function LabPage() {
  const { slug = "" } = useParams();
  const { data: lab, isPending, error, refetch } = useLab(slug);

  if (isPending) return <LoadingScreen label="Loading intel…" />;
  // A failed background refresh keeps showing the lab we already have.
  if (!lab) {
    return (
      <div className="space-y-4">
        <ErrorState error={error} onRetry={() => void refetch()} />
        <p className="text-center">
          <Link to="/menu" className="text-sm text-primary hover:underline">
            Back to storylines
          </Link>
        </p>
      </div>
    );
  }
  // Remount per lab so local state (briefing step, answer, timer) resets.
  return <LabView key={lab.slug} lab={lab} />;
}

function LabView({ lab }: { lab: LabDetail }) {
  const fresh = lab.status !== "completed" && lab.attempts === 0 && lab.hints.length === 0 && !lab.revealed;
  const [phase, setPhase] = useState<"briefing" | "lab">(fresh && lab.payload.intro?.length ? "briefing" : "lab");

  return phase === "briefing" ? <Briefing lab={lab} onDone={() => setPhase("lab")} /> : <LabWorkspace lab={lab} onReplay={() => setPhase("briefing")} />;
}

/** Step 1 — the handler cat walks the player through the mission, one line at a time. */

function Briefing({ lab, onDone }: { lab: LabDetail; onDone: () => void }) {
  const { data: me } = useMe();
  const lines = lab.payload.intro ?? [];
  const [i, setI] = useState(0);
  const line = lines[i];
  const isYou = line?.speaker === "you";

  const next = useCallback(() => {
    play("click");
    if (i < lines.length - 1) setI(i + 1);
    else onDone();
  }, [i, lines.length, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {lab.storyline.title} · Lab {lab.lab_number} of {lab.labs_total}
        </span>
        <button onClick={onDone} className="text-muted-foreground hover:text-foreground">
          Skip briefing →
        </button>
      </div>
      <div className="panel relative overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-primary/15 to-transparent px-6 py-4">
          <p className="text-xs font-semibold tracking-widest text-primary">{lab.is_boss ? "BOSS LAB · OBJECTIVE" : "LAB OBJECTIVE"}</p>
          <h1 className="text-2xl font-bold">{lab.title}</h1>
        </div>
        <div className="relative flex min-h-[340px] flex-col justify-end bg-[radial-gradient(ellipse_at_center,oklch(0.3_0.05_265/.6),transparent_70%)] p-6">
          {line && (
            <div
              key={i}
              className={cn(
                "relative mx-auto mb-6 max-w-lg animate-in rounded-2xl border p-4 text-sm leading-relaxed shadow-lg fade-in slide-in-from-bottom-2",
                isYou ? "border-sky-400/40 bg-sky-950/60" : "border-primary/40 bg-card",
              )}
              aria-live="polite"
            >
              <p className={cn("mb-1 text-xs font-semibold", isYou ? "text-sky-300" : "text-primary")}>{isYou ? me?.username ?? "You" : line.speaker}</p>
              {line.text}
            </div>
          )}
          <div className="flex items-end justify-between">
            <CatAvatar handler className={cn("size-28 transition-all sm:size-36", isYou ? "opacity-50" : "animate-float")} />
            <CatAvatar avatarId={me?.avatar_id ?? 0} className={cn("size-28 -scale-x-100 transition-all sm:size-36", isYou ? "animate-float" : "opacity-50")} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <div className="flex gap-1.5" aria-label={`Line ${i + 1} of ${lines.length}`}>
            {lines.map((_, j) => (
              <span key={j} className={cn("size-1.5 rounded-full", j <= i ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <Button onClick={next} autoFocus>
            {i < lines.length - 1 ? "Next" : "Start lab"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Step 2 — terminal, files, hints and the answer box. */

function LabWorkspace({ lab, onReplay }: { lab: LabDetail; onReplay: () => void }) {
  const terminal = useTerminal();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invalidateProgress = useInvalidateProgress();
  const [startedAt] = useState(() => Date.now());
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const files = useMemo(() => lab.payload.files ?? {}, [lab.payload.files]);

  const patchLab = (patch: Partial<LabDetail>) =>
    qc.setQueryData<LabDetail>(keys.lab(lab.slug), (old) => (old ? { ...old, ...patch } : old));

  const submit = useCallback(
    async (value: string): Promise<string> => {
      const res = await api.post<SubmitResult>(`/labs/${lab.slug}/submit`, {
        answer: value,
        time_taken_ms: Date.now() - startedAt,
      });
      qc.setQueryData<LabDetail>(keys.lab(lab.slug), (old) => (old ? { ...old, attempts: res.attempts } : old));
      if (!res.correct) {
        play("error");
        return "✗ Not quite. Check your work and try again.";
      }
      play("success");
      setSuccess(res);
      res.new_badges.forEach((b, i) =>
        setTimeout(() => {
          play("unlock");
          toast.success(`Badge unlocked: ${b.name}`, { description: b.description });
        }, 600 + i * 500),
      );
      void invalidateProgress();
      void qc.invalidateQueries({ queryKey: keys.lab(lab.slug) });
      terminal.setOpen(false);
      return `✓ Correct! +${res.xp_awarded} XP`;
    },
    [lab.slug, qc, invalidateProgress, terminal, startedAt],
  );

  // Load this lab's files into the terminal (as `ls`/`cat`/$VARS) and enable `submit`.
  const { setLabContext } = terminal;
  useEffect(() => {
    setLabContext({
      files,
      submit: async (value) => {
        try {
          return await submit(value);
        } catch (e) {
          return e instanceof ApiError ? e.message : "Network error.";
        }
      },
    });
    return () => setLabContext(null);
  }, [files, submit, setLabContext]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setPending(true);
    setFeedback(null);
    try {
      const msg = await submit(answer);
      if (msg.startsWith("✗")) setFeedback("Not quite. Check your work and try again.");
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function takeHint() {
    try {
      const res = await api.post<{ hints: string[]; xp_if_solved: number }>(`/labs/${lab.slug}/hint`);
      patchLab({ hints: res.hints, xp_if_solved: res.xp_if_solved });
      play("click");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load hint.");
    }
  }

  async function reveal() {
    setConfirmReveal(false);
    try {
      const res = await api.post<{ solution: string }>(`/labs/${lab.slug}/reveal`);
      patchLab({ revealed: true, solution: res.solution, xp_if_solved: 0 });
      setAnswer(res.solution);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't reveal solution.");
    }
  }

  const completed = lab.status === "completed";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/storylines/${lab.storyline.slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {lab.storyline.title}
        </Link>
        <span className="text-sm text-muted-foreground">
          · Lab {lab.lab_number}/{lab.labs_total}
        </span>
        {completed && (
          <Badge className="border-success/40 bg-success/15 text-success">
            <Check /> Completed. Replay for practice
          </Badge>
        )}
        <button onClick={onReplay} className="ml-auto text-sm text-muted-foreground hover:text-foreground">
          Replay briefing
        </button>
      </div>

      <h1 className="text-3xl font-bold">
        {lab.is_boss && <Trophy className="mr-2 inline size-7 text-primary" />}
        {lab.title}
      </h1>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className="panel p-5">
            <h2 className="mb-2 text-sm font-semibold tracking-widest text-primary">STORY</h2>
            <p className="leading-relaxed text-foreground/85">{lab.story_segment}</p>
          </section>

          {lab.payload.concept && (
            <section className="panel border-sky-400/20 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-widest text-sky-300">
                <BookOpen className="size-4" /> INTEL: {lab.payload.concept.title.toUpperCase()}
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80">{lab.payload.concept.body}</p>
            </section>
          )}

          <section className="panel space-y-4 p-5">
            <h2 className="text-sm font-semibold tracking-widest text-primary">CHALLENGE</h2>
            <p className="text-foreground/90">{lab.challenge_prompt}</p>
            {lab.payload.given && (
              <dl className="flex flex-wrap gap-2">
                {Object.entries(lab.payload.given).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm">
                    <dt className="inline text-muted-foreground">{k}: </dt>
                    <dd className="inline font-mono">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {Object.entries(files).map(([name, content]) => (
              <FileBlock key={name} name={name} content={content} onOpen={() => terminal.typeCommand(`cat ${name}`)} />
            ))}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <section className="panel space-y-3 p-5">
            <Button size="lg" variant="outline" className="w-full" onClick={terminal.toggle}>
              <SquareTerminal /> {terminal.open ? "Hide terminal" : "Open terminal"}
            </Button>
            {lab.payload.tools && (
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Suggested commands (click to type):</p>
                <div className="flex flex-wrap gap-1.5">
                  {lab.payload.tools.map((t) => (
                    <button
                      key={t}
                      onClick={() => terminal.typeCommand(t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trimEnd() + (t.includes("<") ? " " : ""))}
                      className="rounded-md border border-border bg-black/30 px-2 py-1 font-mono text-xs text-foreground/80 transition hover:border-primary/50 hover:text-primary"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="panel p-5">
            <form onSubmit={onSubmit} className="space-y-3">
              <label htmlFor="answer" className="text-sm font-semibold tracking-widest text-primary">
                YOUR ANSWER
              </label>
              <Input
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter the decrypted answer…"
                className="h-10 font-mono"
                maxLength={500}
                autoComplete="off"
                disabled={pending}
              />
              {feedback && (
                <p className="text-sm text-destructive" role="alert">
                  {feedback}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={pending || !answer.trim()}>
                <Play /> {pending ? "Checking…" : "Submit"}
              </Button>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Attempts: {lab.attempts}</span>
                <span>
                  {completed ? "Already earned" : <>Reward: <span className="text-primary">{lab.xp_if_solved} XP</span></>}
                  {!completed && lab.xp_if_solved < lab.xp_reward && <span className="line-through opacity-60"> {lab.xp_reward}</span>}
                </span>
              </div>
            </form>
          </section>

          <section className="panel space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-widest text-primary">HINTS</h2>
              <span className="text-xs text-muted-foreground">
                {lab.hints.length}/{lab.hints_total} used
              </span>
            </div>
            {lab.hints.length > 0 && (
              <ol className="space-y-2">
                {lab.hints.map((h, i) => (
                  <li key={i} className="border-l-2 border-primary/50 pl-3 text-sm text-foreground/85">
                    <span className="text-xs text-primary">Hint {i + 1}. </span>
                    {h}
                  </li>
                ))}
              </ol>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={takeHint} disabled={lab.hints.length >= lab.hints_total}>
                <Lightbulb /> {lab.hints.length ? "Next hint" : "Get a hint"} {!completed && "(−15%)"}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmReveal(true)} disabled={lab.revealed}>
                <Eye /> Reveal
              </Button>
            </div>
            {lab.revealed && lab.solution && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 font-mono text-sm">
                Solution: {lab.solution}
              </p>
            )}
          </section>
        </aside>
      </div>

      <Dialog open={confirmReveal} onOpenChange={setConfirmReveal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reveal the solution?</DialogTitle>
            <DialogDescription>
              {completed
                ? "You've already completed this lab, so this won't affect your XP."
                : "You can still submit it to complete the lab and unlock the next one, but you'll earn 0 XP and no skill badges for it."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmReveal(false)}>
              Keep trying
            </Button>
            <Button variant="destructive" onClick={reveal}>
              Reveal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!success} onOpenChange={(o) => !o && setSuccess(null)}>
        {success && (
          <DialogContent className="border border-primary/40 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl text-primary">{lab.is_boss ? "Storyline complete!" : "Lab complete!"}</DialogTitle>
              <DialogDescription>{lab.title}</DialogDescription>
            </DialogHeader>
            {success.outro && <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed italic">{success.outro}</p>}
            <div className="flex items-center justify-center gap-6 py-2 text-center">
              <div>
                <p className="text-3xl font-black text-primary">+{success.xp_awarded}</p>
                <p className="text-xs text-muted-foreground">XP{!success.first_completion && " (already earned)"}</p>
              </div>
              <div>
                <p className="text-3xl font-black">{success.level.level}</p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
              <div>
                <p className="text-3xl font-black">{success.attempts}</p>
                <p className="text-xs text-muted-foreground">Attempts</p>
              </div>
            </div>
            {success.new_badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3">
                {success.new_badges.map((b) => (
                  <div key={b.id} className="flex w-20 flex-col items-center gap-1 text-center">
                    <BadgeIcon icon={b.icon} />
                    <span className="text-[11px] leading-tight">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate(`/storylines/${lab.storyline.slug}`)}>
                Map
              </Button>
              {success.next_lab ? (
                <Button className="flex-1" onClick={() => navigate(`/labs/${success.next_lab!.slug}`)}>
                  Next: {success.next_lab.title}
                </Button>
              ) : (
                <Button className="flex-1" onClick={() => navigate("/dashboard")}>
                  View dashboard
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function FileBlock({ name, content, onOpen }: { name: string; content: string; onOpen: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black/40">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <FileText className="size-3.5" />
        <span className="font-mono">{name}</span>
        <span className="font-mono text-primary/70">${varName(name)}</span>
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(content);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              } catch {
                toast.error("Clipboard unavailable");
              }
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="xs" onClick={onOpen}>
            <SquareTerminal /> Terminal
          </Button>
        </div>
      </div>
      <pre className="max-h-64 overflow-auto p-3 font-mono text-sm leading-relaxed break-all whitespace-pre-wrap text-amber-100/90">{content}</pre>
    </div>
  );
}
