import {
  algo,
  applyOffline,
  buy,
  buyBest,
  buyScore,
  canAlgo,
  canPrestige,
  claimChest,
  claimEventDrop,
  claimEventShop,
  claimPass,
  exportSave,
  hireAllAffordable,
  hireManager,
  importSave,
  newGame,
  offerComebackChest,
  prestige,
  startCycle,
  tapBar,
  tick,
  newTapSession,
} from "../src/game";
import { adviseFarm } from "../src/game";
import { PRESTIGE_AT } from "../src/data";

const notes: string[] = [];
function say(line: string): void {
  notes.push(line);
  console.log(line);
}

const state = newGame(1_000);
const session = newTapSession();
say(`fresh save: ${state.businesses.youtube[0].owned} cursed short, ${state.views} views`);

startCycle(state, 0);
tick(state, 2);
say(`after 2s tap: ${state.views.toFixed(2)} views`);

let minutes = 0;
while (state.views < 80 && minutes < 8) {
  if (!state.businesses.youtube[0].running) startCycle(state, 0);
  tick(state, 60);
  minutes += 1;
  const bought = buyBest(state, 1);
  if (bought) say(`min ${minutes}: Buy BEST bought ${bought.count} of row ${bought.index}`);
}
say(`after ${minutes} min grind: views=${state.views.toFixed(1)} owned0=${state.businesses.youtube[0].owned}`);

const advice = adviseFarm(state, 1);
if (advice.bestIndex !== null) {
  const winner = buyScore(state, advice.bestIndex, 1)!;
  for (let i = 0; i < 5; i++) {
    const score = buyScore(state, i, 1);
    if (score !== null && i !== advice.bestIndex && score > winner) {
      say(`BUG: BEST lie. row ${i} score ${score} > ${winner}`);
    }
  }
  say(`BEST row ${advice.bestIndex} score ${winner.toExponential(3)}`);
}

state.views = 20_000;
const hired = hireAllAffordable(state);
say(`hire all: ${hired} managers. row0 running=${state.businesses.youtube[0].running}`);
tick(state, 120);
say(`2 more minutes unmanaged-free: views=${state.views.toFixed(0)} vps-ish this-run=${state.viewsThisRun.toFixed(0)}`);

const beforeTap = state.views;
tapBar(state, 0, session, 2_000);
tick(state, 0.2);
say(`optional nudge still works; views ${beforeTap.toFixed(0)} -> ${state.views.toFixed(0)}`);

state.lastTs = 1_000;
const away = applyOffline(state, 1_000 + 5 * 60 * 1000);
const chest = offerComebackChest(state, away.offlineMs);
const claimed = claimChest(state);
say(`comeback: away ${away.offlineMs}ms earned ${away.earned.toFixed(0)} chest ${chest.toFixed(0)} claimed ${claimed.toFixed(0)}`);

state.viewsThisRun = PRESTIGE_AT;
    const first = prestige(state);
    const spam = prestige(state);
    say(`prestige +${first.toFixed(1)} Hype viral=${state.prestigeMult} planet=${state.planet} spam=${spam} locked=${!canPrestige(state)}`);

state.viewsThisRun = state.nextPrestigeAt;
prestige(state);
say(`second prestige planet=${state.planet} sim=${state.simulationUnlocked} starter=${state.businesses.simulation[0].owned}`);

state.prestigeMult = 3;
const algoGain = canAlgo(state) ? algo(state) : 0;
say(`algo +${algoGain.toFixed(2)}x viral=${state.prestigeMult} algo=${state.algoMult}`);

const drop = claimEventDrop(state, 1);
state.event.clout = 40;
const shop = claimEventShop(state, "sticker");
state.lifetimeViews = 10_000;
const pass = claimPass(state, "intern");
say(`event drop ${drop} shop ${shop?.name ?? "none"} pass ${pass?.name ?? "none"}`);

const raw = exportSave(state);
const loaded = importSave(raw);
say(`export/import: ${loaded ? `views ${loaded.views.toFixed(0)} algo ${loaded.algoMult}` : "FAILED"}`);

if (spam !== 0) say("BUG: prestige spam still pays");
if (first > 0 && state.prestigeMult !== 1) say("BUG: prestige still grants free viral");
if (chest > 0 && claimed === away.earned) say("BUG: chest double-pays the away wallet");
if (!state.simulationUnlocked) say("BUG: Simulation missing after second prestige");
if (chest > 0 && claimed !== chest) say("BUG: chest claim mismatch");
if (!loaded) say("BUG: import failed");

console.log("\n--- playtest sim notes ---");
for (const line of notes) console.log(`- ${line}`);
