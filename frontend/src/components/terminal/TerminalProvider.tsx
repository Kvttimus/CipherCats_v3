import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Code2, Play, SquareTerminal } from "lucide-react";
import type { ShellContext } from "./shell";
import { TerminalCtx, type LabShellContext } from "./context";
import { api, ApiError, type SandboxResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// xterm is heavy; load it the first time the terminal opens.
const Terminal = lazy(() => import("./Terminal"));

async function runPython(code: string): Promise<SandboxResult> {
  try {
    return await api.post<SandboxResult>("/sandbox/run", { code });
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : "Network error reaching the sandbox.";
    return { stdout: "", stderr: msg, exit_code: null, timed_out: false };
  }
}

export function TerminalProvider({ username, children }: { username?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [tab, setTab] = useState<"shell" | "code">("shell");
  const [pending, setPending] = useState<{ id: number; text: string } | null>(null);
  const contextRef = useRef<ShellContext>({ files: {}, username, runPython });

  useEffect(() => {
    contextRef.current = { ...contextRef.current, username };
  }, [username]);

  const setLabContext = useCallback((lab: LabShellContext | null) => {
    contextRef.current = { ...contextRef.current, files: lab?.files ?? {}, submit: lab?.submit };
  }, []);

  const typeCommand = useCallback((text: string) => {
    setTab("shell");
    setOpen(true);
    setPending((p) => ({ id: (p?.id ?? 0) + 1, text }));
  }, []);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  if (open && !everOpened) setEverOpened(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  const value = useMemo(() => ({ open, setOpen, toggle, setLabContext, typeCommand }), [open, toggle, setLabContext, typeCommand]);

  return (
    <TerminalCtx.Provider value={value}>
      {children}
      <section
        aria-label="Terminal"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex h-[min(48vh,460px)] flex-col border-t border-primary/30 bg-[#0b0d14]/97 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] backdrop-blur transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <header className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-amber-300/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </span>
          <div className="ml-2 flex gap-1" role="tablist">
            <TabButton active={tab === "shell"} onClick={() => setTab("shell")} icon={<SquareTerminal className="size-3.5" />}>
              Shell
            </TabButton>
            <TabButton active={tab === "code"} onClick={() => setTab("code")} icon={<Code2 className="size-3.5" />}>
              Python sandbox
            </TabButton>
          </div>
          <span className="ml-auto hidden text-muted-foreground sm:inline">Ctrl + ` to toggle</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close terminal">
            <ChevronDown />
          </Button>
        </header>
        <div className={cn("min-h-0 flex-1 p-2", tab !== "shell" && "hidden")}>
          {everOpened && (
            <Suspense fallback={<p className="p-2 font-mono text-xs text-muted-foreground">booting terminal…</p>}>
              <Terminal contextRef={contextRef} fitKey={`${open}-${tab}`} pending={pending} />
            </Suspense>
          )}
        </div>
        {tab === "code" && <CodeScratchpad />}
      </section>
    </TerminalCtx.Provider>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

const STARTER = `# Runs in an isolated sandbox container. Try a frequency count:
from collections import Counter

ciphertext = "TLLA HA AOL SPNOAOVBZL HA TPKUPNOA"
for shift in range(1, 26):
    plain = "".join(chr((ord(c) - 65 - shift) % 26 + 65) if c.isalpha() else c for c in ciphertext)
    print(f"{shift:2d}  {plain}")
`;

function CodeScratchpad() {
  const [code, setCode] = useState(STARTER);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setResult(await runPython(code));
    setRunning(false);
  }

  return (
    <div className="grid min-h-0 flex-1 gap-2 p-2 md:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-2">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void run();
            if (e.key === "Tab") {
              e.preventDefault();
              const t = e.currentTarget;
              const { selectionStart: s, selectionEnd: end } = t;
              setCode(code.slice(0, s) + "    " + code.slice(end));
              requestAnimationFrame(() => t.setSelectionRange(s + 4, s + 4));
            }
          }}
          spellCheck={false}
          aria-label="Python code"
          className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-black/40 p-3 font-mono text-[13px] leading-relaxed text-zinc-200 outline-none focus:border-primary/50"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={run} disabled={running}>
            <Play /> {running ? "Running…" : "Run"}
          </Button>
          <span className="text-xs text-muted-foreground">Ctrl + Enter · 5s limit · no network</span>
        </div>
      </div>
      <pre className="min-h-0 overflow-auto rounded-lg border border-border bg-black/40 p-3 font-mono text-[13px] whitespace-pre-wrap text-zinc-300">
        {result ? (
          <>
            {result.stdout}
            {result.stderr && <span className="text-red-400">{result.stderr}</span>}
            {result.timed_out && <span className="text-amber-300">{"\n"}[timed out]</span>}
          </>
        ) : (
          <span className="text-muted-foreground">Output appears here.</span>
        )}
      </pre>
    </div>
  );
}
