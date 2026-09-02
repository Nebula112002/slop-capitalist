import {
  BUSINESSES,
  MILESTONES,
  OFFLINE_CAP_MS,
  PRESTIGE_AT,
  SAVE_KEY,
  type PlanetId,
} from "./data";

export type BuyMode = 1 | 10 | "max";

export type BusinessRuntime = {
  owned: number;
  manager: boolean;
  progress: number;
  running: boolean;
};

export type GameState = {
  v: 1;
  views: number;
  lifetimeViews: number;
  prestigeMult: number;
  tiktokUnlocked: boolean;
  planet: PlanetId;
  businesses: Record<PlanetId, BusinessRuntime[]>;
  lastTs: number;
};

function emptyBusinesses(planet: PlanetId, starter = false): BusinessRuntime[] {
  return BUSINESSES[planet].map((_, i) => ({
    owned: starter && i === 0 ? 1 : 0,
    manager: false,
    progress: 0,
    running: false,
  }));
}

export function newGame(now = Date.now()): GameState {
  return {
    v: 1,
    views: 0,
    lifetimeViews: 0,
    prestigeMult: 1,
    tiktokUnlocked: false,
    planet: "youtube",
    businesses: {
      youtube: emptyBusinesses("youtube", true),
      tiktok: emptyBusinesses("tiktok"),
    },
    lastTs: now,
  };
}

function isPlanetId(value: unknown): value is PlanetId {
  return value === "youtube" || value === "tiktok";
}

function hydrateBusinesses(
  planet: PlanetId,
  raw: unknown,
  starter: boolean,
): BusinessRuntime[] {
  const fallback = emptyBusinesses(planet, starter);
  if (!Array.isArray(raw)) return fallback;
  return fallback.map((_, i) => {
    const row = raw[i] as Partial<BusinessRuntime> | undefined;
    return {
      owned: Math.max(0, Math.floor(Number(row?.owned) || 0)),
      manager: Boolean(row?.manager),
      progress: Math.min(1, Math.max(0, Number(row?.progress) || 0)),
      running: Boolean(row?.running),
    };
  });
}

export function loadGame(raw: string | null, now = Date.now()): GameState {
  if (!raw) return newGame(now);
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const base = newGame(now);
    return {
      ...base,
      views: Math.max(0, Number(parsed.views) || 0),
      lifetimeViews: Math.max(0, Number(parsed.lifetimeViews) || 0),
      prestigeMult: Math.max(1, Number(parsed.prestigeMult) || 1),
      tiktokUnlocked: Boolean(parsed.tiktokUnlocked),
      planet: isPlanetId(parsed.planet) ? parsed.planet : "youtube",
      businesses: {
        youtube: hydrateBusinesses("youtube", parsed.businesses?.youtube, true),
        tiktok: hydrateBusinesses("tiktok", parsed.businesses?.tiktok, Boolean(parsed.tiktokUnlocked)),
      },
      lastTs: Math.max(0, Number(parsed.lastTs) || now),
    };
  } catch {
    return newGame(now);
  }
}

export function saveGame(state: GameState): string {
  return JSON.stringify({ ...state, lastTs: Date.now() });
}

export function persist(state: GameState, storage: Storage = localStorage): void {
  storage.setItem(SAVE_KEY, saveGame(state));
}

export function milestoneMult(owned: number): number {
  let n = 0;
  for (const mark of MILESTONES) {
    if (owned >= mark) n += 1;
  }
  return 2 ** n;
}

export function nextMilestone(owned: number): number | null {
  return MILESTONES.find((mark) => owned < mark) ?? null;
}

export function buyCost(baseCost: number, costMult: number, owned: number, count: number): number {
  if (count <= 0) return 0;
  if (costMult === 1) return baseCost * count;
  const first = baseCost * costMult ** owned;
  return first * ((costMult ** count - 1) / (costMult - 1));
}

export function maxAffordable(
  views: number,
  baseCost: number,
  costMult: number,
  owned: number,
): number {
  if (views <= 0) return 0;
  const first = baseCost * costMult ** owned;
  if (views < first) return 0;
  if (costMult === 1) return Math.floor(views / baseCost);
  const n = Math.floor(Math.log(1 + (views * (costMult - 1)) / first) / Math.log(costMult));
  return Math.max(0, n);
}

export function cycleIncome(planet: PlanetId, index: number, owned: number, prestigeMult: number): number {
  if (owned <= 0) return 0;
  const def = BUSINESSES[planet][index];
  return def.income * owned * milestoneMult(owned) * prestigeMult;
}

export function viewsPerSec(state: GameState, planet: PlanetId = state.planet): number {
  const defs = BUSINESSES[planet];
  const rows = state.businesses[planet];
  let vps = 0;
  for (let i = 0; i < defs.length; i++) {
    const row = rows[i];
    if (!row.manager && !row.running) continue;
    if (row.owned <= 0) continue;
    vps += cycleIncome(planet, i, row.owned, state.prestigeMult) / defs[i].cycleSec;
  }
  return vps;
}

export function globalViewsPerSec(state: GameState): number {
  let total = viewsPerSec(state, "youtube");
  if (state.tiktokUnlocked) total += viewsPerSec(state, "tiktok");
  return total;
}

function credit(state: GameState, amount: number): void {
  if (amount <= 0) return;
  state.views += amount;
  state.lifetimeViews += amount;
}

export function tick(state: GameState, dtSec: number): number {
  if (dtSec <= 0) return 0;
  let earned = 0;
  const planets: PlanetId[] = state.tiktokUnlocked ? ["youtube", "tiktok"] : ["youtube"];
  for (const planet of planets) {
    const defs = BUSINESSES[planet];
    const rows = state.businesses[planet];
    for (let i = 0; i < defs.length; i++) {
      const row = rows[i];
      if (row.owned <= 0) continue;
      if (row.manager) row.running = true;
      if (!row.running) continue;
      row.progress += dtSec / defs[i].cycleSec;
      if (row.progress >= 1) {
        const cycles = Math.floor(row.progress);
        row.progress -= cycles;
        const payout = cycleIncome(planet, i, row.owned, state.prestigeMult) * cycles;
        credit(state, payout);
        earned += payout;
        if (!row.manager) row.running = false;
      }
    }
  }
  return earned;
}

export function applyOffline(
  state: GameState,
  now = Date.now(),
): { earned: number; offlineMs: number } {
  const elapsed = Math.max(0, now - (state.lastTs || now));
  const offlineMs = Math.min(elapsed, OFFLINE_CAP_MS);
  state.lastTs = now;
  if (offlineMs < 1000) return { earned: 0, offlineMs };
  const seconds = offlineMs / 1000;
  const vps = globalViewsPerSec({
    ...state,
    businesses: {
      youtube: state.businesses.youtube.map((row) => ({
        ...row,
        running: row.manager,
      })),
      tiktok: state.businesses.tiktok.map((row) => ({
        ...row,
        running: row.manager,
      })),
    },
  });
  const earned = vps * seconds;
  credit(state, earned);
  return { earned, offlineMs };
}

export function startCycle(state: GameState, index: number): boolean {
  const row = state.businesses[state.planet][index];
  if (!row || row.owned <= 0 || row.running) return false;
  row.running = true;
  return true;
}

export function resolveBuyCount(
  state: GameState,
  index: number,
  mode: BuyMode,
): number {
  const def = BUSINESSES[state.planet][index];
  const row = state.businesses[state.planet][index];
  if (!def || !row) return 0;
  if (mode === "max") {
    return maxAffordable(state.views, def.baseCost, def.costMult, row.owned);
  }
  return mode;
}

export function buy(state: GameState, index: number, mode: BuyMode): number {
  const def = BUSINESSES[state.planet][index];
  const row = state.businesses[state.planet][index];
  if (!def || !row) return 0;
  const count = resolveBuyCount(state, index, mode);
  if (count <= 0) return 0;
  const cost = buyCost(def.baseCost, def.costMult, row.owned, count);
  if (state.views < cost) return 0;
  state.views -= cost;
  row.owned += count;
  return count;
}

export function hireManager(state: GameState, index: number): boolean {
  const def = BUSINESSES[state.planet][index];
  const row = state.businesses[state.planet][index];
  if (!def || !row || row.manager || row.owned <= 0) return false;
  if (state.views < def.managerCost) return false;
  state.views -= def.managerCost;
  row.manager = true;
  row.running = true;
  return true;
}

export function canPrestige(state: GameState): boolean {
  return state.lifetimeViews >= PRESTIGE_AT;
}

export function prestigeGain(lifetimeViews: number): number {
  if (lifetimeViews < PRESTIGE_AT) return 0;
  return Math.max(0.25, Math.log10(lifetimeViews) - 5);
}

export function prestige(state: GameState): number {
  if (!canPrestige(state)) return 0;
  const gain = prestigeGain(state.lifetimeViews);
  state.prestigeMult += gain;
  state.tiktokUnlocked = true;
  state.views = 0;
  state.planet = "tiktok";
  state.businesses.youtube = emptyBusinesses("youtube", true);
  state.businesses.tiktok = emptyBusinesses("tiktok", true);
  return gain;
}

export function setPlanet(state: GameState, planet: PlanetId): boolean {
  if (planet === "tiktok" && !state.tiktokUnlocked) return false;
  state.planet = planet;
  return true;
}

export function readStorage(storage: Storage = localStorage): GameState {
  return loadGame(storage.getItem(SAVE_KEY));
}
