/**
 * Offline economy probe. Prints how long an optimal player takes to hit
 * each unlock, prestige, and a fully-bought planet. Not a unit test.
 */
import {
  buyBest,
  buyCost,
  canPrestige,
  cycleIncome,
  globalViewsPerSec,
  hireAllAffordable,
  milestoneMult,
  newGame,
  potentialVps,
  prestigeGain,
  prestigeThreshold,
  shopCost,
  startCycle,
  tick,
} from "../src/game";
import { BUSINESSES, HYPE_SHOP, MILESTONES, PLANET_IDS, type PlanetId } from "../src/data";

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "inf";
  if (n < 1000) return n.toFixed(n < 10 && n % 1 ? 1 : 0);
  const units = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp"];
  let v = n;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)}${units[i]}`;
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec > 1e12) return "never";
  if (sec < 60) return `${sec.toFixed(1)}s`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)}m`;
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}h`;
  if (sec < 86400 * 30) return `${(sec / 86400).toFixed(1)}d`;
  return `${(sec / (86400 * 365)).toFixed(1)}y`;
}

function farmSnapshot(planet: PlanetId, owned: number, mult = 1, tempo = 0) {
  return BUSINESSES[planet].map((def, index) => {
    const vps = potentialVps(planet, index, owned, mult, tempo);
    const cost25 = buyCost(def.baseCost, def.costMult, 1, 24);
    const cost100 = buyCost(def.baseCost, def.costMult, 1, 99);
    const costToNext = buyCost(def.baseCost, def.costMult, 1, 1);
    return {
      name: def.name,
      base: def.baseCost,
      income: def.income,
      cycle: def.cycleSec,
      mgr: def.managerCost,
      vps1: potentialVps(planet, index, 1, mult, tempo),
      vps25: potentialVps(planet, index, 25, mult, tempo),
      vps100: potentialVps(planet, index, 100, mult, tempo),
      cost2: costToNext,
      cost25,
      cost100,
      payback1: def.baseCost / Math.max(1e-9, potentialVps(planet, index, 1, mult, tempo)),
      payback25: cost25 / Math.max(1e-9, potentialVps(planet, index, 25, mult, tempo)),
    };
  });
}

function printFarms(planet: PlanetId) {
  console.log(`\n=== ${planet} farms (1 prestigeMult) ===`);
  console.log(
    "name".padEnd(22),
    "cost1".padStart(8),
    "inc".padStart(8),
    "vps1".padStart(8),
    "vps25".padStart(8),
    "vps100".padStart(9),
    "→25".padStart(8),
    "mgr".padStart(8),
    "pb1".padStart(7),
  );
  for (const row of farmSnapshot(planet, 1)) {
    console.log(
      row.name.padEnd(22),
      fmt(row.base).padStart(8),
      fmt(row.income).padStart(8),
      fmt(row.vps1).padStart(8),
      fmt(row.vps25).padStart(8),
      fmt(row.vps100).padStart(9),
      fmt(row.cost25).padStart(8),
      fmt(row.mgr).padStart(8),
      fmtTime(row.payback1).padStart(7),
    );
  }
}

/** Optimal-ish run: keep bars running, buy BEST, hire when cheap. */
function grindToPrestige(maxSec = 7 * 24 * 3600): { sec: number; owned: number[]; vps: number; views: number } {
  const state = newGame(0);
  let sec = 0;
  const step = 0.25;
  let lastHire = -999;
  while (sec < maxSec && !canPrestige(state)) {
    for (let i = 0; i < 5; i++) {
      const row = state.businesses.youtube[i];
      if (row.owned > 0 && !row.manager && !row.running) startCycle(state, i);
    }
    tick(state, step, undefined, 0);
    buyBest(state, "rank") || buyBest(state, 1);
    if (sec - lastHire > 1) {
      if (hireAllAffordable(state) > 0) lastHire = sec;
    }
    sec += step;
    // Jump idle chunks once all owned rows are managed.
    const rows = state.businesses.youtube;
    const unmanaged = rows.some((row) => row.owned > 0 && !row.manager);
    if (!unmanaged && globalViewsPerSec(state) > 0) {
      const need = state.nextPrestigeAt - state.viewsThisRun;
      const vps = globalViewsPerSec(state);
      const wait = Math.min(30, Math.max(step, need / vps / 4));
      tick(state, wait, undefined, 0);
      buyBest(state, "rank") || buyBest(state, 1);
      hireAllAffordable(state);
      sec += wait;
    }
  }
  return {
    sec,
    owned: state.businesses.youtube.map((row) => row.owned),
    vps: globalViewsPerSec(state),
    views: state.viewsThisRun,
  };
}

function grindPlanet(planet: PlanetId, prestigeCount: number, maxSec = 30 * 24 * 3600) {
  const state = newGame(0);
  state.prestigeCount = prestigeCount;
  state.nextPrestigeAt = prestigeThreshold(prestigeCount);
  state.tiktokUnlocked = prestigeCount >= 1;
  state.simulationUnlocked = prestigeCount >= 2;
  state.planet = planet;
  if (planet !== "youtube") {
    const copies = 1;
    state.businesses[planet][0].owned = copies;
  }
  let sec = 0;
  const step = 0.25;
  while (sec < maxSec && !canPrestige(state)) {
    const rows = state.businesses[planet];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].owned > 0 && !rows[i].manager && !rows[i].running) startCycle(state, i);
    }
    tick(state, step, undefined, 0);
    buyBest(state, "rank") || buyBest(state, 1);
    hireAllAffordable(state);
    sec += step;
    const unmanaged = rows.some((row) => row.owned > 0 && !row.manager);
    if (!unmanaged && globalViewsPerSec(state) > 0) {
      const need = state.nextPrestigeAt - state.viewsThisRun;
      const vps = globalViewsPerSec(state);
      const wait = Math.min(60, Math.max(step, need / vps / 3));
      tick(state, wait, undefined, 0);
      buyBest(state, "rank") || buyBest(state, 1);
      hireAllAffordable(state);
      sec += wait;
    }
  }
  return {
    sec,
    owned: state.businesses[planet].map((row) => row.owned),
    vps: globalViewsPerSec(state),
    views: state.viewsThisRun,
    target: state.nextPrestigeAt,
    hired: state.businesses[planet].filter((row) => row.manager).length,
  };
}

function hypeTotals() {
  console.log("\n=== Hype shop total cost ===");
  let all = 0;
  for (const item of HYPE_SHOP) {
    let sum = 0;
    for (let lv = 0; lv < item.max; lv++) sum += shopCost(item.id, lv);
    all += sum;
    console.log(`${item.name.padEnd(16)} max ${item.max}  total ${fmt(sum)} hype`);
  }
  console.log(`ALL SHOP ${fmt(all)} hype`);
  console.log("\nPrestige payouts:");
  for (const n of [0, 1, 2, 3, 5, 10, 20]) {
    const at = prestigeThreshold(n);
    console.log(`  #${n} gate ${fmt(at)}  hype ${prestigeGain(at, n)}`);
  }
  const firstTen = Array.from({ length: 10 }, (_, n) => prestigeGain(prestigeThreshold(n), n)).reduce((a, b) => a + b, 0);
  console.log(`First 10 prestiges bank ~${fmt(firstTen)} hype (at-the-gate, no overshoot)`);
}

function milestoneTable() {
  console.log("\n=== Cursed Short rank cliffs ===");
  const def = BUSINESSES.youtube[0];
  let prev = 0;
  for (const mark of [1, 24, ...MILESTONES]) {
    const vps = potentialVps("youtube", 0, mark, 1, 0);
    const cycle = cycleIncome("youtube", 0, mark, 1);
    const costN = mark === 1 ? def.baseCost : buyCost(def.baseCost, def.costMult, 1, mark - 1);
    console.log(
      `owned ${String(mark).padStart(4)}  mult ${milestoneMult(mark).toString().padStart(4)}  vps ${fmt(vps).padStart(8)}  cyclePay ${fmt(cycle).padStart(8)}  sunk ${fmt(costN).padStart(8)}  Δvps ${prev ? (vps / prev).toFixed(2) + "x" : "—"}`,
    );
    prev = vps;
  }
}

printFarms("youtube");
printFarms("tiktok");
printFarms("simulation");
milestoneTable();
hypeTotals();

console.log("\n=== Simulated first prestige (BEST + hire) ===");
const first = grindToPrestige();
console.log(`time ${fmtTime(first.sec)}  owned ${first.owned.join("/")}  vps ${fmt(first.vps)}  views ${fmt(first.views)}`);

console.log("\n=== Simulated 2nd prestige on The Feed ===");
const second = grindPlanet("tiktok", 1);
console.log(`time ${fmtTime(second.sec)}  owned ${second.owned.join("/")}  hired ${second.hired}  vps ${fmt(second.vps)}  ${fmt(second.views)}/${fmt(second.target)}`);

console.log("\n=== Simulated 3rd prestige on The Simulation ===");
const third = grindPlanet("simulation", 2);
console.log(`time ${fmtTime(third.sec)}  owned ${third.owned.join("/")}  hired ${third.hired}  vps ${fmt(third.vps)}  ${fmt(third.views)}/${fmt(third.target)}`);

console.log("\n=== Manager vs first-copy payback ===");
for (const planet of PLANET_IDS) {
  for (const [i, def] of BUSINESSES[planet].entries()) {
    const vps = potentialVps(planet, i, 1, 1, 0);
    console.log(
      `${def.name.padEnd(22)} mgr ${fmt(def.managerCost).padStart(8)} = ${fmtTime(def.managerCost / vps)} of 1-copy VPS`,
    );
  }
}
