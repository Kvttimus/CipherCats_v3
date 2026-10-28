import { describe, expect, it } from "vitest";
import { execute, parse, varName } from "./shell";

const ctx = {
  files: { "intercept.txt": "TLLA HA AOL SPNOAOVBZL HA TPKUPNOA", "scroll_1.txt": "RVNQIEdUUlBZUENQIFZQSiBURCBIU1REVlBDRA==" },
};

describe("parse", () => {
  it("handles quotes, vars and pipes", () => {
    expect(parse(`echo "a b" 'c $X' $X | freq`, { X: "hi" })).toEqual([["echo", "a b", "c $X", "hi"], ["freq"]]);
  });
  it("derives variable names from files", () => {
    expect(varName("twins_letter.txt")).toBe("TWINS_LETTER");
  });
});

describe("execute", () => {
  it("decrypts the first lab via a variable", async () => {
    expect((await execute("caesar-decrypt 7 $INTERCEPT", ctx)).out).toBe("MEET AT THE LIGHTHOUSE AT MIDNIGHT");
  });
  it("pipes cat into bruteforce", async () => {
    const { out } = await execute("cat intercept.txt | caesar-bruteforce", ctx);
    expect(out.split("\n")[6]).toBe("[07] MEET AT THE LIGHTHOUSE AT MIDNIGHT");
  });
  it("chains base64 into caesar", async () => {
    const { out } = await execute("cat scroll_1.txt | base64 -d | caesar-bruteforce", ctx);
    expect(out).toContain("THE VIGENERE KEY IS WHISKERS");
  });
  it("vigenere and affine roundtrip", async () => {
    expect((await execute("vigenere-encrypt TWIN 'attack at dawn' | vigenere-decrypt TWIN", ctx)).out).toBe("attack at dawn");
    expect((await execute("affine-encrypt 5 8 HELLO | affine-decrypt 5 8", ctx)).out).toBe("HELLO");
  });
  it("computes modular inverses", async () => {
    expect((await execute("modinv 19 26", ctx)).out).toMatch(/^11 /);
    expect((await execute("modinv 13 26", ctx)).out).toContain("no inverse");
  });
  it("reports errors and clear", async () => {
    expect((await execute("nope", ctx)).out).toContain("command not found");
    expect((await execute("echo $MISSING", ctx)).out).toContain("unknown variable");
    expect((await execute("clear", ctx)).clear).toBe(true);
  });
});
