import { describe, expect, it } from "vitest";
import { BUSINESSES, EVENT_PERIOD_MS, EVENTS, PRESTIGE_AT, SAVE_KEY } from "./data";
import {
  adviseFarm,
  algo,
  applyOffline,
  buy,
  buyBest,
  buyScore,
  buyCost,
  canAlgo,
  canPrestige,
  claimChest,
  claimEventDrop,
  claimEventShop,
  claimPass,
  currentEvent,
  cycleIncome,
  defaultSelected,
  effectiveCycleSec,
  extraEventVps,
  exportSave,
  hireAllAffordable,
  hireManager,
  importSave,
  loadGame,
  maxAffordable,
  milestoneMult,
  newGame,
  newTapSession,
  offerComebackChest,
  parseBuyMode,
  potentialVps,
  prestige,
  prestigeGain,
  quotedBuy,
  resolveBuyCount,
  saveGame,
  setPlanet,
  startCycle,
  tapBar,
  tick,
  viewsPerSec,
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

describe("buy bar", () => {
  it("parses every chip", () => {
    expect(parseBuyMode("1")).toBe(1);
    expect(parseBuyMode("10")).toBe(10);
    expect(parseBuyMode("100")).toBe(100);
    expect(parseBuyMode("max")).toBe("max");
    expect(parseBuyMode("rank")).toBe("rank");
    expect(parseBuyMode("nope")).toBe(1);
  });

  it("never buys past the next rank", () => {
    const state = newGame();
    state.businesses.youtube[0].owned = 23;
    state.views = 1_000_000;
    const bought = buy(state, 0, "rank");
    expect(bought).toBe(2);
    expect(state.businesses.youtube[0].owned).toBe(25);
  });

  it("buys a partial gap toward the next rank", () => {
    const state = newGame();
    state.businesses.youtube[0].owned = 20;
    const def = BUSINESSES.youtube[0];
    const three = buyCost(def.baseCost, def.costMult, 20, 3);
    state.views = three * 1.001;
    const bought = buy(state, 0, "rank");
    expect(bought).toBe(3);
    expect(state.businesses.youtube[0].owned).toBe(23);
  });

  it("treats 100 as all-or-nothing", () => {
    const state = newGame();
    const def = BUSINESSES.youtube[0];
    state.views = buyCost(def.baseCost, def.costMult, 1, 50);
    expect(resolveBuyCount(state, 0, 100)).toBe(100);
    expect(buy(state, 0, 100)).toBe(0);
    expect(state.businesses.youtube[0].owned).toBe(1);
  });

  it("makes maxed RANK behave like MAX", () => {
    const state = newGame();
    state.businesses.youtube[0].owned = 1000;
    state.views = 1e12;
    expect(resolveBuyCount(state, 0, "rank")).toBe(resolveBuyCount(state, 0, "max"));
    expect(quotedBuy(state, 0, "rank").gap).toBeNull();
  });

  it("does not buy a locked later business", () => {
    const state = newGame();
    state.views = 1_000_000;
    expect(buy(state, 2, 1)).toBe(0);
    expect(state.businesses.youtube[2].owned).toBe(0);
  });
});

describe("cycle speed", () => {
  it("halves only at 25 / 100 / 400 / 1000 and floors at 0.25s", () => {
    expect(effectiveCycleSec(0.6, 1)).toBeCloseTo(0.6, 8);
    expect(effectiveCycleSec(0.6, 24)).toBeCloseTo(0.6, 8);
    expect(effectiveCycleSec(0.6, 25)).toBeCloseTo(0.3, 8);
    expect(effectiveCycleSec(0.6, 50)).toBeCloseTo(0.3, 8);
    expect(effectiveCycleSec(0.6, 100)).toBe(0.25);
    expect(effectiveCycleSec(0.6, 400)).toBe(0.25);
    expect(effectiveCycleSec(0.6, 1000)).toBe(0.25);

    expect(effectiveCycleSec(24, 1)).toBeCloseTo(24, 8);
    expect(effectiveCycleSec(24, 24)).toBeCloseTo(24, 8);
    expect(effectiveCycleSec(24, 25)).toBeCloseTo(12, 8);
    expect(effectiveCycleSec(24, 50)).toBeCloseTo(12, 8);
    expect(effectiveCycleSec(24, 100)).toBeCloseTo(6, 8);
    expect(effectiveCycleSec(24, 400)).toBeCloseTo(3, 8);
    expect(effectiveCycleSec(24, 1000)).toBeCloseTo(1.5, 8);
    expect(effectiveCycleSec(24, 1000)).toBeGreaterThan(0.25);
  });

  it("still doubles income at every milestone", () => {
    expect(milestoneMult(50)).toBe(4);
    expect(effectiveCycleSec(0.6, 50)).toBeCloseTo(effectiveCycleSec(0.6, 25), 8);
  });

  it("pays tick and VPS from the effective cycle", () => {
    const state = newGame();
    state.businesses.youtube[0].owned = 25;
    state.businesses.youtube[0].manager = true;
    state.businesses.youtube[0].running = true;
    const income = cycleIncome("youtube", 0, 25, 1);
    expect(viewsPerSec(state)).toBeCloseTo(income / 0.3, 8);
    tick(state, 0.29);
    expect(state.views).toBe(0);
    tick(state, 0.02);
    expect(state.views).toBeCloseTo(income, 8);
  });

  it("uses the same helper for offline payout", () => {
    const state = newGame(1_000);
    state.businesses.youtube[0].owned = 25;
    state.businesses.youtube[0].manager = true;
    state.businesses.youtube[0].running = true;
    state.lastTs = 1_000;
    const income = cycleIncome("youtube", 0, 25, 1);
    const { earned } = applyOffline(state, 1_000 + 45_000);
    expect(earned).toBeCloseTo((income / 0.3) * 45, 5);
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

describe("refresh nudge", () => {
  it("starts an unmanaged cycle and does not start a managed one", () => {
    const state = newGame();
    const session = newTapSession();
    expect(tapBar(state, 0, session, 1_000)).toBe("start");
    expect(state.businesses.youtube[0].running).toBe(true);
    expect(startCycle(state, 0)).toBe(false);

    const managed = newGame();
    managed.views = 10_000;
    hireManager(managed, 0);
    const before = managed.businesses.youtube[0].progress;
    expect(tapBar(managed, 0, session, 2_000)).toBe("nudge");
    expect(managed.businesses.youtube[0].progress).toBeCloseTo(before + 0.15, 8);
    expect(startCycle(managed, 0)).toBe(false);
  });

  it("caps four nudges per cycle and cools down", () => {
    const state = newGame();
    state.views = 10_000;
    hireManager(state, 0);
    const session = newTapSession();
    expect(tapBar(state, 0, session, 1_000)).toBe("nudge");
    expect(tapBar(state, 0, session, 1_100)).toBe("none");
    expect(tapBar(state, 0, session, 1_200)).toBe("nudge");
    expect(tapBar(state, 0, session, 1_400)).toBe("nudge");
    expect(tapBar(state, 0, session, 1_600)).toBe("nudge");
    expect(tapBar(state, 0, session, 1_800)).toBe("none");
    expect(state.businesses.youtube[0].progress).toBeCloseTo(0.6, 8);
  });

  it("leaves the offline path on manager VPS only", () => {
    const state = newGame(1_000);
    state.businesses.youtube[0].manager = true;
    state.businesses.youtube[0].running = true;
    state.businesses.youtube[0].progress = 0.9;
    state.lastTs = 1_000;
    const session = newTapSession();
    tapBar(state, 0, session, 1_000);
    const { earned, offlineMs } = applyOffline(state, 1_000 + 60_000);
    expect(offlineMs).toBe(60_000);
    expect(earned).toBeGreaterThan(0);
    expect(earned).toBeCloseTo(viewsPerSec(state) * 60, 5);
  });
});

describe("outside advice", () => {
  it("picks an affordable BEST and ignores locked rows", () => {
    const state = newGame();
    state.views = 80;
    const advice = adviseFarm(state, 1);
    expect(advice.bestIndex).toBe(0);
    expect(advice.lockIndex).toBe(1);
    expect(advice.badges[0]).toBe("best");
    expect(advice.badges[1]).toBe("lock");
    expect(advice.badges[2]).toBeNull();
    expect(defaultSelected(state, 1)).toBe(0);
  });

  it("has no BEST when broke", () => {
    const state = newGame();
    state.views = 0;
    const advice = adviseFarm(state, 1);
    expect(advice.bestIndex).toBeNull();
    expect(advice.lockIndex).toBe(1);
  });

  it("scores RANK copies that cross a milestone higher", () => {
    const state = newGame();
    state.businesses.youtube[0].owned = 24;
    state.views = 10_000;
    const advice = adviseFarm(state, "rank");
    expect(advice.bestIndex).toBe(0);
    const before = potentialVps("youtube", 0, 24, 1);
    const after = potentialVps("youtube", 0, 25, 1);
    expect(after).toBeGreaterThan(before * 2);
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
    expect(state.viewsThisRun).toBe(earned);
  });

  it("unlocks TikTok with a starter clip and re-locks prestige", () => {
    const state = newGame();
    expect(canPrestige(state)).toBe(false);
    state.lifetimeViews = PRESTIGE_AT;
    state.viewsThisRun = PRESTIGE_AT;
    expect(canPrestige(state)).toBe(true);
    const gain = prestige(state);
    expect(gain).toBe(prestigeGain(PRESTIGE_AT));
    expect(state.tiktokUnlocked).toBe(true);
    expect(state.planet).toBe("tiktok");
    expect(state.views).toBe(0);
    expect(state.viewsThisRun).toBe(0);
    expect(state.nextPrestigeAt).toBe(PRESTIGE_AT * 10);
    expect(state.businesses.tiktok[0].owned).toBe(1);
    expect(state.prestigeMult).toBeGreaterThan(1);
    expect(canPrestige(state)).toBe(false);
    const stacked = state.prestigeMult;
    expect(prestige(state)).toBe(0);
    expect(state.prestigeMult).toBe(stacked);
  });

  it("pays this-run gain, not the lifetime snapshot", () => {
    const state = newGame();
    state.lifetimeViews = 1e9;
    state.viewsThisRun = PRESTIGE_AT;
    state.nextPrestigeAt = PRESTIGE_AT;
    const gain = prestige(state);
    expect(gain).toBe(prestigeGain(PRESTIGE_AT));
    expect(gain).toBeLessThan(prestigeGain(1e9));
  });

  it("unlocks again after this-run earnings hit the next bar", () => {
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    state.lifetimeViews = PRESTIGE_AT;
    prestige(state);
    expect(canPrestige(state)).toBe(false);
    state.viewsThisRun = state.nextPrestigeAt;
    expect(canPrestige(state)).toBe(true);
    const before = state.prestigeMult;
    expect(prestige(state)).toBeGreaterThan(0);
    expect(state.prestigeMult).toBeGreaterThan(before);
    expect(canPrestige(state)).toBe(false);
  });

  it("survives a bad save", () => {
    const fresh = loadGame("nope");
    expect(fresh.planet).toBe("youtube");
    expect(fresh.businesses.youtube[0].owned).toBe(1);
    expect(fresh.v).toBe(3);
    expect(fresh.viewsThisRun).toBe(0);
    expect(fresh.nextPrestigeAt).toBe(PRESTIGE_AT);
  });

  it("hydrates a never-prestiged v1 save with first-bar progress", () => {
    const loaded = loadGame(
      JSON.stringify({
        v: 1,
        views: 12,
        lifetimeViews: 400_000,
        prestigeMult: 1,
        tiktokUnlocked: false,
        planet: "youtube",
        businesses: { youtube: [{ owned: 3, manager: false, progress: 0, running: false }] },
        lastTs: 1,
      }),
    );
    expect(loaded.v).toBe(3);
    expect(loaded.viewsThisRun).toBe(400_000);
    expect(loaded.nextPrestigeAt).toBe(PRESTIGE_AT);
    expect(canPrestige(loaded)).toBe(false);
  });

  it("re-locks already-prestiged v1 saves", () => {
    const loaded = loadGame(
      JSON.stringify({
        v: 1,
        views: 0,
        lifetimeViews: 5_000_000,
        prestigeMult: 3.25,
        tiktokUnlocked: true,
        planet: "tiktok",
        lastTs: 1,
      }),
    );
    expect(loaded.viewsThisRun).toBe(0);
    expect(loaded.nextPrestigeAt).toBe(PRESTIGE_AT);
    expect(loaded.prestigeMult).toBe(3.25);
    expect(canPrestige(loaded)).toBe(false);
    expect(prestige(loaded)).toBe(0);
  });

  it("keeps stored v2 run meters", () => {
    const loaded = loadGame(
      JSON.stringify({
        v: 2,
        views: 10,
        lifetimeViews: 2_000_000,
        viewsThisRun: 250_000,
        nextPrestigeAt: 10_000_000,
        prestigeMult: 2,
        tiktokUnlocked: true,
        planet: "tiktok",
        lastTs: 1,
      }),
    );
    expect(loaded.viewsThisRun).toBe(250_000);
    expect(loaded.nextPrestigeAt).toBe(10_000_000);
    expect(canPrestige(loaded)).toBe(false);
  });

  it("keeps the same localStorage key", () => {
    expect(SAVE_KEY).toBe("slop-capitalist.v1");
  });

  it("unlocks The Simulation on the second prestige with a starter clip", () => {
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    state.lifetimeViews = PRESTIGE_AT;
    prestige(state);
    expect(state.simulationUnlocked).toBe(false);
    expect(state.planet).toBe("tiktok");
    expect(setPlanet(state, "simulation")).toBe(false);
    state.viewsThisRun = state.nextPrestigeAt;
    const gain = prestige(state);
    expect(gain).toBeGreaterThan(0);
    expect(state.simulationUnlocked).toBe(true);
    expect(state.planet).toBe("simulation");
    expect(state.businesses.simulation[0].owned).toBe(1);
    expect(state.views).toBe(0);
    expect(canPrestige(state)).toBe(false);
    expect(setPlanet(state, "simulation")).toBe(true);
  });

  it("does not softlock The Simulation starter", () => {
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    state.lifetimeViews = PRESTIGE_AT;
    prestige(state);
    state.viewsThisRun = state.nextPrestigeAt;
    prestige(state);
    expect(state.planet).toBe("simulation");
    for (let i = 0; i < 3; i++) {
      startCycle(state, 0);
      tick(state, 1.1);
    }
    expect(buy(state, 0, 1)).toBe(1);
    expect(state.businesses.simulation[0].owned).toBe(2);
  });

  it("hydrates a twice-prestiged v2 save onto The Simulation", () => {
    const loaded = loadGame(
      JSON.stringify({
        v: 2,
        views: 0,
        lifetimeViews: 20_000_000,
        viewsThisRun: 0,
        nextPrestigeAt: 100_000_000,
        prestigeMult: 4,
        tiktokUnlocked: true,
        planet: "tiktok",
        lastTs: 1,
      }),
    );
    expect(loaded.v).toBe(3);
    expect(loaded.simulationUnlocked).toBe(true);
    expect(loaded.businesses.simulation[0].owned).toBe(1);
    expect(loaded.event.clout).toBe(0);
    expect(loaded.pass.claimed).toEqual([]);
  });
});

describe("managers from any planet", () => {
  it("hires on a planet you are not looking at", () => {
    const state = newGame();
    state.tiktokUnlocked = true;
    state.businesses.tiktok[0].owned = 1;
    state.views = 51_000_000;
    state.planet = "youtube";
    expect(hireManager(state, 0, "tiktok")).toBe(true);
    expect(state.businesses.tiktok[0].manager).toBe(true);
    expect(state.businesses.youtube[0].manager).toBe(false);
    expect(hireManager(state, 0)).toBe(true);
    expect(state.businesses.youtube[0].manager).toBe(true);
  });
});

describe("event + pass", () => {
  it("rotates drops on the local clock", () => {
    expect(currentEvent(1).def.id).toBe(EVENTS[0].id);
    expect(currentEvent(EVENT_PERIOD_MS + 1).def.id).toBe(EVENTS[1].id);
    expect(currentEvent(EVENT_PERIOD_MS * 2 + 1).def.id).toBe(EVENTS[2].id);
  });

  it("applies the live bonus only when a wall clock is passed", () => {
    const baseline = newGame();
    baseline.businesses.youtube[0].manager = true;
    baseline.businesses.youtube[0].running = true;
    tick(baseline, 0.6);
    expect(baseline.views).toBeCloseTo(1, 8);

    const live = newGame();
    live.businesses.youtube[0].manager = true;
    live.businesses.youtube[0].running = true;
    const now = 1;
    tick(live, 0.6, undefined, now);
    const extra = extraEventVps(1, EVENTS[0]) * 0.6;
    expect(live.views).toBeCloseTo(1 * EVENTS[0].bonusMult + extra, 5);
    expect(live.event.clout).toBeGreaterThan(0);
  });

  it("persists event claims, clout, and pass unlocks", () => {
    const state = newGame();
    const now = 1;
    expect(claimEventDrop(state, now)).toBe(EVENTS[0].dropViews);
    expect(claimEventDrop(state, now)).toBe(0);
    state.event.clout = 40;
    expect(claimEventShop(state, "sticker")?.id).toBe("sticker");
    expect(state.title).toBe("Trend Touched");
    expect(claimEventShop(state, "sticker")).toBeNull();
    state.lifetimeViews = 10_000;
    expect(claimPass(state, "intern")?.id).toBe("intern");
    expect(state.title).toBe("Thumbnail Intern");
    expect(claimPass(state, "intern")).toBeNull();

    const loaded = loadGame(saveGame(state));
    expect(loaded.v).toBe(3);
    expect(loaded.event.claimedDropId).toBe(EVENTS[0].id);
    expect(loaded.event.claimed).toContain("sticker");
    expect(loaded.event.clout).toBeCloseTo(35, 8);
    expect(loaded.pass.claimed).toContain("intern");
    expect(loaded.title).toBe("Thumbnail Intern");
    expect(claimEventDrop(loaded, now)).toBe(0);
    expect(claimPass(loaded, "intern")).toBeNull();
  });

  it("hydrates missing event and pass fields on old saves", () => {
    const loaded = loadGame(
      JSON.stringify({
        v: 2,
        views: 40,
        lifetimeViews: 400_000,
        viewsThisRun: 400_000,
        nextPrestigeAt: PRESTIGE_AT,
        prestigeMult: 1,
        tiktokUnlocked: false,
        planet: "youtube",
        lastTs: 1,
      }),
    );
    expect(loaded.views).toBe(40);
    expect(loaded.viewsThisRun).toBe(400_000);
    expect(loaded.event.clout).toBe(0);
    expect(loaded.pass.claimed).toEqual([]);
    expect(loaded.simulationUnlocked).toBe(false);
    expect(loaded.title).toBe("");
  });
});

describe("BEST is honest", () => {
  it("the badged row has the strictly best ΔVPS/cost", () => {
    const state = newGame();
    state.views = 5_000;
    state.businesses.youtube[0].owned = 8;
    const advice = adviseFarm(state, 1);
    expect(advice.bestIndex).not.toBeNull();
    const winner = buyScore(state, advice.bestIndex!, 1);
    expect(winner).not.toBeNull();
    for (let i = 0; i < BUSINESSES.youtube.length; i++) {
      if (i === advice.bestIndex) continue;
      const score = buyScore(state, i, 1);
      if (score === null) continue;
      expect(winner!).toBeGreaterThan(score);
    }
  });

  it("never badges a locked or unaffordable row as BEST", () => {
    const state = newGame();
    state.views = 50;
    const advice = adviseFarm(state, 1);
    expect(advice.bestIndex).toBe(0);
    expect(buyScore(state, 2, 1)).toBeNull();
    expect(advice.badges[2]).not.toBe("best");
  });

  it("RANK into a milestone beats dumping into a worse ROI row", () => {
    const state = newGame();
    state.businesses.youtube[0].owned = 24;
    state.businesses.youtube[1].owned = 1;
    state.views = 10_000;
    const rankAdvice = adviseFarm(state, "rank");
    const s0 = buyScore(state, 0, "rank");
    const s1 = buyScore(state, 1, "rank");
    expect(s0).not.toBeNull();
    expect(s1).not.toBeNull();
    expect(rankAdvice.bestIndex).toBe(s0! >= s1! ? 0 : 1);
    expect(buyScore(state, rankAdvice.bestIndex!, "rank")).toBe(Math.max(s0!, s1!));
  });

  it("buyBest purchases exactly the winning row", () => {
    const state = newGame();
    state.views = 80;
    const advice = adviseFarm(state, 1);
    const before = state.businesses.youtube.map((row) => row.owned);
    const result = buyBest(state, 1);
    expect(result).not.toBeNull();
    expect(result!.index).toBe(advice.bestIndex);
    expect(state.businesses.youtube[result!.index].owned).toBe(before[result!.index] + result!.count);
    for (let i = 0; i < before.length; i++) {
      if (i === result!.index) continue;
      expect(state.businesses.youtube[i].owned).toBe(before[i]);
    }
  });
});

describe("hire all + extras", () => {
  it("hires every affordable manager cheapest first", () => {
    const state = newGame();
    state.businesses.youtube[0].owned = 1;
    state.businesses.youtube[1].owned = 1;
    state.views = 16_000;
    const n = hireAllAffordable(state);
    expect(n).toBe(2);
    expect(state.businesses.youtube[0].manager).toBe(true);
    expect(state.businesses.youtube[1].manager).toBe(true);
    expect(state.views).toBe(16_000 - 1_000 - 15_000);
  });

  it("opens a comeback chest after a long away and claims it once", () => {
    const state = newGame(1_000);
    state.businesses.youtube[0].manager = true;
    state.businesses.youtube[0].running = true;
    state.lastTs = 1_000;
    const { earned, offlineMs } = applyOffline(state, 1_000 + 120_000);
    const chest = offerComebackChest(state, earned, offlineMs);
    expect(chest).toBeGreaterThan(0);
    expect(state.pendingChest?.views).toBe(chest);
    const claimed = claimChest(state);
    expect(claimed).toBe(chest);
    expect(claimChest(state)).toBe(0);
  });

  it("locks algo until viral is high, then resets viral and keeps algo", () => {
    const state = newGame();
    expect(canAlgo(state)).toBe(false);
    expect(algo(state)).toBe(0);
    state.prestigeMult = 3;
    expect(canAlgo(state)).toBe(true);
    const gain = algo(state);
    expect(gain).toBeGreaterThan(0);
    expect(state.prestigeMult).toBe(1);
    expect(state.algoMult).toBeGreaterThan(1);
    expect(state.simulationUnlocked).toBe(true);
    expect(canAlgo(state)).toBe(false);
    expect(algo(state)).toBe(0);
  });

  it("exports and imports the same farm", () => {
    const state = newGame();
    state.views = 1234;
    state.prestigeMult = 2.5;
    const raw = exportSave(state);
    const loaded = importSave(raw);
    expect(loaded).not.toBeNull();
    expect(loaded!.views).toBe(1234);
    expect(loaded!.prestigeMult).toBe(2.5);
    expect(importSave("nope")).toBeNull();
  });

  it("keeps this-run prestige lock after extras", () => {
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    prestige(state);
    expect(canPrestige(state)).toBe(false);
    expect(prestige(state)).toBe(0);
  });
});

