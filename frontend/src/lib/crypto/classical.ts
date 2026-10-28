/**
 * Ciphers the player can run from the lab terminal. Everything here is purely
 * for the player to experiment with — whether an answer is right is decided by
 * the API, never in the browser.
 */

const UPPER_A = 65;
const LOWER_A = 97;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Applies `fn` to each letter's 0–25 index, keeping case and passing everything else through. */
function mapLetters(text: string, fn: (x: number) => number): string {
  let out = "";
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= UPPER_A && c < UPPER_A + 26) out += String.fromCharCode(mod(fn(c - UPPER_A), 26) + UPPER_A);
    else if (c >= LOWER_A && c < LOWER_A + 26) out += String.fromCharCode(mod(fn(c - LOWER_A), 26) + LOWER_A);
    else out += ch;
  }
  return out;
}

export function caesarEncrypt(text: string, shift: number): string {
  return mapLetters(text, (x) => x + shift);
}

export function caesarDecrypt(text: string, shift: number): string {
  return caesarEncrypt(text, -shift);
}

function vigenere(text: string, key: string, sign: 1 | -1): string {
  const shifts = [...key.toUpperCase()].filter((k) => k >= "A" && k <= "Z").map((k) => k.charCodeAt(0) - UPPER_A);
  if (shifts.length === 0) throw new Error(`"${key}" isn't a usable key — it needs at least one letter`);
  let i = 0;
  let out = "";
  for (const ch of text) {
    if (/[A-Za-z]/.test(ch)) {
      out += caesarEncrypt(ch, sign * shifts[i % shifts.length]);
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

export const vigenereEncrypt = (text: string, key: string) => vigenere(text, key, 1);
export const vigenereDecrypt = (text: string, key: string) => vigenere(text, key, -1);

export function gcd(x: number, y: number): number {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) [x, y] = [y, x % y];
  return x;
}

/** Modular inverse via the extended Euclidean algorithm (null if gcd ≠ 1). */
export function modInverse(value: number, m: number): number | null {
  let [oldR, r] = [mod(value, m), m];
  let [oldS, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return oldR === 1 ? mod(oldS, m) : null;
}

const badAffineKey = (keyA: number) =>
  new Error(`${keyA} can't be the multiplier — it shares a factor with 26 (try 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23 or 25)`);

export function affineEncrypt(text: string, keyA: number, keyB: number): string {
  if (modInverse(keyA, 26) === null) throw badAffineKey(keyA);
  return mapLetters(text, (x) => keyA * x + keyB);
}

export function affineDecrypt(text: string, keyA: number, keyB: number): string {
  const inv = modInverse(keyA, 26);
  if (inv === null) throw badAffineKey(keyA);
  return mapLetters(text, (y) => inv * (y - keyB));
}

export function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export function base64Decode(text: string): string {
  const bin = atob(text.replace(/\s+/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function letters(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, "");
}

export function frequencies(text: string): [string, number][] {
  const counts = new Map<string, number>();
  for (const ch of letters(text)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
}

export function indexOfCoincidence(text: string): number {
  const l = letters(text);
  if (l.length < 2) return 0;
  const sum = frequencies(l).reduce((acc, [, n]) => acc + n * (n - 1), 0);
  return sum / (l.length * (l.length - 1));
}

export function columns(text: string, n: number): string[] {
  const l = letters(text);
  return Array.from({ length: n }, (_, i) => [...l].filter((_, j) => j % n === i).join(""));
}

export const ENGLISH_FREQ: Record<string, number> = {
  E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1, R: 6.0, D: 4.3, L: 4.0, C: 2.8, U: 2.8,
  M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0, P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.15, X: 0.15, Q: 0.1, Z: 0.07,
};
