const A = "A".charCodeAt(0);
const a = "a".charCodeAt(0);

export function caesarShift(text: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26;
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= A && code <= A + 25) {
      out += String.fromCharCode(((code - A + s) % 26) + A);
    } else if (code >= a && code <= a + 25) {
      out += String.fromCharCode(((code - a + s) % 26) + a);
    } else {
      out += ch;
    }
  }
  return out;
}

export function caesarDecrypt(text: string, shift: number): string {
  return caesarShift(text, -shift);
}

export function normalizeAnswer(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}
