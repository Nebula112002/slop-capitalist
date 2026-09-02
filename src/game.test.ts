import { describe, expect, it } from "vitest";
import { BUSINESSES, PRESTIGE_AT } from "./data";
import {
  applyOffline,
  buy,
  buyCost,
  canPrestige,
  cycleIncome,
  hireManager,
  loadGame,
  maxAffordable,
  milestoneMult,
  newGame,
  prestige,
  prestigeGain,
  startCycle,
  tick,
} from "./game";

describe("economy", () => {
  it("prices a geometric buy", () => {
    const def = BUSINESSES.youtube[0];
    const one = buyCost(def.baseCost, def.costMult, 1, 1);
    expect(one).toBeCloseTo(def.baseCost * def.costMult, 8);
    const ten = buyCost(def.baseCost, def.costMult, 0, 10);
    expect(ten).toBeGreaterThan(def.baseCost * 10);
  });

  it("finds max affordable copies", () => {
    const def = BUSINESSES.youtube[0];
    expect(maxAffordable(0, def.baseCost, def.costMult, 0)).toBe(0);
    expect(maxAffordable(3, def.baseCost, def.costMult, 0)).toBe(0);
    expect(maxAffordable(4, def.baseCost, def.costMult, 0)).toBe(1);
    expect(maxAffordable(10_000, def.baseCost, def.costMult, 1)).toBeGreaterThan(10);
  });

  it("doubles income at milestones", () => {
    expect(milestoneMult(24)).toBe(1);
    expect(milestoneMult(25)).toBe(2);
    expect(milestoneMult(50)).toBe(4);
    const base = cycleIncome("youtube", 0, 24, 1);
    const hit = cycleIncome("youtube", 0, 25, 1);
    expect(hit).toBeGreaterThan(base * 2);
  });
});

describe("loop", () => {
  it("pays out a clicked cycle", () => {
    const state = newGame();
    expect(state.businesses.youtube[0].owned).toBe(1);
    expect(startCycle(state, 0)).toBe(true);
    tick(state, 0.59);
    expect(state.views).toBe(0);
    tick(state, 0.02);
    expect(state.views).toBeGreaterThan(0);
    expect(state.businesses.youtube[0].running).toBe(false);
  });

  it("managers keep running", () => {
    const state = newGame();
    state.views = 10_000;
    expect(hireManager(state, 0)).toBe(true);
    tick(state, 3);
    expect(state.views).toBeGreaterThan(0);
    expect(state.businesses.youtube[0].running).toBe(true);
  });

  it("spends views on a buy", () => {
    const state = newGame();
    state.views = 1_000;
    const bought = buy(state, 0, 10);
    expect(bought).toBe(10);
    expect(state.businesses.youtube[0].owned).toBe(11);
    expect(state.views).toBeLessThan(1_000);
  });
});

describe("offline + prestige", () => {
  it("credits manager income while away", () => {
    const state = newGame(1_000);
    state.businesses.youtube[0].manager = true;
    state.businesses.youtube[0].running = true;
    state.lastTs = 1_000;
    const { earned, offlineMs } = applyOffline(state, 1_000 + 60_000);
    expect(offlineMs).toBe(60_000);
    expect(earned).toBeGreaterThan(0);
    expect(state.views).toBe(earned);
  });

  it("unlocks TikTok with a starter clip", () => {
    const state = newGame();
    expect(canPrestige(state)).toBe(false);
    state.lifetimeViews = PRESTIGE_AT;
    expect(canPrestige(state)).toBe(true);
    const gain = prestige(state);
    expect(gain).toBe(prestigeGain(PRESTIGE_AT));
    expect(state.tiktokUnlocked).toBe(true);
    expect(state.planet).toBe("tiktok");
    expect(state.views).toBe(0);
    expect(state.businesses.tiktok[0].owned).toBe(1);
    expect(state.prestigeMult).toBeGreaterThan(1);
  });

  it("survives a bad save", () => {
    const fresh = loadGame("nope");
    expect(fresh.planet).toBe("youtube");
    expect(fresh.businesses.youtube[0].owned).toBe(1);
  });
});
