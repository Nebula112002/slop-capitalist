import {
  ALGO_AT,
  ALGO_PRESTIGE_AT,
  BUSINESSES,
  CLOUT_PER_VIEWS,
  IDLE_CHEST_MAX_RANK,
  EVENT_PERIOD_MS,
  EVENT_SHOP,
  EVENTS,
  HYPE_BASE,
  HYPE_DAMP,
  HYPE_LOG,
  HYPE_SHOP,
  MILESTONES,
  MIN_CYCLE_SEC,
  NUDGE_COOLDOWN_MS,
  NUDGE_PER_CYCLE,
  NUDGE_PROGRESS,
  OFFLINE_CAP_MS,
  PASS_TIERS,
  PLANET_IDS,
  PLANETS,
  PRESTIGE_AT,
  PRESTIGE_LATE_SCALE,
  PRESTIGE_SCALE,
  PRESTIGE_SIM_AT,
  PRESTIGE_TIKTOK_AT,
  SAVE_KEY,
  SAVE_VERSION,
  SHOP_MGR_CUT,
  SHOP_OFFLINE_MS,
  SHOP_STARTER_EACH,
  SHOP_TEMPO_CUT,
  SHOP_VIRAL_PER,
  SPEED_CUT,
  SPEED_MARKS,
  emptyShop,
  type EventDef,
  type EventShopItem,
  type HypeShopId,
  type PassTier,
  type PlanetId,
  type RewardKind,
  type ShopLevels,
} from "./data";
import {
  chestUpgradeCost,
  clampChestRank,
  fillIdleChest,
  shouldOfferIdleChest,
  type IdleChestPreview,
} from "./idle-chest";
import { saveKeyFor } from "./users";

export type BuyMode = 1 | 10 | 100 | "max" | "rank";

export type BusinessRuntime = {
  owned: number;
  manager: boolean;
  progress: number;
  running: boolean;
};

export type EventSave = {
  id: string;
  endsAt: number;
  clout: number;
  claimed: string[];
  claimedDropId: string;
};

export type PassSave = {
  claimed: string[];
};

export type GameState = {
  v: number;
  views: number;
  lifetimeViews: number;
  viewsThisRun: number;
  nextPrestigeAt: number;
  prestigeMult: number;
  prestigeCount: number;
  hype: number;
  shop: ShopLevels;
  algoMult: number;
  algoCount: number;
  tiktokUnlocked: boolean;
  simulationUnlocked: boolean;
  title: string;
  planet: PlanetId;
  businesses: Record<PlanetId, BusinessRuntime[]>;
  event: EventSave;
  pass: PassSave;
  pendingChest: { views: number; offlineMs: number } | null;
  chestRank: number;
  muted: boolean;
  seenTooltip: boolean;
  playMs: number;
  stats: {
    buys: number;
    managersHired: number;
    bestBuys: number;
    taps: number;
    chests: number;
  };
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
  bestScore: number | null;
  lockIndex: number | null;
  slowIndex: number | null;
  badges: RowBadge[];
};

export type LiveEvent = {
  def: EventDef;
  startedAt: number;
  endsAt: number;
};

function emptyBusinesses(planet: PlanetId, starterCopies = 0): BusinessRuntime[] {
  return BUSINESSES[planet].map((_, i) => ({
    owned: i === 0 ? starterCopies : 0,
    manager: false,
    progress: 0,
    running: false,
  }));
}

function emptyEvent(): EventSave {
  return { id: "", endsAt: 0, clout: 0, claimed: [], claimedDropId: "" };
}

function emptyPass(): PassSave {
  return { claimed: [] };
}

function emptyBoard(starterCopies = 1): Record<PlanetId, BusinessRuntime[]> {
  return {
    youtube: emptyBusinesses("youtube", starterCopies),
    tiktok: emptyBusinesses("tiktok"),
    simulation: emptyBusinesses("simulation"),
  };
}

export function newGame(now = Date.now()): GameState {
  return {
    v: SAVE_VERSION,
    views: 0,
    lifetimeViews: 0,
    viewsThisRun: 0,
    nextPrestigeAt: PRESTIGE_AT,
    prestigeMult: 1,
    prestigeCount: 0,
    hype: 0,
    shop: emptyShop(),
    algoMult: 1,
    algoCount: 0,
    tiktokUnlocked: false,
    simulationUnlocked: false,
    title: "",
    planet: "youtube",
    businesses: emptyBoard(),
    event: emptyEvent(),
    pass: emptyPass(),
    pendingChest: null,
    chestRank: 0,
    muted: false,
    seenTooltip: false,
    playMs: 0,
    stats: { buys: 0, managersHired: 0, bestBuys: 0, taps: 0, chests: 0 },
    lastTs: now,
  };
}

export function newTapSession(): TapSession {
  return { nudges: {} };
}

function isPlanetId(value: unknown): value is PlanetId {
  return value === "youtube" || value === "tiktok" || value === "simulation";
}

function hydrateBusinesses(
  planet: PlanetId,
  raw: unknown,
  starterCopies: number,
): BusinessRuntime[] {
  const fallback = emptyBusinesses(planet, starterCopies);
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
  return (
    Boolean(parsed.tiktokUnlocked) ||
    (Number(parsed.prestigeMult) || 1) > 1 ||
    (Number(parsed.prestigeCount) || 0) > 0 ||
    (Number(parsed.hype) || 0) > 0
  );
}

function inferPrestigeCount(parsed: Partial<GameState>): number {
  const stored = Math.max(0, Math.floor(Number(parsed.prestigeCount) || 0));
  if (stored > 0) return stored;
  if (parsed.simulationUnlocked || (Number(parsed.algoMult) || 1) > 1 || (Number(parsed.algoCount) || 0) > 0) {
    return 2;
  }
  if (alreadyPrestiged(parsed)) return 1;
  return 0;
}

export function prestigeThreshold(prestigeCount: number): number {
  if (prestigeCount <= 0) return PRESTIGE_AT;
  if (prestigeCount === 1) return PRESTIGE_TIKTOK_AT;
  if (prestigeCount === 2) return PRESTIGE_SIM_AT;
  return PRESTIGE_SIM_AT * PRESTIGE_LATE_SCALE ** (prestigeCount - 2);
}

function hydrateRunMeters(
  parsed: Partial<GameState>,
  prestigeCount: number,
): {
  viewsThisRun: number;
  nextPrestigeAt: number;
} {
  const floor = prestigeThreshold(prestigeCount);
  const hasRunFields =
    Number(parsed.v) >= 2 &&
    parsed.viewsThisRun !== undefined &&
    parsed.nextPrestigeAt !== undefined;
  let viewsThisRun: number;
  let storedNext: number;
  if (hasRunFields) {
    viewsThisRun = Math.max(0, Number(parsed.viewsThisRun) || 0);
    storedNext = Math.max(PRESTIGE_AT, Number(parsed.nextPrestigeAt) || PRESTIGE_AT);
  } else if (alreadyPrestiged(parsed)) {
    viewsThisRun = 0;
    storedNext = PRESTIGE_AT;
  } else {
    viewsThisRun = Math.max(0, Number(parsed.lifetimeViews) || 0);
    storedNext = PRESTIGE_AT;
  }
  return { viewsThisRun, nextPrestigeAt: Math.max(floor, storedNext) };
}

function hydrateEvent(raw: unknown): EventSave {
  const fallback = emptyEvent();
  if (!raw || typeof raw !== "object") return fallback;
  const row = raw as Partial<EventSave>;
  return {
    id: String(row.id ?? ""),
    endsAt: Math.max(0, Number(row.endsAt) || 0),
    clout: Math.max(0, Number(row.clout) || 0),
    claimed: Array.isArray(row.claimed) ? row.claimed.map(String) : [],
    claimedDropId: String(row.claimedDropId ?? ""),
  };
}

function hydratePass(raw: unknown): PassSave {
  if (!raw || typeof raw !== "object") return emptyPass();
  const row = raw as Partial<PassSave>;
  return {
    claimed: Array.isArray(row.claimed) ? row.claimed.map(String) : [],
  };
}

function hydrateShop(raw: unknown): ShopLevels {
  const fallback = emptyShop();
  if (!raw || typeof raw !== "object") return fallback;
  const row = raw as Partial<ShopLevels>;
  return {
    viral: Math.max(0, Math.floor(Number(row.viral) || 0)),
    tempo: Math.max(0, Math.floor(Number(row.tempo) || 0)),
    managers: Math.max(0, Math.floor(Number(row.managers) || 0)),
    offline: Math.max(0, Math.floor(Number(row.offline) || 0)),
    starter: Math.max(0, Math.floor(Number(row.starter) || 0)),
  };
}

function hydrateSimulationUnlocked(parsed: Partial<GameState>, prestigeCount: number, nextPrestigeAt: number): boolean {
  if (parsed.simulationUnlocked !== undefined) return Boolean(parsed.simulationUnlocked);
  if (prestigeCount >= 2) return true;
  return nextPrestigeAt >= PRESTIGE_AT * PRESTIGE_SCALE * PRESTIGE_SCALE;
}

export function loadGame(raw: string | null, now = Date.now()): GameState {
  if (!raw) return newGame(now);
  try {
    const parsed = JSON.parse(raw) as Partial<GameState> & {
      businesses?: Partial<Record<PlanetId, unknown>>;
    };
    const base = newGame(now);
    const prestigeCount = inferPrestigeCount(parsed);
    const run = hydrateRunMeters(parsed, prestigeCount);
    const simulationUnlocked = hydrateSimulationUnlocked(parsed, prestigeCount, run.nextPrestigeAt);
    const shop = hydrateShop(parsed.shop);
    const title =
      typeof parsed.title === "string"
        ? parsed.title
        : typeof (parsed as { pass?: { title?: string } }).pass?.title === "string"
          ? String((parsed as { pass?: { title?: string } }).pass?.title)
          : "";
    return {
      ...base,
      views: Math.max(0, Number(parsed.views) || 0),
      lifetimeViews: Math.max(0, Number(parsed.lifetimeViews) || 0),
      viewsThisRun: run.viewsThisRun,
      nextPrestigeAt: run.nextPrestigeAt,
      prestigeMult: Math.max(1, Number(parsed.prestigeMult) || 1),
      prestigeCount,
      hype: Math.max(0, Number(parsed.hype) || 0),
      shop,
      algoMult: Math.max(1, Number(parsed.algoMult) || 1),
      algoCount: Math.max(0, Math.floor(Number(parsed.algoCount) || 0)),
      tiktokUnlocked: Boolean(parsed.tiktokUnlocked) || prestigeCount >= 1,
      simulationUnlocked,
      title,
      planet: isPlanetId(parsed.planet) ? parsed.planet : "youtube",
      businesses: {
        youtube: hydrateBusinesses("youtube", parsed.businesses?.youtube, 1),
        tiktok: hydrateBusinesses("tiktok", parsed.businesses?.tiktok, parsed.tiktokUnlocked || prestigeCount >= 1 ? 1 : 0),
        simulation: hydrateBusinesses("simulation", parsed.businesses?.simulation, simulationUnlocked ? 1 : 0),
      },
      event: hydrateEvent(parsed.event),
      pass: hydratePass(parsed.pass),
      pendingChest:
        parsed.pendingChest && typeof parsed.pendingChest === "object" && Number(parsed.pendingChest.views) > 0
          ? {
              views: Math.max(0, Number(parsed.pendingChest.views) || 0),
              offlineMs: Math.max(0, Number(parsed.pendingChest.offlineMs) || 0),
            }
          : null,
      chestRank: clampChestRank(Number((parsed as { chestRank?: unknown }).chestRank) || 0),
      muted: Boolean(parsed.muted),
      seenTooltip: Boolean(parsed.seenTooltip),
      playMs: Math.max(0, Number(parsed.playMs) || 0),
      stats: {
        buys: Math.max(0, Math.floor(Number(parsed.stats?.buys) || 0)),
        managersHired: Math.max(0, Math.floor(Number(parsed.stats?.managersHired) || 0)),
        bestBuys: Math.max(0, Math.floor(Number(parsed.stats?.bestBuys) || 0)),
        taps: Math.max(0, Math.floor(Number(parsed.stats?.taps) || 0)),
        chests: Math.max(0, Math.floor(Number(parsed.stats?.chests) || 0)),
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

export function persist(state: GameState, storage: Storage = localStorage, username?: string): void {
  const raw = saveGame(state);
  if (username && username.trim()) {
    storage.setItem(saveKeyFor(username), raw);
    return;
  }
  storage.setItem(SAVE_KEY, raw);
}

export function milestoneRanks(owned: number): number {
  let n = 0;
  for (const mark of MILESTONES) {
    if (owned >= mark) n += 1;
  }
  return n;
}

export function speedRanks(owned: number): number {
  let n = 0;
  for (const mark of SPEED_MARKS) {
    if (owned >= mark) n += 1;
  }
  return n;
}

export function milestoneMult(owned: number): number {
  return 2 ** milestoneRanks(owned);
}

export function effectiveCycleSec(baseCycle: number, owned: number): number {
  return Math.max(MIN_CYCLE_SEC, baseCycle * SPEED_CUT ** speedRanks(owned));
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

export function starterOwned(state: GameState): number {
  return 1 + SHOP_STARTER_EACH * (state.shop?.starter ?? 0);
}

export function shopViralMult(state: GameState): number {
  return (1 + SHOP_VIRAL_PER) ** (state.shop?.viral ?? 0);
}

export function totalMult(state: GameState): number {
  return state.prestigeMult * Math.max(1, state.algoMult) * shopViralMult(state);
}

export function cycleSecFor(baseCycle: number, owned: number, tempoLevels = 0): number {
  return Math.max(MIN_CYCLE_SEC, effectiveCycleSec(baseCycle, owned) * SHOP_TEMPO_CUT ** tempoLevels);
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
  tempoLevels = 0,
): number {
  if (owned <= 0) return 0;
  const def = BUSINESSES[planet][index];
  return cycleIncome(planet, index, owned, prestigeMult) / cycleSecFor(def.cycleSec, owned, tempoLevels);
}

export function rowVps(state: GameState, index: number, planet: PlanetId = state.planet): number {
  const row = state.businesses[planet][index];
  if (!row || row.owned <= 0) return 0;
  if (!row.manager && !row.running) return 0;
  return potentialVps(planet, index, row.owned, totalMult(state), state.shop?.tempo ?? 0);
}

export function viewsPerSec(state: GameState, planet: PlanetId = state.planet): number {
  const defs = BUSINESSES[planet];
  let vps = 0;
  for (let i = 0; i < defs.length; i++) {
    vps += rowVps(state, i, planet);
  }
  return vps;
}

export function planetUnlocked(state: GameState, planet: PlanetId): boolean {
  if (planet === "youtube") return true;
  if (planet === "tiktok") return state.tiktokUnlocked;
  return state.simulationUnlocked;
}

export function unlockedPlanets(state: GameState): PlanetId[] {
  return PLANET_IDS.filter((planet) => planetUnlocked(state, planet));
}

export function currentEvent(now: number): LiveEvent {
  const slot = Math.floor(Math.max(0, now) / EVENT_PERIOD_MS);
  const def = EVENTS[((slot % EVENTS.length) + EVENTS.length) % EVENTS.length];
  const startedAt = slot * EVENT_PERIOD_MS;
  return { def, startedAt, endsAt: startedAt + EVENT_PERIOD_MS };
}

export function extraEventVps(prestigeMult: number, ev: EventDef): number {
  return (ev.extraIncome * prestigeMult * ev.bonusMult) / ev.extraCycleSec;
}

export function globalViewsPerSec(state: GameState, now = 0): number {
  let total = 0;
  for (const planet of unlockedPlanets(state)) {
    total += viewsPerSec(state, planet);
  }
  if (now > 0) {
    const live = currentEvent(now);
    total *= live.def.bonusMult;
    total += extraEventVps(totalMult(state), live.def);
  }
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

export function syncEvent(state: GameState, now: number): LiveEvent {
  const live = currentEvent(now);
  state.event.id = live.def.id;
  state.event.endsAt = live.endsAt;
  return live;
}

export function tick(state: GameState, dtSec: number, session?: TapSession, now = 0): number {
  if (dtSec <= 0) return 0;
  let earned = 0;
  const evMult = now > 0 ? currentEvent(now).def.bonusMult : 1;
  for (const planet of unlockedPlanets(state)) {
    const defs = BUSINESSES[planet];
    const rows = state.businesses[planet];
    for (let i = 0; i < defs.length; i++) {
      const row = rows[i];
      if (row.owned <= 0) continue;
      // Only managers run themselves. An unmanaged row runs the one cycle you
      // tapped for and then stops, which is the whole point of hiring anyone.
      if (row.manager) row.running = true;
      if (!row.running) continue;
      const cycle = cycleSecFor(defs[i].cycleSec, row.owned, state.shop?.tempo ?? 0);
      row.progress += dtSec / cycle;
      if (row.progress >= 1) {
        const cycles = Math.floor(row.progress);
        row.progress -= cycles;
        const payout = cycleIncome(planet, i, row.owned, totalMult(state)) * cycles * evMult;
        credit(state, payout);
        earned += payout;
        if (!row.manager) row.running = false;
        if (session) delete session.nudges[nudgeKey(planet, i)];
      }
    }
  }
  if (now > 0) {
    const live = syncEvent(state, now);
    const extra = extraEventVps(totalMult(state), live.def) * dtSec;
    credit(state, extra);
    earned += extra;
    if (earned > 0) state.event.clout += earned / CLOUT_PER_VIEWS;
  }
  return earned;
}

export function offlineCapMs(state: GameState): number {
  return OFFLINE_CAP_MS + SHOP_OFFLINE_MS * (state.shop?.offline ?? 0);
}

export function idleManagerVps(state: GameState): number {
  return globalViewsPerSec({
    ...state,
    businesses: {
      youtube: state.businesses.youtube.map((row) => ({ ...row, running: row.manager })),
      tiktok: state.businesses.tiktok.map((row) => ({ ...row, running: row.manager })),
      simulation: state.businesses.simulation.map((row) => ({ ...row, running: row.manager })),
    },
  });
}

export function idleEarnings(state: GameState, durationMs: number): number {
  const ms = Math.max(0, durationMs);
  if (ms < 1) return 0;
  return idleManagerVps(state) * (ms / 1000);
}

export function previewIdleChest(state: GameState, awayMs: number): IdleChestPreview {
  return fillIdleChest(awayMs, state.chestRank ?? 0, idleManagerVps(state));
}

export function applyOffline(
  state: GameState,
  now = Date.now(),
): { earned: number; offlineMs: number } {
  const elapsed = Math.max(0, now - (state.lastTs || now));
  const offlineMs = Math.min(elapsed, offlineCapMs(state));
  state.lastTs = now;
  if (offlineMs < 1000) return { earned: 0, offlineMs };
  const earned = idleEarnings(state, offlineMs);
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
  state.stats.buys += count;
  return count;
}

export function managerPrice(state: GameState, planet: PlanetId, index: number): number {
  const def = BUSINESSES[planet][index];
  if (!def) return 0;
  return def.managerCost * SHOP_MGR_CUT ** (state.shop?.managers ?? 0);
}

export function hireManager(state: GameState, index: number, planet: PlanetId = state.planet): boolean {
  const def = BUSINESSES[planet][index];
  const row = state.businesses[planet][index];
  if (!def || !row || row.manager || row.owned <= 0) return false;
  const cost = managerPrice(state, planet, index);
  if (state.views < cost) return false;
  state.views -= cost;
  row.manager = true;
  row.running = true;
  state.stats.managersHired += 1;
  return true;
}

export function canPrestige(state: GameState): boolean {
  return state.viewsThisRun >= state.nextPrestigeAt;
}

export function prestigeGain(runViews: number, prestigeCount = 0): number {
  if (runViews < prestigeThreshold(prestigeCount)) return 0;
  const over = Math.log10(runViews / PRESTIGE_AT);
  const raw = (HYPE_BASE + HYPE_LOG * over) / (1 + HYPE_DAMP * prestigeCount);
  return Math.max(0, Math.round(raw * 10) / 10);
}

export function nextPlanetName(state: GameState): string {
  if (!state.tiktokUnlocked) return "TikTok";
  if (!state.simulationUnlocked) return "The Simulation";
  return PLANETS.find((planet) => planet.id === state.planet)?.name ?? "the farm";
}

export function prestige(state: GameState): number {
  if (!canPrestige(state)) return 0;
  const gain = prestigeGain(state.viewsThisRun, state.prestigeCount);
  if (gain <= 0) return 0;
  const hadTiktok = state.tiktokUnlocked;
  state.hype += gain;
  state.prestigeCount += 1;
  state.tiktokUnlocked = true;
  if (hadTiktok) state.simulationUnlocked = true;
  state.views = 0;
  state.viewsThisRun = 0;
  state.nextPrestigeAt = prestigeThreshold(state.prestigeCount);
  state.planet = state.simulationUnlocked ? "simulation" : "tiktok";
  const copies = starterOwned(state);
  state.businesses.youtube = emptyBusinesses("youtube", copies);
  state.businesses.tiktok = emptyBusinesses("tiktok", copies);
  state.businesses.simulation = emptyBusinesses("simulation", state.simulationUnlocked ? copies : 0);
  return gain;
}

export function setPlanet(state: GameState, planet: PlanetId): boolean {
  if (!planetUnlocked(state, planet)) return false;
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
    const score = buyScore(state, i, mode);
    if (score === null) continue;
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

  return { bestIndex, bestScore: bestIndex === null ? null : bestScore, lockIndex: lock, slowIndex, badges };
}

export function buyScore(state: GameState, index: number, mode: BuyMode): number | null {
  const rows = state.businesses[state.planet];
  const row = rows[index];
  if (!row) return null;
  if (row.owned <= 0 && !canUnlock(state, index)) return null;
  const quote = quotedBuy(state, index, mode);
  if (!quote.canBuy || quote.count <= 0 || quote.cost <= 0) return null;
  const before = potentialVps(state.planet, index, row.owned, totalMult(state), state.shop?.tempo ?? 0);
  const after = potentialVps(state.planet, index, row.owned + quote.count, totalMult(state), state.shop?.tempo ?? 0);
  return (after - before) / quote.cost;
}

export function buyBest(state: GameState, mode: BuyMode): { index: number; count: number } | null {
  const advice = adviseFarm(state, mode);
  if (advice.bestIndex === null) return null;
  const count = buy(state, advice.bestIndex, mode);
  if (count <= 0) return null;
  state.stats.bestBuys += 1;
  return { index: advice.bestIndex, count };
}

export function defaultSelected(state: GameState, mode: BuyMode): number {
  const advice = adviseFarm(state, mode);
  if (advice.bestIndex !== null) return advice.bestIndex;
  const rows = state.businesses[state.planet];
  const firstOwned = rows.findIndex((row) => row.owned > 0);
  if (firstOwned >= 0) return firstOwned;
  if (advice.lockIndex !== null) return advice.lockIndex;
  return 0;
}

function grantReward(state: GameState, kind: RewardKind, amount?: number, title?: string): void {
  if (kind === "views") credit(state, amount ?? 0);
  if (kind === "mult") state.prestigeMult += amount ?? 0;
  if (kind === "title" && title) state.title = title;
}

export function claimEventDrop(state: GameState, now: number): number {
  const live = syncEvent(state, now);
  if (state.event.claimedDropId === live.def.id) return 0;
  state.event.claimedDropId = live.def.id;
  credit(state, live.def.dropViews);
  return live.def.dropViews;
}

export function claimEventShop(state: GameState, id: string): EventShopItem | null {
  const item = EVENT_SHOP.find((row) => row.id === id);
  if (!item) return null;
  if (state.event.claimed.includes(id) || state.event.clout < item.clout) return null;
  state.event.clout -= item.clout;
  state.event.claimed.push(id);
  grantReward(state, item.kind, item.amount, item.title);
  return item;
}

export function claimPass(state: GameState, id: string): PassTier | null {
  const tier = PASS_TIERS.find((row) => row.id === id);
  if (!tier) return null;
  if (state.pass.claimed.includes(id) || state.lifetimeViews < tier.at) return null;
  state.pass.claimed.push(id);
  grantReward(state, tier.kind, tier.amount, tier.title);
  return tier;
}

export function nextPassTier(state: GameState): PassTier | null {
  return PASS_TIERS.find((tier) => !state.pass.claimed.includes(tier.id)) ?? null;
}

export type ManagerSlot = {
  planet: PlanetId;
  index: number;
  name: string;
  managerName: string;
  cost: number;
  hired: boolean;
  owned: number;
  affordable: boolean;
};

export function managerSlots(state: GameState): ManagerSlot[] {
  const slots: ManagerSlot[] = [];
  for (const planet of unlockedPlanets(state)) {
    BUSINESSES[planet].forEach((def, index) => {
      const row = state.businesses[planet][index];
      slots.push({
        planet,
        index,
        name: def.name,
        managerName: def.managerName,
        cost: managerPrice(state, planet, index),
        hired: row.manager,
        owned: row.owned,
        affordable: !row.manager && row.owned > 0 && state.views >= managerPrice(state, planet, index),
      });
    });
  }
  return slots;
}

export function hireAllAffordable(state: GameState): number {
  const open = managerSlots(state)
    .filter((slot) => slot.owned > 0 && !slot.hired)
    .sort((a, b) => a.cost - b.cost);
  let hired = 0;
  for (const slot of open) {
    if (hireManager(state, slot.index, slot.planet)) hired += 1;
  }
  return hired;
}

export function canAlgo(state: GameState): boolean {
  return state.prestigeCount >= ALGO_PRESTIGE_AT || state.prestigeMult >= ALGO_AT;
}

export function algoGain(prestigeMult: number, prestigeCount = 0): number {
  const fromViral = Math.max(0, prestigeMult - 1) * 0.2;
  const fromCount = prestigeCount * 0.08;
  const gain = Math.max(0.15, fromViral + fromCount);
  if (prestigeMult < ALGO_AT && prestigeCount < ALGO_PRESTIGE_AT) return 0;
  return gain;
}

export function algo(state: GameState): number {
  if (!canAlgo(state)) return 0;
  const gain = algoGain(state.prestigeMult, state.prestigeCount);
  if (gain <= 0) return 0;
  state.algoMult += gain;
  state.algoCount += 1;
  state.prestigeMult = 1;
  state.simulationUnlocked = true;
  state.tiktokUnlocked = true;
  state.views = 0;
  state.viewsThisRun = 0;
  state.nextPrestigeAt = prestigeThreshold(state.prestigeCount);
  state.planet = "simulation";
  const copies = starterOwned(state);
  state.businesses.youtube = emptyBusinesses("youtube", copies);
  state.businesses.tiktok = emptyBusinesses("tiktok", copies);
  state.businesses.simulation = emptyBusinesses("simulation", copies);
  return gain;
}

export function claimChest(state: GameState): number {
  const pending = state.pendingChest;
  if (!pending || pending.views <= 0) return 0;
  credit(state, pending.views);
  state.stats.chests += 1;
  state.pendingChest = null;
  return pending.views;
}

export function offerComebackChest(state: GameState, offlineMs: number): number {
  const preview = previewIdleChest(state, offlineMs);
  if (!shouldOfferIdleChest(preview)) return state.pendingChest?.views ?? 0;
  const pending = state.pendingChest;
  if (pending && pending.views >= preview.views) return pending.views;
  state.pendingChest = { views: preview.views, offlineMs: preview.fillMs };
  return preview.views;
}

export function canBuyChestUpgrade(state: GameState): boolean {
  const rank = clampChestRank(state.chestRank ?? 0);
  if (rank >= IDLE_CHEST_MAX_RANK) return false;
  return state.views >= chestUpgradeCost(rank);
}

export function buyChestUpgrade(state: GameState): boolean {
  const rank = clampChestRank(state.chestRank ?? 0);
  if (rank >= IDLE_CHEST_MAX_RANK) return false;
  const cost = chestUpgradeCost(rank);
  if (state.views < cost) return false;
  state.views -= cost;
  state.chestRank = rank + 1;
  if (state.pendingChest) {
    const preview = previewIdleChest(state, state.pendingChest.offlineMs);
    if (preview.views > 0) {
      state.pendingChest = { views: preview.views, offlineMs: preview.fillMs };
    }
  }
  return true;
}

export type Recap = {
  views: number;
  lifetimeViews: number;
  viewsThisRun: number;
  vps: number;
  prestigeMult: number;
  algoMult: number;
  shopViral: number;
  hype: number;
  prestigeCount: number;
  algoCount: number;
  title: string;
  managers: number;
  playMs: number;
  chests: number;
  clout: number;
  passClaimed: number;
};

export function recap(state: GameState): Recap {
  let managers = 0;
  for (const planet of unlockedPlanets(state)) {
    managers += state.businesses[planet].filter((row) => row.manager).length;
  }
  return {
    views: state.views,
    lifetimeViews: state.lifetimeViews,
    viewsThisRun: state.viewsThisRun,
    vps: globalViewsPerSec(state),
    prestigeMult: state.prestigeMult,
    algoMult: state.algoMult,
    shopViral: shopViralMult(state),
    hype: state.hype,
    prestigeCount: state.prestigeCount,
    algoCount: state.algoCount,
    title: state.title,
    managers,
    playMs: state.playMs,
    chests: state.stats.chests,
    clout: state.event.clout,
    passClaimed: state.pass.claimed.length,
  };
}

export function exportSave(state: GameState): string {
  return JSON.stringify({ ...state, lastTs: Date.now() }, null, 2);
}

export function importSave(raw: string, now = Date.now()): GameState | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return loadGame(raw, now);
  } catch {
    return null;
  }
}

export function dismissTooltip(state: GameState): void {
  state.seenTooltip = true;
}

export function toggleMute(state: GameState): boolean {
  state.muted = !state.muted;
  return state.muted;
}

export function readStorage(storage: Storage = localStorage, username?: string): GameState {
  if (username && username.trim()) {
    return loadGame(storage.getItem(saveKeyFor(username)));
  }
  return loadGame(storage.getItem(SAVE_KEY));
}

export function shopItem(id: string) {
  return HYPE_SHOP.find((row) => row.id === id) ?? null;
}

export function shopLevel(state: GameState, id: HypeShopId): number {
  return state.shop?.[id] ?? 0;
}

export function shopCost(id: HypeShopId, level: number): number {
  const item = shopItem(id);
  if (!item) return 0;
  return item.baseCost * item.costMult ** level;
}

export function canBuyShop(state: GameState, id: HypeShopId): boolean {
  const item = shopItem(id);
  if (!item) return false;
  const level = shopLevel(state, id);
  if (level >= item.max) return false;
  return state.hype >= shopCost(id, level);
}

export function buyShop(state: GameState, id: string): boolean {
  const item = shopItem(id);
  if (!item) return false;
  if (!canBuyShop(state, item.id)) return false;
  const cost = shopCost(item.id, shopLevel(state, item.id));
  state.hype -= cost;
  state.shop[item.id] += 1;
  return true;
}
