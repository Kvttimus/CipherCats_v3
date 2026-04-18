"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Terminal = dynamic(() => import("@/components/terminal/Terminal"), { ssr: false });

type Props = {
  slug: string;
  title: string;
  storySegment: string;
  challengePrompt: string;
  payload: Record<string, unknown>;
  xpReward: number;
  alreadyCompleted: boolean;
};

export default function LabClient({
  slug,
  title,
  storySegment,
  challengePrompt,
  payload,
  xpReward,
  alreadyCompleted,
}: Props) {
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [success, setSuccess] = useState<{ xp: number } | null>(null);
  const startRef = useRef<number>(Date.now());
  const router = useRouter();

  const ciphertext = typeof payload.ciphertext === "string" ? payload.ciphertext : "";
  const hint = typeof payload.hint === "string" ? payload.hint : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!answer.trim()) return;
    setPending(true);
    try {
      const res = await fetch(`/api/labs/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer,
          time_taken_ms: Date.now() - startRef.current,
        }),
      });
      const data = (await res.json()) as { correct?: boolean; xp_awarded?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setAttempts((n) => n + 1);
      if (data.correct) {
        setSuccess({ xp: data.xp_awarded ?? 0 });
        router.refresh();
      } else {
        setError("Not quite. Double-check your shift value.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {alreadyCompleted && !success && (
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-700">
          Already completed — submit again for practice
        </Badge>
      )}

      <Card className="bg-zinc-900/80 border-zinc-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-amber-300">Story</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {storySegment}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/80 border-zinc-800 rounded-2xl">
        <CardHeader>
          <CardTitle>Challenge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-400">{challengePrompt}</p>
          {ciphertext && (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-sm break-all">
              {ciphertext}
            </div>
          )}
          <p className="text-xs text-zinc-500">Reward: {xpReward} XP</p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/80 border-zinc-800 rounded-2xl">
        <CardHeader>
          <CardTitle>Terminal</CardTitle>
        </CardHeader>
        <CardContent>
          <Terminal />
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/80 border-zinc-800 rounded-2xl">
        <CardHeader>
          <CardTitle>Your Answer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the decrypted plaintext…"
              className="bg-zinc-950 border-zinc-800 font-mono"
              disabled={pending}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={pending || !answer.trim()}
                className="bg-amber-300 text-zinc-950 hover:bg-amber-200"
              >
                {pending ? "Checking…" : "Submit"}
              </Button>
              {hint && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowHint((s) => !s)}
                  className="border-zinc-700"
                >
                  {showHint ? "Hide hint" : "Show hint"}
                </Button>
              )}
              <span className="text-xs text-zinc-500 ml-auto">Attempts: {attempts}</span>
            </div>
            {showHint && hint && (
              <p className="text-sm text-amber-200/80 border-l-2 border-amber-300/40 pl-3">
                {hint}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog open={!!success} onOpenChange={(open) => !open && setSuccess(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-amber-300">Lab Complete — {title}</DialogTitle>
            <DialogDescription>
              {success?.xp
                ? `You earned ${success.xp} XP. The next cipher awaits.`
                : "Correct! (No XP this time — you've solved this lab before.)"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <a
              href="/menu"
              className="inline-flex h-9 items-center rounded-lg bg-amber-300 px-3 text-sm font-medium text-zinc-950 hover:bg-amber-200"
            >
              Back to menu
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
