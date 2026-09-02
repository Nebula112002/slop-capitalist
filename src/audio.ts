export type JuiceKind = "buy" | "hire" | "prestige" | "chest" | "claim" | "tap";

const TONES: Record<JuiceKind, { freq: number; dur: number; type: OscillatorType }> = {
  tap: { freq: 420, dur: 0.04, type: "sine" },
  buy: { freq: 620, dur: 0.07, type: "triangle" },
  hire: { freq: 380, dur: 0.1, type: "square" },
  claim: { freq: 540, dur: 0.09, type: "sine" },
  chest: { freq: 740, dur: 0.14, type: "triangle" },
  prestige: { freq: 280, dur: 0.22, type: "sawtooth" },
};

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function playJuice(kind: JuiceKind, muted: boolean): void {
  if (muted) return;
  const audio = context();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  const tone = TONES[kind];
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = tone.type;
  osc.frequency.value = tone.freq;
  gain.gain.setValueAtTime(0.04, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0008, audio.currentTime + tone.dur);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + tone.dur);
}
