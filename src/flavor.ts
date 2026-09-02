export type FlavorKind = "buy-bulk" | "manager" | "milestone" | "prestige" | "offline";
export type FlavorRarity = "common" | "uncommon" | "rare";

export type FlavorLine = {
  kind: FlavorKind;
  rarity: FlavorRarity;
  text: string;
};

export type FlavorVars = {
  n?: number | string;
  name?: string;
  views?: string;
  time?: string;
  mark?: number | string;
  gain?: string;
};

const WEIGHTS: Record<FlavorRarity, number> = {
  common: 70,
  uncommon: 25,
  rare: 5,
};

export const FLAVOR: FlavorLine[] = [
  { kind: "manager", rarity: "common", text: "Autopilot on {name}." },
  { kind: "manager", rarity: "common", text: "{name} is posting without you." },
  { kind: "manager", rarity: "common", text: "Queued. This bar runs itself." },
  { kind: "manager", rarity: "uncommon", text: "One less upload to babysit." },
  { kind: "manager", rarity: "uncommon", text: "They will keep posting. That is the job." },
  { kind: "manager", rarity: "rare", text: "The intern found the scheduler." },
  { kind: "buy-bulk", rarity: "common", text: "+{n} {name}." },
  { kind: "buy-bulk", rarity: "common", text: "Bought {n}." },
  { kind: "buy-bulk", rarity: "common", text: "{n} more in the pipeline." },
  { kind: "buy-bulk", rarity: "uncommon", text: "{n}. The catalog got longer." },
  { kind: "buy-bulk", rarity: "uncommon", text: "Farm grew by {n}." },
  { kind: "buy-bulk", rarity: "rare", text: "Quantity is the strategy." },
  { kind: "milestone", rarity: "common", text: "{name} ×2 at {mark}." },
  { kind: "milestone", rarity: "common", text: "Rank {mark}. {name} pays double." },
  { kind: "milestone", rarity: "uncommon", text: "{name} just sped up." },
  { kind: "prestige", rarity: "common", text: "{name} unlocked. Banked {gain} Hype." },
  { kind: "prestige", rarity: "uncommon", text: "Every farm reset. Hype stayed in the shop." },
  { kind: "prestige", rarity: "rare", text: "The algorithm remembers {gain} Hype." },
  { kind: "offline", rarity: "common", text: "While you were gone ({time}): +{views} views" },
  { kind: "offline", rarity: "common", text: "Away {time}. +{views} views." },
  { kind: "offline", rarity: "uncommon", text: "The farm kept posting ({time}): +{views}" },
  { kind: "offline", rarity: "rare", text: "While you were gone ({time}): +{views} views. The bots did not clock out." },
  { kind: "buy-bulk", rarity: "common", text: "{n} more clips in the hopper." },
  { kind: "manager", rarity: "common", text: "Scheduler armed on {name}." },
];

const lastLine: Partial<Record<FlavorKind, string>> = {};
const rareUsed: Partial<Record<FlavorKind, boolean>> = {};

export function resetFlavorSession(): void {
  for (const key of Object.keys(lastLine) as FlavorKind[]) delete lastLine[key];
  for (const key of Object.keys(rareUsed) as FlavorKind[]) delete rareUsed[key];
}

function fill(text: string, vars: FlavorVars): string {
  return text.replace(/\{(n|name|views|time|mark|gain)\}/g, (_, key: keyof FlavorVars) =>
    String(vars[key] ?? ""),
  );
}

function pickFrom(
  pool: FlavorLine[],
  rng: () => number,
): FlavorLine {
  const total = pool.reduce((sum, line) => sum + WEIGHTS[line.rarity], 0);
  let roll = rng() * total;
  for (const line of pool) {
    roll -= WEIGHTS[line.rarity];
    if (roll <= 0) return line;
  }
  return pool[pool.length - 1];
}

export function pickFlavor(
  kind: FlavorKind,
  vars: FlavorVars = {},
  rng: () => number = Math.random,
): string {
  const all = FLAVOR.filter((line) => line.kind === kind);
  const allowRare = !rareUsed[kind];
  const pool = allowRare ? all : all.filter((line) => line.rarity !== "rare");
  let chosen = pickFrom(pool, rng);
  if (lastLine[kind] && pool.length > 1) {
    for (let i = 0; i < 6 && chosen.text === lastLine[kind]; i++) {
      chosen = pickFrom(pool, rng);
    }
    if (chosen.text === lastLine[kind]) {
      chosen = pool.find((line) => line.text !== lastLine[kind]) ?? chosen;
    }
  }
  if (chosen.rarity === "rare") rareUsed[kind] = true;
  lastLine[kind] = chosen.text;
  return fill(chosen.text, vars);
}
