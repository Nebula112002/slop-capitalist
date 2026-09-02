import {
  BUSINESSES,
  MILESTONES,
  MIN_CYCLE_SEC,
  NUDGE_COOLDOWN_MS,
  NUDGE_PER_CYCLE,
  NUDGE_PROGRESS,
  OFFLINE_CAP_MS,
  PRESTIGE_AT,
  PRESTIGE_SCALE,
  SAVE_KEY,
  SAVE_VERSION,
  SPEED_PER_RANK,
  type PlanetId,
} from "./data";

export type BuyMode = 1 | 10 | 100 | "max" | "rank";

export type BusinessRuntime = {
  owned: number;
  manager: boolean;
  progress: number;
  running: boolean;
};

export type GameState = {
  v: number;
  views: number;
  lifetimeViews: number;
  viewsThisRun: number;
  nextPrestigeAt: number;
  prestigeMult: number;
  tiktokUnlocked: boolean;
  planet: PlanetId;
  businesses: Record<PlanetId, BusinessRuntime[]>;
  lastTs: number;
};

export type TapSession = {
  nudges: Record<string, { used: number; lastAt: number }>;
};

export type BuyQuote = {
  count: number;
  cost: number;
  gap: number | null;
  canBuy: boolean;
  locked: boolean;
};

export type RowBadge = "best" | "lock" | "slow" | null;

export type FarmAdvice = {
  bestIndex: number | null;
  lockIndex: number | null;
  slowIndex: number | null;
  badges: RowBadge[];
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
    v: SAVE_VERSION,
    views: 0,
    lifetimeViews: 0,
    viewsThisRun: 0,
    nextPrestigeAt: PRESTIGE_AT,
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

export function newTapSession(): TapSession {
  return { nudges: {} };
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

function alreadyPrestiged(parsed: Partial<GameState>): boolean {
  return Boolean(parsed.tiktokUnlocked) || (Number(parsed.prestigeMult) || 1) > 1;
}

function hydrateRunMeters(parsed: Partial<GameState>): {
  viewsThisRun: number;
  nextPrestigeAt: number;
} {
  const hasRunFields =
    Number(parsed.v) >= 2 &&
    parsed.viewsThisRun !== undefined &&
    parsed.nextPrestigeAt !== undefined;
  if (hasRunFields) {
    return {
      viewsThisRun: Math.max(0, Number(parsed.viewsThisRun) || 0),
      nextPrestigeAt: Math.max(PRESTIGE_AT, Number(parsed.nextPrestigeAt) || PRESTIGE_AT),
    };
  }
  // v1 saves: keep first-bar progress if they never prestiged; re-lock everyone else.
  if (alreadyPrestiged(parsed)) {
    return { viewsThisRun: 0, nextPrestigeAt: PRESTIGE_AT };
  }
  return {
    viewsThisRun: Math.max(0, Number(parsed.lifetimeViews) || 0),
    nextPrestigeAt: PRESTIGE_AT,
  };
}

export function loadGame(raw: string | null, now = Date.now()): GameState {
  if (!raw) return newGame(now);
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const base = newGame(now);
    const run = hydrateRunMeters(parsed);
    return {
      ...base,
      views: Math.max(0, Number(parsed.views) || 0),
      lifetimeViews: Math.max(0, Number(parsed.lifetimeViews) || 0),
      viewsThisRun: run.viewsThisRun,
      nextPrestigeAt: run.nextPrestigeAt,
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

export function milestoneRanks(owned: number): number {
  let n = 0;
  for (const mark of MILESTONES) {
    if (owned >= mark) n += 1;
  }
  return n;
}

export function milestoneMult(owned: number): number {
  return 2 ** milestoneRanks(owned);
}

export function effectiveCycleSec(baseCycle: number, owned: number): number {
  return Math.max(MIN_CYCLE_SEC, baseCycle * SPEED_PER_RANK ** milestoneRanks(owned));
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

export function potentialVps(
  planet: PlanetId,
  index: number,
  owned: number,
  prestigeMult: number,
): number {
  if (owned <= 0) return 0;
  const def = BUSINESSES[planet][index];
  return cycleIncome(planet, index, owned, prestigeMult) / effectiveCycleSec(def.cycleSec, owned);
}

export function rowVps(state: GameState, index: number, planet: PlanetId = state.planet): number {
  const row = state.businesses[planet][index];
  if (!row || row.owned <= 0) return 0;
  if (!row.manager && !row.running) return 0;
  return potentialVps(planet, index, row.owned, state.prestigeMult);
}

export function viewsPerSec(state: GameState, planet: PlanetId = state.planet): number {
  const defs = BUSINESSES[planet];
  let vps = 0;
  for (let i = 0; i < defs.length; i++) {
    vps += rowVps(state, i, planet);
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
  state.viewsThisRun += amount;
}

function nudgeKey(planet: PlanetId, index: number): string {
  return `${planet}:${index}`;
}

export function tick(state: GameState, dtSec: number, session?: TapSession): number {
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
      const cycle = effectiveCycleSec(defs[i].cycleSec, row.owned);
      row.progress += dtSec / cycle;
      if (row.progress >= 1) {
        const cycles = Math.floor(row.progress);
        row.progress -= cycles;
        const payout = cycleIncome(planet, i, row.owned, state.prestigeMult) * cycles;
        credit(state, payout);
        earned += payout;
        if (!row.manager) row.running = false;
        if (session) delete session.nudges[nudgeKey(planet, i)];
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

export function tapBar(
  state: GameState,
  index: number,
  session: TapSession,
  now = Date.now(),
): "start" | "nudge" | "none" {
  const row = state.businesses[state.planet][index];
  if (!row || row.owned <= 0) return "none";
  if (!row.manager) return startCycle(state, index) ? "start" : "none";
  const key = nudgeKey(state.planet, index);
  const slot = session.nudges[key] ?? { used: 0, lastAt: 0 };
  if (now - slot.lastAt < NUDGE_COOLDOWN_MS) return "none";
  if (slot.used >= NUDGE_PER_CYCLE) return "none";
  row.progress += NUDGE_PROGRESS;
  slot.used += 1;
  slot.lastAt = now;
  session.nudges[key] = slot;
  return "nudge";
}

export function canUnlock(state: GameState, index: number): boolean {
  if (index <= 0) return true;
  return state.businesses[state.planet][index - 1].owned > 0;
}

export function parseBuyMode(raw: string | undefined): BuyMode {
  if (raw === "max") return "max";
  if (raw === "rank") return "rank";
  if (raw === "100") return 100;
  if (raw === "10") return 10;
  return 1;
}

export function quotedBuy(state: GameState, index: number, mode: BuyMode): BuyQuote {
  const def = BUSINESSES[state.planet][index];
  const row = state.businesses[state.planet][index];
  if (!def || !row) {
    return { count: 0, cost: 0, gap: null, canBuy: false, locked: true };
  }
  const locked = row.owned <= 0 && !canUnlock(state, index);

  if (mode === "rank") {
    const next = nextMilestone(row.owned);
    if (next === null) {
      const count = maxAffordable(state.views, def.baseCost, def.costMult, row.owned);
      const cost = count > 0 ? buyCost(def.baseCost, def.costMult, row.owned, count) : buyCost(def.baseCost, def.costMult, row.owned, 1);
      return { count, cost, gap: null, canBuy: !locked && count > 0, locked };
    }
    const gap = next - row.owned;
    const afford = maxAffordable(state.views, def.baseCost, def.costMult, row.owned);
    const count = Math.min(afford, gap);
    const cost = buyCost(def.baseCost, def.costMult, row.owned, count > 0 ? count : gap);
    return { count, cost, gap, canBuy: !locked && count > 0, locked };
  }

  if (mode === "max") {
    const count = maxAffordable(state.views, def.baseCost, def.costMult, row.owned);
    const cost = count > 0 ? buyCost(def.baseCost, def.costMult, row.owned, count) : buyCost(def.baseCost, def.costMult, row.owned, 1);
    return { count, cost, gap: null, canBuy: !locked && count > 0, locked };
  }

  const count = mode;
  const cost = buyCost(def.baseCost, def.costMult, row.owned, count);
  return { count, cost, gap: null, canBuy: !locked && state.views >= cost, locked };
}

export function resolveBuyCount(state: GameState, index: number, mode: BuyMode): number {
  if (mode === "max" || mode === "rank") return quotedBuy(state, index, mode).count;
  return mode;
}

export function buy(state: GameState, index: number, mode: BuyMode): number {
  const def = BUSINESSES[state.planet][index];
  const row = state.businesses[state.planet][index];
  if (!def || !row) return 0;
  if (row.owned <= 0 && !canUnlock(state, index)) return 0;
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
  return state.viewsThisRun >= state.nextPrestigeAt;
}

export function prestigeGain(runViews: number): number {
  if (runViews < PRESTIGE_AT) return 0;
  return Math.max(0.25, Math.log10(runViews) - 5);
}

export function prestige(state: GameState): number {
  if (!canPrestige(state)) return 0;
  const gain = prestigeGain(state.viewsThisRun);
  if (gain <= 0) return 0;
  state.prestigeMult += gain;
  state.tiktokUnlocked = true;
  state.views = 0;
  state.viewsThisRun = 0;
  state.nextPrestigeAt *= PRESTIGE_SCALE;
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

export function ownedCount(state: GameState, planet: PlanetId = state.planet): number {
  return state.businesses[planet].filter((row) => row.owned > 0).length;
}

export function timeToRankSec(state: GameState, index: number): number | null {
  const def = BUSINESSES[state.planet][index];
  const row = state.businesses[state.planet][index];
  if (!def || !row) return null;
  const next = nextMilestone(row.owned);
  if (next === null) return null;
  const cost = buyCost(def.baseCost, def.costMult, row.owned, next - row.owned);
  const vps = globalViewsPerSec(state);
  if (vps <= 0) return null;
  return cost / vps;
}

export function lockIndex(state: GameState): number | null {
  const rows = state.businesses[state.planet];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].owned > 0) continue;
    if (i === 0 || rows[i - 1].owned > 0) return i;
    return null;
  }
  return null;
}

export function adviseFarm(state: GameState, mode: BuyMode): FarmAdvice {
  const defs = BUSINESSES[state.planet];
  const rows = state.businesses[state.planet];
  const badges: RowBadge[] = defs.map(() => null);

  let bestIndex: number | null = null;
  let bestScore = -1;
  for (let i = 0; i < defs.length; i++) {
    if (!canUnlock(state, i) && rows[i].owned <= 0) continue;
    const quote = quotedBuy(state, i, mode);
    if (!quote.canBuy || quote.count <= 0) continue;
    const before = potentialVps(state.planet, i, rows[i].owned, state.prestigeMult);
    const after = potentialVps(state.planet, i, rows[i].owned + quote.count, state.prestigeMult);
    const score = (after - before) / quote.cost;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  const lock = lockIndex(state);

  let slowIndex: number | null = null;
  const owned = rows
    .map((row, index) => ({ row, index }))
    .filter((item) => item.row.owned > 0);
  const climbing = owned.filter((item) => nextMilestone(item.row.owned) !== null);
  if (climbing.length > 0) {
    let worst = -1;
    for (const item of climbing) {
      const eta = timeToRankSec(state, item.index);
      const rank = eta === null ? Number.POSITIVE_INFINITY : eta;
      if (rank > worst) {
        worst = rank;
        slowIndex = item.index;
      }
    }
  } else {
    const unmanaged = owned.find((item) => !item.row.manager);
    slowIndex = unmanaged ? unmanaged.index : null;
  }

  if (bestIndex !== null) badges[bestIndex] = "best";
  if (lock !== null && badges[lock] === null) badges[lock] = "lock";
  if (slowIndex !== null && badges[slowIndex] === null) badges[slowIndex] = "slow";

  return { bestIndex, lockIndex: lock, slowIndex, badges };
}

export function defaultSelected(state: GameState, mode: BuyMode): number {
  const advice = adviseFarm(state, mode);
  if (advice.bestIndex !== null) return advice.bestIndex;
  if (advice.lockIndex !== null) return advice.lockIndex;
  const rows = state.businesses[state.planet];
  const firstOwned = rows.findIndex((row) => row.owned > 0);
  return firstOwned >= 0 ? firstOwned : 0;
}

export function readStorage(storage: Storage = localStorage): GameState {
  return loadGame(storage.getItem(SAVE_KEY));
}
