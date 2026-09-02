const SUFFIXES = [
  "",
  "K",
  "M",
  "B",
  "T",
  "Qa",
  "Qi",
  "Sx",
  "Sp",
  "Oc",
  "No",
  "Dc",
];

export function formatNum(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n < 1000) {
    if (n === 0) return "0";
    if (n < 10 && !Number.isInteger(n)) return n.toFixed(1);
    return String(Math.floor(n));
  }
  let value = n;
  let idx = 0;
  while (value >= 1000 && idx < SUFFIXES.length - 1) {
    value /= 1000;
    idx += 1;
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  const trimmed = value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
  return `${trimmed}${SUFFIXES[idx]}`;
}

export function formatTime(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export function formatCycle(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0s";
  if (Math.abs(sec - Math.round(sec)) < 0.005) return `${Math.round(sec)}s`;
  if (sec >= 10) return `${sec.toFixed(1)}s`;
  return `${sec.toFixed(2)}s`;
}
