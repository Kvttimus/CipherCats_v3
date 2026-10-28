// The CipherCats shell: a tiny, simulated command interpreter for the terminal.
// Supports "quotes", $VARIABLES (one per lab file) and `a | b` pipes, where the
// previous command's output becomes the next command's input text.

import * as cc from "@/lib/crypto/classical";
import * as hist from "@/lib/crypto/historical";
import type { SandboxResult } from "@/lib/api";

export interface ShellContext {
  files: Record<string, string>;
  username?: string;
  runPython?: (code: string) => Promise<SandboxResult>;
  submit?: (answer: string) => Promise<string>;
}

export interface ShellResult {
  out: string;
  clear?: boolean;
}

type Handler = (args: string[], stdin: string | null, ctx: ShellContext) => string | Promise<string>;

interface Command {
  usage: string;
  help: string;
  run: Handler;
}

class UsageError extends Error {}

export function varName(file: string): string {
  return file.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
}

function vars(ctx: ShellContext): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, content] of Object.entries(ctx.files)) out[varName(name)] = content;
  out.USER = ctx.username ?? "agent";
  return out;
}

/** Split a command line into pipeline stages of tokens. */
export function parse(line: string, env: Record<string, string>): string[][] {
  const stages: string[][] = [[]];
  let token = "";
  let hasToken = false;
  let quote: '"' | "'" | null = null;
  const push = () => {
    if (hasToken) stages[stages.length - 1].push(token);
    token = "";
    hasToken = false;
  };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === "$" && quote === '"' && /[A-Za-z_]/.test(line[i + 1] ?? "")) {
        const m = /^[A-Za-z0-9_]+/.exec(line.slice(i + 1))!;
        token += env[m[0].toUpperCase()] ?? "";
        i += m[0].length;
      } else token += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      hasToken = true;
    } else if (ch === "|") {
      push();
      stages.push([]);
    } else if (/\s/.test(ch)) {
      push();
    } else if (ch === "$" && /[A-Za-z_]/.test(line[i + 1] ?? "")) {
      const m = /^[A-Za-z0-9_]+/.exec(line.slice(i + 1))!;
      const value = env[m[0].toUpperCase()];
      if (value === undefined) throw new UsageError(`unknown variable $${m[0]}. Try \`ls\` to see lab files`);
      token += value;
      hasToken = true;
      i += m[0].length;
    } else {
      token += ch;
      hasToken = true;
    }
  }
  if (quote) throw new UsageError("unterminated quote");
  push();
  return stages;
}

function int(value: string | undefined, name: string): number {
  if (value === undefined || !/^-?\d+$/.test(value)) throw new UsageError(`${name} must be an integer`);
  return Number(value);
}

function big(value: string | undefined, name: string): bigint {
  if (value === undefined || !/^-?\d{1,600}$/.test(value)) throw new UsageError(`${name} must be an integer`);
  return BigInt(value);
}

function group5(t: string) {
  return t.replace(/(.{5})/g, "$1 ").trim();
}

function text(args: string[], stdin: string | null, usage: string): string {
  const t = args.length ? args.join(" ") : (stdin ?? "");
  if (!t.trim()) throw new UsageError(`usage: ${usage}`);
  return t;
}

function bar(n: number, max: number, width = 24) {
  return "█".repeat(Math.max(1, Math.round((n / max) * width)));
}

const COMMANDS: Record<string, Command> = {
  help: {
    usage: "help [command]",
    help: "list commands, or show help for one",
    run: (args) => {
      if (args[0]) {
        const c = COMMANDS[args[0]];
        if (!c) throw new UsageError(`no such command: ${args[0]}`);
        return `${c.usage}\n  ${c.help}`;
      }
      const width = Math.max(...Object.values(COMMANDS).map((c) => c.usage.length));
      return [
        "Commands (pipes work: cat intercept.txt | caesar-bruteforce):",
        ...Object.values(COMMANDS).map((c) => `  ${c.usage.padEnd(width)}  ${c.help}`),
        "",
        "Lab files are also variables: intercept.txt → $INTERCEPT. ↑/↓ for history.",
      ].join("\n");
    },
  },
  clear: { usage: "clear", help: "clear the screen", run: () => "" },
  ls: {
    usage: "ls",
    help: "list files for the current lab",
    run: (_a, _s, ctx) => {
      const names = Object.keys(ctx.files);
      if (!names.length) return "(no lab files here. Open a lab to load its intel)";
      return names.map((n) => `${n.padEnd(18)} $${varName(n)}  (${ctx.files[n].length} chars)`).join("\n");
    },
  },
  cat: {
    usage: "cat <file>",
    help: "print a lab file",
    run: (args, _s, ctx) => {
      if (!args[0]) throw new UsageError("usage: cat <file>   (see `ls`)");
      return args
        .map((name) => {
          const f = ctx.files[name];
          if (f === undefined) throw new UsageError(`cat: ${name}: No such file`);
          return f;
        })
        .join("\n");
    },
  },
  echo: { usage: "echo <text>", help: "print text", run: (args, stdin) => (args.length ? args.join(" ") : (stdin ?? "")) },
  whoami: { usage: "whoami", help: "who are you, agent?", run: (_a, _s, ctx) => `${ctx.username ?? "agent"} (CipherCats field operative)` },
  alphabet: {
    usage: "alphabet",
    help: "show letter ↔ number table (A=0 … Z=25)",
    run: () => {
      const row1 = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i).padStart(3)).join("");
      const row2 = Array.from({ length: 26 }, (_, i) => String(i).padStart(3)).join("");
      return `${row1}\n${row2}`;
    },
  },
  caesar: {
    usage: "caesar <shift> <text>",
    help: "encrypt text with a Caesar shift",
    run: (args, stdin) => cc.caesarEncrypt(text(args.slice(1), stdin, "caesar <shift> <text>"), int(args[0], "shift")),
  },
  "caesar-decrypt": {
    usage: "caesar-decrypt <shift> <text>",
    help: "decrypt text with a Caesar shift",
    run: (args, stdin) =>
      cc.caesarDecrypt(text(args.slice(1), stdin, "caesar-decrypt <shift> <text>"), int(args[0], "shift")),
  },
  "caesar-bruteforce": {
    usage: "caesar-bruteforce <text>",
    help: "try all 25 shifts",
    run: (args, stdin) => {
      const t = text(args, stdin, "caesar-bruteforce <text>");
      return Array.from({ length: 25 }, (_, i) => `[${String(i + 1).padStart(2, "0")}] ${cc.caesarDecrypt(t, i + 1)}`).join("\n");
    },
  },
  rot13: { usage: "rot13 <text>", help: "Caesar shift of 13 (its own inverse)", run: (args, stdin) => cc.caesarEncrypt(text(args, stdin, "rot13 <text>"), 13) },
  "vigenere-encrypt": {
    usage: "vigenere-encrypt <key> <text>",
    help: "encrypt with a Vigenère keyword",
    run: (args, stdin) => {
      if (!args[0]) throw new UsageError("usage: vigenere-encrypt <key> <text>");
      return cc.vigenereEncrypt(text(args.slice(1), stdin, "vigenere-encrypt <key> <text>"), args[0]);
    },
  },
  "vigenere-decrypt": {
    usage: "vigenere-decrypt <key> <text>",
    help: "decrypt with a Vigenère keyword",
    run: (args, stdin) => {
      if (!args[0]) throw new UsageError("usage: vigenere-decrypt <key> <text>");
      return cc.vigenereDecrypt(text(args.slice(1), stdin, "vigenere-decrypt <key> <text>"), args[0]);
    },
  },
  "affine-encrypt": {
    usage: "affine-encrypt <a> <b> <text>",
    help: "E(x) = (a·x + b) mod 26",
    run: (args, stdin) =>
      cc.affineEncrypt(text(args.slice(2), stdin, "affine-encrypt <a> <b> <text>"), int(args[0], "a"), int(args[1], "b")),
  },
  "affine-decrypt": {
    usage: "affine-decrypt <a> <b> <text>",
    help: "D(y) = a⁻¹·(y − b) mod 26",
    run: (args, stdin) =>
      cc.affineDecrypt(text(args.slice(2), stdin, "affine-decrypt <a> <b> <text>"), int(args[0], "a"), int(args[1], "b")),
  },
  modinv: {
    usage: "modinv <a> <m>",
    help: "modular inverse: a·x ≡ 1 (mod m)",
    run: (args) => {
      const x = int(args[0], "a");
      const m = int(args[1], "m");
      if (m < 2) throw new UsageError("m must be ≥ 2");
      const inv = cc.modInverse(x, m);
      return inv === null
        ? `${x} has no inverse mod ${m} (gcd = ${cc.gcd(x, m)}, needs to be 1)`
        : `${inv}    (check: ${x} × ${inv} = ${x * inv} ≡ 1 mod ${m})`;
    },
  },
  gcd: { usage: "gcd <a> <b>", help: "greatest common divisor", run: (args) => String(cc.gcd(int(args[0], "a"), int(args[1], "b"))) },
  mod: {
    usage: "mod <n> <m>",
    help: "n mod m (always non-negative)",
    run: (args) => {
      const n = int(args[0], "n");
      const m = int(args[1], "m");
      if (m === 0) throw new UsageError("m must be non-zero");
      return String(((n % m) + m) % m);
    },
  },
  freq: {
    usage: "freq <text>",
    help: "letter frequency analysis",
    run: (args, stdin) => {
      const t = text(args, stdin, "freq <text>");
      const f = cc.frequencies(t);
      const total = f.reduce((s, [, n]) => s + n, 0);
      if (!total) return "no letters found";
      const max = f[0][1];
      return [
        `${total} letters. Top: ${f.slice(0, 6).map(([c]) => c).join(" ")}   (English: E T A O I N)`,
        ...f.map(([c, n]) => `${c} ${String(n).padStart(4)} ${((100 * n) / total).toFixed(1).padStart(5)}%  ${bar(n, max)}`),
      ].join("\n");
    },
  },
  ic: {
    usage: "ic <text>",
    help: "index of coincidence (English ≈ 0.066, random ≈ 0.038)",
    run: (args, stdin) => {
      const v = cc.indexOfCoincidence(text(args, stdin, "ic <text>"));
      const verdict = v > 0.058 ? "likely monoalphabetic (one alphabet)" : v < 0.045 ? "likely polyalphabetic / random" : "inconclusive";
      return `IC = ${v.toFixed(4)}  → ${verdict}`;
    },
  },
  columns: {
    usage: "columns <n> <text>",
    help: "split letters into n columns (for Vigenère)",
    run: (args, stdin) => {
      const n = int(args[0], "n");
      if (n < 1 || n > 20) throw new UsageError("n must be 1-20");
      return cc.columns(text(args.slice(1), stdin, "columns <n> <text>"), n).map((c, i) => `col ${i + 1}: ${c}`).join("\n");
    },
  },
  enigma: {
    usage: "enigma <rotors> <start> <text>",
    help: "Enigma I, e.g. enigma I-II-III AAA <text> (self-inverse)",
    run: (args, stdin) => {
      const usage = "enigma I-II-III AAA <text>";
      if (!args[0] || !args[1]) throw new UsageError(`usage: ${usage}`);
      try {
        return hist.enigma(text(args.slice(2), stdin, usage), args[0].split(/[-,]/), args[1]);
      } catch (e) {
        if (e instanceof UsageError) throw e;
        throw new UsageError(`enigma: ${(e as Error).message}`);
      }
    },
  },
  codebook: {
    usage: "codebook [code words]",
    help: "Navajo code-talker codebook: list it, or translate code words",
    run: (args, stdin) => {
      const input = args.length ? args.join(" ") : stdin;
      return input?.trim() ? hist.navajoDecode(input) : hist.navajoCodebook();
    },
  },
  "otp-encrypt": {
    usage: "otp-encrypt <key> <text>",
    help: "one-time pad: c = p + k (mod 26)",
    run: (args, stdin) => {
      if (!args[0]) throw new UsageError("usage: otp-encrypt <key> <text>");
      try {
        return group5(hist.otpEncrypt(text(args.slice(1), stdin, "otp-encrypt <key> <text>"), args[0]));
      } catch (e) {
        if (e instanceof UsageError) throw e;
        throw new UsageError((e as Error).message);
      }
    },
  },
  "otp-decrypt": {
    usage: "otp-decrypt <key> <text>",
    help: "one-time pad: p = c − k (mod 26); ? where the key runs out",
    run: (args, stdin) => {
      if (!args[0]) throw new UsageError("usage: otp-decrypt <key> <text>");
      return hist.otpDecrypt(text(args.slice(1), stdin, "otp-decrypt <key> <text>"), args[0]);
    },
  },
  "otp-key": {
    usage: 'otp-key "<plaintext>" <ciphertext>',
    help: "recover pad letters from known plaintext: k = c − p",
    run: (args, stdin) => {
      let plain: string;
      let cipher: string;
      if (stdin !== null) {
        plain = args.join(" ");
        cipher = stdin;
      } else {
        if (args.length < 2) throw new UsageError('usage: otp-key "<known plaintext>" <ciphertext>');
        cipher = args[args.length - 1];
        plain = args.slice(0, -1).join(" ");
      }
      if (!plain.trim()) throw new UsageError('usage: otp-key "<known plaintext>" <ciphertext>');
      return hist.otpKey(plain, cipher);
    },
  },
  factor: {
    usage: "factor <n>",
    help: "prime factorisation (small numbers only)",
    run: (args) => {
      const n = big(args[0], "n");
      const f = hist.factor(n);
      if (f === null) return `${n} is too large to factor here, which is exactly why big RSA keys are safe.`;
      return `${n} = ${f.join(" × ") || n}${f.length === 1 ? "  (prime)" : ""}`;
    },
  },
  modpow: {
    usage: "modpow <base> <exp> <m>",
    help: "base^exp mod m (fast, works with big numbers)",
    run: (args) => {
      const m = big(args[2], "m");
      if (m < 1n) throw new UsageError("m must be ≥ 1");
      const e = big(args[1], "exp");
      if (e < 0n) throw new UsageError("exp must be ≥ 0");
      return String(hist.modPow(big(args[0], "base"), e, m));
    },
  },
  "rsa-decrypt": {
    usage: "rsa-decrypt <d> <n> <blocks…>",
    help: "m = c^d mod n per block, shown as letters (A=1 … Z=26)",
    run: (args, stdin) => {
      const d = big(args[0], "d");
      const n = big(args[1], "n");
      const raw = text(args.slice(2), stdin, "rsa-decrypt <d> <n> <c1 c2 …>");
      const blocks = raw.split(/[\s,]+/).filter(Boolean).map((b) => big(b, "each block"));
      return hist.rsaDecryptLetters(blocks, d, n);
    },
  },
  calc: {
    usage: "calc <expression>",
    help: "integer calculator: + - * / % ^ ( )",
    run: (args, stdin) => {
      try {
        return String(hist.calc(text(args, stdin, "calc (61-1)*(53-1)")));
      } catch (e) {
        if (e instanceof UsageError) throw e;
        throw new UsageError(`calc: ${(e as Error).message}`);
      }
    },
  },
  base64: {
    usage: "base64 [-d] <text>",
    help: "Base64 encode (or -d decode)",
    run: (args, stdin) => {
      const decode = args[0] === "-d" || args[0] === "--decode";
      const t = text(decode ? args.slice(1) : args, stdin, "base64 [-d] <text>");
      if (!decode) return cc.base64Encode(t);
      try {
        return cc.base64Decode(t.trim());
      } catch {
        throw new UsageError("base64: invalid input");
      }
    },
  },
  openssl: {
    usage: "openssl base64 [-d] | rand -hex <n>",
    help: "a (very) small OpenSSL subset",
    run: (args, stdin) => {
      if (args[0] === "base64" || (args[0] === "enc" && args.includes("-base64"))) {
        const rest = args.slice(1).filter((x) => x !== "-base64" && x !== "-A");
        return COMMANDS.base64.run(rest, stdin, { files: {} }) as string;
      }
      if (args[0] === "rand" && args[1] === "-hex") {
        const n = Math.min(int(args[2], "n"), 256);
        return Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");
      }
      throw new UsageError("openssl: supported here: `openssl base64 [-d]`, `openssl rand -hex <n>`. More arrives with the Block Cipher Path.");
    },
  },
  python: {
    usage: 'python -c "<code>"',
    help: "run Python in the isolated sandbox",
    run: async (args, stdin, ctx) => {
      const code = args[0] === "-c" ? args.slice(1).join(" ") : stdin;
      if (!code?.trim()) throw new UsageError('usage: python -c "print(2**10)"');
      if (!ctx.runPython) throw new UsageError("python: sandbox unavailable here");
      const r = await ctx.runPython(code);
      const out = [r.stdout.replace(/\n$/, ""), r.stderr.replace(/\n$/, "")].filter(Boolean).join("\n");
      return r.timed_out ? `${out}\n[timed out]` : out;
    },
  },
  submit: {
    usage: "submit <answer>",
    help: "submit an answer for the current lab",
    run: async (args, stdin, ctx) => {
      const answer = text(args, stdin, "submit <answer>");
      if (!ctx.submit) throw new UsageError("submit: open a lab first");
      return ctx.submit(answer);
    },
  },
};

for (const cmd of ["nc", "curl", "ssh", "nmap"]) {
  COMMANDS[cmd] = {
    usage: cmd,
    help: "network tools (unlock in Protocol Pentester)",
    run: () => {
      throw new UsageError(`${cmd}: network tools unlock in the Protocol Pentester storyline.`);
    },
  };
}

export const COMMAND_NAMES = Object.keys(COMMANDS);

export async function execute(line: string, ctx: ShellContext): Promise<ShellResult> {
  if (!line.trim()) return { out: "" };
  try {
    const stages = parse(line, vars(ctx));
    let stdin: string | null = null;
    for (const [name, ...args] of stages) {
      if (!name) throw new UsageError("syntax error near `|`");
      if (name === "clear" && stages.length === 1) return { out: "", clear: true };
      const cmd = COMMANDS[name];
      if (!cmd) throw new UsageError(`command not found: ${name}. Type \`help\``);
      stdin = await cmd.run(args, stdin, ctx);
    }
    return { out: stdin ?? "" };
  } catch (e) {
    return { out: `\x1b[31m${e instanceof Error ? e.message : String(e)}\x1b[0m` };
  }
}
