import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { COMMAND_NAMES, execute, type ShellContext } from "./shell";
import { play } from "@/lib/sound";

const PROMPT = "\x1b[38;5;220mciphercats\x1b[0m:\x1b[38;5;75m~\x1b[0m$ ";

interface Props {
  /** Read on every command, so the shell always sees the current lab. */
  contextRef: React.RefObject<ShellContext>;
  /** Bump to re-fit after the container becomes visible/resized. */
  fitKey?: unknown;
  /** Lines to type into the prompt (e.g. clicking a suggested tool). */
  pending?: { id: number; text: string } | null;
}

export default function Terminal({ contextRef, fitKey, pending }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const bufferRef = useRef("");

  useEffect(() => {
    if (!hostRef.current) return;

    const term = new XTerm({
      fontFamily: '"Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
      scrollback: 2000,
      theme: { background: "#0b0d14", foreground: "#e4e4e7", cursor: "#fcd34d", selectionBackground: "#fcd34d55" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    termRef.current = term;
    fitRef.current = fit;
    try {
      fit.fit();
    } catch {
      /* host not visible yet */
    }

    term.writeln("\x1b[38;5;220m /\\_/\\  CipherCats terminal\x1b[0m");
    term.writeln("\x1b[38;5;220m( o.o ) \x1b[0mType \x1b[1mhelp\x1b[0m for commands, \x1b[1mls\x1b[0m for lab files.");
    term.writeln("\x1b[38;5;220m > ^ <\x1b[0m");
    term.write(PROMPT);

    const history: string[] = [];
    let historyIndex = 0;
    let busy = false;

    const setBuffer = (next: string) => {
      term.write("\b \b".repeat(bufferRef.current.length) + next);
      bufferRef.current = next;
    };

    const run = async (line: string) => {
      busy = true;
      term.write("\r\n");
      if (line.trim()) {
        history.push(line);
        historyIndex = history.length;
      }
      const res = await execute(line, contextRef.current);
      if (res.clear) term.clear();
      else if (res.out) term.writeln(res.out);
      bufferRef.current = "";
      term.write(PROMPT);
      busy = false;
    };

    const onData = term.onData((data) => {
      if (busy) return;
      // Pasted text: insert printable characters, run on newline.
      if (data.length > 1 && !data.startsWith("\x1b")) {
        const lines = data.replace(/\r\n?/g, "\n").split("\n");
        const first = lines[0].replace(/[^\x20-\x7e]/g, "");
        bufferRef.current += first;
        term.write(first);
        if (lines.length > 1) void run(bufferRef.current);
        return;
      }
      switch (data) {
        case "\r":
          void run(bufferRef.current);
          return;
        case "\x7f":
          if (bufferRef.current.length > 0) {
            bufferRef.current = bufferRef.current.slice(0, -1);
            term.write("\b \b");
          }
          return;
        case "\x1b[A": // up
          if (historyIndex > 0) setBuffer(history[--historyIndex]);
          return;
        case "\x1b[B": // down
          if (historyIndex < history.length - 1) setBuffer(history[++historyIndex]);
          else {
            historyIndex = history.length;
            setBuffer("");
          }
          return;
        case "\t": {
          const word = bufferRef.current;
          if (word.includes(" ")) return;
          const matches = COMMAND_NAMES.filter((c) => c.startsWith(word));
          if (matches.length === 1) setBuffer(matches[0] + " ");
          else if (matches.length > 1) {
            term.write(`\r\n${matches.join("  ")}\r\n${PROMPT}${word}`);
          }
          return;
        }
        case "\x03": // ctrl+c
          term.write("^C\r\n" + PROMPT);
          bufferRef.current = "";
          return;
        case "\x0c": // ctrl+l
          term.clear();
          return;
      }
      if (data >= " " && data <= "~") {
        bufferRef.current += data;
        term.write(data);
        play("key");
      }
    });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* hidden */
      }
    });
    ro.observe(hostRef.current);

    return () => {
      onData.dispose();
      ro.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, [contextRef]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        fitRef.current?.fit();
        termRef.current?.focus();
      } catch {
        /* hidden */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [fitKey]);

  useEffect(() => {
    const term = termRef.current;
    if (!pending || !term) return;
    term.write("\b \b".repeat(bufferRef.current.length) + pending.text);
    bufferRef.current = pending.text;
    term.focus();
  }, [pending]);

  return <div ref={hostRef} className="h-full w-full" aria-label="Terminal" />;
}
