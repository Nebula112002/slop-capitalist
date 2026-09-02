export type JuiceKind = "buy" | "hire" | "prestige" | "chest" | "claim" | "tap" | "rank";

type Voice = {
  /** Start and end frequency. A gap between them is a slide. */
  from: number;
  to?: number;
  dur: number;
  type: OscillatorType;
  gain: number;
  /** Seconds to wait before this voice starts. */
  delay?: number;
};

const VOICES: Record<JuiceKind, Voice[]> = {
  tap: [{ from: 420, dur: 0.04, type: "sine", gain: 0.03 }],
  buy: [
    { from: 300, to: 620, dur: 0.09, type: "triangle", gain: 0.05 },
    { from: 900, dur: 0.06, type: "sine", gain: 0.025, delay: 0.045 },
  ],
  rank: [
    { from: 520, dur: 0.1, type: "triangle", gain: 0.04 },
    { from: 784, dur: 0.12, type: "triangle", gain: 0.035, delay: 0.07 },
    { from: 1046, dur: 0.16, type: "sine", gain: 0.03, delay: 0.14 },
  ],
  hire: [
    { from: 300, to: 380, dur: 0.12, type: "square", gain: 0.028 },
    { from: 190, dur: 0.14, type: "triangle", gain: 0.03, delay: 0.02 },
  ],
  claim: [
    { from: 540, dur: 0.09, type: "sine", gain: 0.035 },
    { from: 810, dur: 0.1, type: "sine", gain: 0.025, delay: 0.06 },
  ],
  chest: [
    { from: 420, to: 880, dur: 0.18, type: "triangle", gain: 0.04 },
    { from: 1320, dur: 0.2, type: "sine", gain: 0.022, delay: 0.12 },
  ],
  prestige: [
    { from: 160, to: 320, dur: 0.3, type: "sawtooth", gain: 0.03 },
    { from: 480, dur: 0.26, type: "triangle", gain: 0.03, delay: 0.1 },
    { from: 640, dur: 0.34, type: "sine", gain: 0.026, delay: 0.2 },
  ],
};

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  const Ctor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function playJuice(kind: JuiceKind, muted: boolean): void {
  if (muted) return;
  const audio = context();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  for (const voice of VOICES[kind]) {
    const at = audio.currentTime + (voice.delay ?? 0);
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = voice.type;
    osc.frequency.setValueAtTime(voice.from, at);
    if (voice.to && voice.to !== voice.from) {
      osc.frequency.exponentialRampToValueAtTime(voice.to, at + voice.dur);
    }
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(voice.gain, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, at + voice.dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(at);
    osc.stop(at + voice.dur + 0.02);
  }
}
