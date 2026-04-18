"use client";

import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { caesarDecrypt } from "@/lib/crypto/caesar";
import "@xterm/xterm/css/xterm.css";

const PROMPT = "\x1b[38;5;220mciphercats\x1b[0m:\x1b[38;5;75m~\x1b[0m$ ";
const HELP = [
  "Available commands:",
  "  help                            — show this help",
  "  clear                           — clear the screen",
  "  caesar-decrypt <shift> <text>   — decrypt <text> with a Caesar shift",
  "  caesar-bruteforce <text>        — try shifts 1–25 and print each",
].join("\r\n");

export default function TerminalBox() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const term = new XTerm({
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: "#0a0a0a",
        foreground: "#e4e4e7",
        cursor: "#fcd34d",
      },
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();

    term.writeln("\x1b[38;5;220mCipherCats terminal\x1b[0m");
    term.writeln("Type 'help' for commands.\r\n");
    term.write(PROMPT);

    let buffer = "";

    const handle = (cmdRaw: string) => {
      const cmd = cmdRaw.trim();
      if (!cmd) return;
      const [name, ...rest] = cmd.split(/\s+/);
      if (name === "help") {
        term.writeln(HELP);
      } else if (name === "clear") {
        term.clear();
      } else if (name === "caesar-decrypt") {
        const shift = Number(rest[0]);
        const text = rest.slice(1).join(" ");
        if (!Number.isFinite(shift) || !text) {
          term.writeln("usage: caesar-decrypt <shift> <text>");
        } else {
          term.writeln(caesarDecrypt(text, shift));
        }
      } else if (name === "caesar-bruteforce") {
        const text = rest.join(" ");
        if (!text) {
          term.writeln("usage: caesar-bruteforce <text>");
        } else {
          for (let i = 1; i <= 25; i++) {
            term.writeln(`[${String(i).padStart(2, "0")}] ${caesarDecrypt(text, i)}`);
          }
        }
      } else {
        term.writeln(`command not found: ${name}`);
      }
    };

    const onData = term.onData((data) => {
      for (const ch of data) {
        const code = ch.charCodeAt(0);
        if (ch === "\r") {
          term.write("\r\n");
          handle(buffer);
          buffer = "";
          term.write(PROMPT);
        } else if (code === 127) {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            term.write("\b \b");
          }
        } else if (code >= 32 && code < 127) {
          buffer += ch;
          term.write(ch);
        }
      }
    });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* noop */
      }
    });
    ro.observe(hostRef.current);

    return () => {
      onData.dispose();
      ro.disconnect();
      term.dispose();
    };
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2">
      <div ref={hostRef} className="h-64 w-full" />
    </div>
  );
}
