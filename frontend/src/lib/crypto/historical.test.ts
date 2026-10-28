import { describe, expect, it } from "vitest";
import { calc, enigma, factor, modPow, navajoDecode, otpDecrypt, otpEncrypt, otpKey, rsaDecryptLetters } from "./historical";
import { execute } from "@/components/terminal/shell";
import { modInverse } from "./classical";

// Copied from the live lab files, so these tests prove a player can actually
// solve each lab with the terminal commands, not just that the maths is right.
const FILES = {
  "intercept.txt": "HGIXF HTZAJ YNWVE GARBW EDKNT PFDZQ OTRJE WTSWH HRMIF UAPXH IQMOE IHBPM SFIUY",
  "transmission.txt":
    "DA-HE-TIH-HI / MOASI NE-AHS-JAH A-KEH-DI-GLINI DZEH GAH / GAH DZEH CA-YEILTH NO-DA-IH DZEH DIBEH THAN-ZIE DZEH BE / MA-E DIBEH-YAZZIE WOL-LA-CHEE KLIZZIE / GAH WOL-LA-CHEE TKIN DIBEH DZEH BE / NE-AHS-JAH NESH-CHEE / DIBEH NO-DA-IH GAH TKIN SHUSH WOL-LA-CHEE MOASI LIN TKIN",
  "cable_a.txt": "PKLOA YNAPI KOYKS YAJPN ABNKI SWODE JCPKJ OPWPE KJPDA LWYGW CAWNN ERAOB NEZWU",
  "cable_b.txt": "QNCAJ PPDAI KHAOY KZAJW IAEOJ ECDPE JCWHA ZKJKP YKJPW YPDEI ZENAY PHUOP KLTTT",
  "session_key.txt": "3023 1188 2100 1972 2549 2369",
  "message.txt":
    "VIEOEGMOCIGOHHJ BVSX NIIIKEFVZ. SXHG TIRYTL KW EYT YMMEE VCGPRX YYCT GU T WCMIKK GZVQ. ZAY KQZKECEM VY KYJBBXXX RVQ ZAY WQAGE QFZQ OL JVZFKOYIIAIX.",
};
const ctx = { files: FILES };
const run = async (line: string) => (await execute(line, ctx)).out;

describe("enigma", () => {
  it("matches known Enigma I test vectors", () => {
    expect(enigma("AAAAA", ["I", "II", "III"], "AAA")).toBe("BDZGO");
    expect(enigma("AAAA", ["I", "II", "III"], "ADU")).toBe("EQIB");
  });
  it("is self-inverse and solves the lab", async () => {
    expect(enigma(enigma("HELLOWORLD", ["II", "IV", "V"], "XYZ"), ["II", "IV", "V"], "XYZ")).toBe("HELLOWORLD");
    expect(await run("enigma I-II-III QWE $INTERCEPT")).toContain("ICELAND");
    expect(await run("enigma I-II-III AAA $INTERCEPT")).not.toContain("ICELAND");
  });
});

describe("navajo codebook", () => {
  it("decodes the transmission", async () => {
    expect(navajoDecode(FILES["transmission.txt"])).toBe("[FIGHTER] COVER REQUESTED FLAG RAISED ON SURIBACHI");
    expect(await run("cat transmission.txt | codebook")).toContain("SURIBACHI");
    expect(await run("codebook")).toContain("WOL-LA-CHEE");
  });
});

describe("one-time pad", () => {
  it("roundtrips and recovers keys", () => {
    const c = otpEncrypt("ATTACKATDAWN", "QWERTYUIOPAS");
    expect(otpDecrypt(c, "QWERTYUIOPAS")).toBe("ATTACKATDAWN");
    expect(otpKey("ATTACK", c)).toBe("QWERTY");
    expect(otpDecrypt(c, "QWE")).toBe("ATT?????????");
  });
  it("solves the key-reuse lab via the terminal", async () => {
    const key = await run('otp-key "TOP SECRET MOSCOW CENTRE FROM WASHINGTON STATION" $CABLE_A');
    expect(key).toHaveLength(42);
    expect(await run(`otp-decrypt ${key} $CABLE_B`)).toContain("NIGHTINGALE");
  });
});

describe("rsa", () => {
  it("number theory helpers", () => {
    expect(factor(3233n)).toEqual([53n, 61n]);
    expect(calc("(61-1)*(53-1)")).toBe(3120n);
    expect(calc("2^10 % 1000 + -4")).toBe(20n);
    expect(modInverse(17, 3120)).toBe(2753);
    expect(modPow(65n, 17n, 3233n)).toBe(2790n);
  });
  it("solves the hybrid-encryption boss lab via the terminal", async () => {
    expect(rsaDecryptLetters([3023n, 1188n], 2753n, 3233n)).toBe("TU");
    expect(await run("factor 3233")).toBe("3233 = 53 × 61");
    expect(await run("factor 61")).toContain("(prime)");
    expect(await run("calc (61-1)*(53-1)")).toBe("3120");
    expect(await run("modinv 17 3120")).toMatch(/^2753 /);
    expect(await run("rsa-decrypt 2753 3233 $SESSION_KEY")).toBe("TURING");
    expect(await run("rsa-decrypt 2753 3233 $SESSION_KEY | vigenere-decrypt TURING $MESSAGE")).toContain("PERSEVERANCE");
    expect(await run("vigenere-decrypt TURING $MESSAGE")).toContain("THE FINAL WORD IS PERSEVERANCE");
  });
});
