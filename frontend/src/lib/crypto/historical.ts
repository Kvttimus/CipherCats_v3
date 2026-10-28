/**
 * Terminal commands for the "Puzzles of the Past" storyline: an Enigma
 * simulator, the Navajo codebook, one-time pads and the number-theory helpers
 * the player needs to break toy RSA.
 */

const letters = (text: string) => text.toUpperCase().replace(/[^A-Z]/g, "");
const ord = (c: string) => c.charCodeAt(0) - 65;
const chr = (n: number) => String.fromCharCode((((n % 26) + 26) % 26) + 65);

/* Enigma ─────────────────────────────────────────────────────────────────────
 * Army/Air Force Enigma I with rotors I–V and reflector B. Ring settings are
 * always A and there's no plugboard, which keeps the labs approachable. */

export const ROTORS: Record<string, [wiring: string, notch: string]> = {
  I: ["EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q"],
  II: ["AJDKSIRUXBLHWTMCQGZNPYFVOE", "E"],
  III: ["BDFHJLCPRTXVZNYEIWGAKMUSQO", "V"],
  IV: ["ESOVPZJAYQUIRHXLNFTGKDCMWB", "J"],
  V: ["VZBRGITYUPSDNHLXAWMJQOFECK", "Z"],
};
const REFLECTOR_B = "YRUHQSLDPXNGOKMIEBFZCWVJAT";

/**
 * Runs `text` through the machine. The same call both encrypts and decrypts.
 * @param rotors rotor names from left to right, e.g. `["I", "II", "III"]`
 * @param start  letters showing in the three windows, e.g. `"AAA"`
 */
export function enigma(text: string, rotors: string[], start: string): string {
  if (rotors.length !== 3) throw new Error(`Enigma takes exactly three rotors (got ${rotors.length})`);
  if (!/^[A-Za-z]{3}$/.test(start)) throw new Error(`"${start}" isn't a valid start position — use three letters like AAA`);
  const spec = rotors.map((r) => {
    const s = ROTORS[r.toUpperCase()];
    if (!s) throw new Error(`there's no rotor called "${r}" — pick from I, II, III, IV, V`);
    return s;
  });
  const wirings = spec.map(([w]) => [...w].map(ord));
  const notches = spec.map(([, n]) => ord(n));
  const inverse = wirings.map((w) => {
    const inv = new Array<number>(26);
    w.forEach((v, i) => (inv[v] = i));
    return inv;
  });
  const pos = [...start.toUpperCase()].map(ord);
  const mod = (n: number) => ((n % 26) + 26) % 26;

  let out = "";
  for (const ch of letters(text)) {
    // Rotors advance before each key press lights a lamp.
    const stepMiddle = pos[2] === notches[2] || pos[1] === notches[1];
    const stepLeft = pos[1] === notches[1];
    pos[2] = mod(pos[2] + 1);
    if (stepMiddle) pos[1] = mod(pos[1] + 1);
    if (stepLeft) pos[0] = mod(pos[0] + 1);

    let c = ord(ch);
    for (const i of [2, 1, 0]) c = mod(wirings[i][mod(c + pos[i])] - pos[i]);
    c = ord(REFLECTOR_B[c]);
    for (const i of [0, 1, 2]) c = mod(inverse[i][mod(c + pos[i])] - pos[i]);
    out += chr(c);
  }
  return out;
}

/* Navajo code ────────────────────────────────────────────────────────────────
 * The real code had several words per letter; the game uses just one each. */

export const NAVAJO_ALPHABET: Record<string, string> = {
  A: "WOL-LA-CHEE", B: "SHUSH", C: "MOASI", D: "BE", E: "DZEH", F: "MA-E", G: "KLIZZIE", H: "LIN",
  I: "TKIN", J: "TKELE-CHO-GI", K: "KLIZZIE-YAZZIE", L: "DIBEH-YAZZIE", M: "NA-AS-TSO-SI", N: "NESH-CHEE",
  O: "NE-AHS-JAH", P: "BI-SO-DIH", Q: "CA-YEILTH", R: "GAH", S: "DIBEH", T: "THAN-ZIE", U: "NO-DA-IH",
  V: "A-KEH-DI-GLINI", W: "GLOE-IH", X: "AL-NA-AS-DZOH", Y: "TSAH-AS-ZIH", Z: "BESH-DO-TLIZ",
};
export const NAVAJO_TERMS: Record<string, string> = {
  SUBMARINE: "BESH-LO", BATTLESHIP: "LO-TSO", DESTROYER: "CA-LO",
  FIGHTER: "DA-HE-TIH-HI", BOMBER: "JAY-SHO", DIVEBOMBER: "GINI",
};
const NAVAJO_MEANING: Record<string, string> = {
  "WOL-LA-CHEE": "ant", SHUSH: "bear", MOASI: "cat", BE: "deer", DZEH: "elk", "MA-E": "fox", KLIZZIE: "goat",
  LIN: "horse", TKIN: "ice", "TKELE-CHO-GI": "jackass", "KLIZZIE-YAZZIE": "kid", "DIBEH-YAZZIE": "lamb",
  "NA-AS-TSO-SI": "mouse", "NESH-CHEE": "nut", "NE-AHS-JAH": "owl", "BI-SO-DIH": "pig", "CA-YEILTH": "quiver",
  GAH: "rabbit", DIBEH: "sheep", "THAN-ZIE": "turkey", "NO-DA-IH": "Ute", "A-KEH-DI-GLINI": "victor",
  "GLOE-IH": "weasel", "AL-NA-AS-DZOH": "cross", "TSAH-AS-ZIH": "yucca", "BESH-DO-TLIZ": "zinc",
  "BESH-LO": "iron fish", "LO-TSO": "whale", "CA-LO": "shark", "DA-HE-TIH-HI": "hummingbird",
  "JAY-SHO": "buzzard", GINI: "chicken hawk",
};

const LETTER_OF = Object.fromEntries(Object.entries(NAVAJO_ALPHABET).map(([k, v]) => [v, k]));
const TERM_OF = Object.fromEntries(Object.entries(NAVAJO_TERMS).map(([k, v]) => [v, k]));

/** Turns a transmission back into English. Code words are space-separated, words split on "/". */
export function navajoDecode(text: string): string {
  return text
    .split("/")
    .map((group) => {
      const tokens = group.trim().toUpperCase().split(/\s+/).filter(Boolean);
      if (tokens.length === 1 && TERM_OF[tokens[0]]) return `[${TERM_OF[tokens[0]]}]`;
      return tokens.map((t) => LETTER_OF[t] ?? "?").join("");
    })
    .join(" ");
}

export function navajoCodebook(): string {
  const rows = Object.entries(NAVAJO_ALPHABET).map(([l, w]) => `${l}  ${w.padEnd(15)} (${NAVAJO_MEANING[w]})`);
  const terms = Object.entries(NAVAJO_TERMS).map(([t, w]) => `${w.padEnd(13)} = ${t.toLowerCase()} (${NAVAJO_MEANING[w]})`);
  return ["ALPHABET", ...rows, "", "MILITARY TERMS", ...terms].join("\n");
}

/* One-time pad ───────────────────────────────────────────────────────────────
 * Letter-wise: cipher = plain + key (mod 26). */

export function otpEncrypt(plain: string, key: string): string {
  const p = letters(plain);
  const k = letters(key);
  if (k.length < p.length) throw new Error(`pad is too short: the message has ${p.length} letters but the pad only ${k.length}`);
  return [...p].map((c, i) => chr(ord(c) + ord(k[i]))).join("");
}

/** Works the pad out from a crib: subtract the guessed plaintext from the ciphertext. */
export function otpKey(plain: string, cipher: string): string {
  const p = letters(plain);
  const c = letters(cipher);
  return [...p.slice(0, c.length)].map((ch, i) => chr(ord(c[i]) - ord(ch))).join("");
}

/** A partial key still decrypts partially — letters past the end of the key show as "?". */
export function otpDecrypt(cipher: string, key: string): string {
  const k = letters(key);
  return [...letters(cipher)].map((c, i) => (i < k.length ? chr(ord(c) - ord(k[i])) : "?")).join("");
}

/* RSA helpers ────────────────────────────────────────────────────────────────
 * BigInt throughout so `calc` and `modpow` don't silently lose precision. */

export function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  if (m === 1n) return 0n;
  let result = 1n;
  base %= m;
  if (base < 0n) base += m;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % m;
    base = (base * base) % m;
    exp >>= 1n;
  }
  return result;
}

/** Prime factors by trial division (fine for the toy keys used in labs). */
export function factor(n: bigint): bigint[] | null {
  if (n < 2n) return [];
  const out: bigint[] = [];
  let i = 2n;
  let steps = 0;
  while (i * i <= n) {
    if (++steps > 5_000_000) return null; // too big to factor in the browser
    while (n % i === 0n) {
      out.push(i);
      n /= i;
    }
    i += i === 2n ? 1n : 2n;
  }
  if (n > 1n) out.push(n);
  return out;
}

/** Each block decrypts to one letter (1 → A … 26 → Z); anything out of range is shown raw as `[n]`. */
export function rsaDecryptLetters(blocks: bigint[], d: bigint, n: bigint): string {
  return blocks
    .map((c) => {
      const m = modPow(c, d, n);
      return m >= 1n && m <= 26n ? String.fromCharCode(Number(m) + 64) : `[${m}]`;
    })
    .join("");
}

/** Evaluate an integer expression: + - * / % ^ ** and parentheses, using BigInt. */
export function calc(expr: string): bigint {
  const tokens = expr.match(/\d+|\*\*|[-+*/%^()]/g) ?? [];
  if (tokens.join("") !== expr.replace(/\s+/g, "")) throw new Error("only integers and + - * / % ^ ( ) are allowed");
  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];

  const primary = (): bigint => {
    const t = take();
    if (t === "(") {
      const v = sum();
      if (take() !== ")") throw new Error("missing )");
      return v;
    }
    if (t === "-") return -primary();
    if (t !== undefined && /^\d+$/.test(t)) return BigInt(t);
    throw new Error("syntax error");
  };
  const power = (): bigint => {
    const base = primary();
    if (peek() === "^" || peek() === "**") {
      take();
      const exp = power();
      if (exp < 0n || exp > 4096n) throw new Error("exponent must be 0-4096 (use modpow for big powers)");
      return base ** exp;
    }
    return base;
  };
  const product = (): bigint => {
    let v = power();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = take();
      const r = power();
      if (op !== "*" && r === 0n) throw new Error("division by zero");
      v = op === "*" ? v * r : op === "/" ? v / r : ((v % r) + r) % r;
    }
    return v;
  };
  const sum = (): bigint => {
    let v = product();
    while (peek() === "+" || peek() === "-") v = take() === "+" ? v + product() : v - product();
    return v;
  };

  const result = sum();
  if (i !== tokens.length) throw new Error("syntax error");
  return result;
}
