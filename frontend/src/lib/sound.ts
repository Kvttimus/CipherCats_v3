import { getSettings } from "./settings";

// Tiny synthesized SFX + ambient pad via WebAudio, so there are no audio assets to ship.

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.06) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.05);
}

export type Sfx = "click" | "success" | "error" | "unlock" | "key";

export function play(sfx: Sfx) {
  if (!getSettings().sound) return;
  switch (sfx) {
    case "click":
      tone(660, 0, 0.06, "triangle", 0.04);
      break;
    case "key":
      tone(1200 + Math.random() * 200, 0, 0.02, "square", 0.012);
      break;
    case "error":
      tone(220, 0, 0.15, "sawtooth", 0.04);
      tone(180, 0.12, 0.2, "sawtooth", 0.04);
      break;
    case "success":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, "triangle"));
      break;
    case "unlock":
      [784, 988, 1319].forEach((f, i) => tone(f, i * 0.07, 0.3, "sine", 0.05));
      break;
  }
}

// --- ambient music -----------------------------------------------------------------

let ambient: { stop: () => void } | null = null;

export function setMusic(on: boolean) {
  if (!on) {
    ambient?.stop();
    ambient = null;
    return;
  }
  if (ambient) return;
  const ac = audio();
  if (!ac) return;
  const master = ac.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.025, ac.currentTime + 2);
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  filter.connect(master).connect(ac.destination);
  const oscs = [110, 164.81, 220, 277.18].map((f, i) => {
    const o = ac.createOscillator();
    o.type = i % 2 ? "triangle" : "sine";
    o.frequency.value = f;
    o.detune.value = (i - 1.5) * 4;
    o.connect(filter);
    o.start();
    return o;
  });
  ambient = {
    stop: () => {
      master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6);
      oscs.forEach((o) => o.stop(ac.currentTime + 0.7));
    },
  };
}
