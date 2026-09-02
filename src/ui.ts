import {
  BUSINESSES,
  EVENT_SHOP,
  HYPE_SHOP,
  IDLE_CHEST_MAX_RANK,
  PASS_TIERS,
  PLANETS,
  UI_ROUTE_KEY,
  type PlanetId,
} from "./data";
import { formatCycle, formatNum, formatTime } from "./format";
import { pickFlavor } from "./flavor";
import {
  adviseFarm,
  algoGain,
  canAlgo,
  canBuyChestUpgrade,
  canBuyShop,
  canPrestige,
  currentEvent,
  cycleIncome,
  cycleSecFor,
  extraEventVps,
  globalViewsPerSec,
  managerPrice,
  managerSlots,
  nextMilestone,
  nextPlanetName,
  parseBuyMode,
  planetUnlocked,
  prestigeGain,
  previewIdleChest,
  quotedBuy,
  recap,
  rowVps,
  shopCost,
  shopLevel,
  timeToRankSec,
  totalMult,
  unlockedPlanets,
  type BuyMode,
  type BuyQuote,
  type FarmAdvice,
  type GameState,
} from "./game";
import { chestUpgradeCost } from "./idle-chest";
import { uiKeyFor } from "./users";

export type MoreSheet = "managers" | "event" | "pass";
export type DockTab = MoreSheet | "buy";

export type UiView = {
  screen: "landing" | "outside" | "inside";
  selected: number;
  bestMode: boolean;
};

export type UiSheet =
  | "prestige"
  | "algo"
  | "settings"
  | "chest"
  | "recap"
  | "import"
  | MoreSheet
  | null;

export type UiRoute = "landing" | "farm";

export type UiSession = {
  username: string;
  names: string[];
};

export const EMPTY_SESSION: UiSession = { username: "", names: [] };

export type UiHandlers = {
  onBuyBest: () => void;
  onBuy: (index: number) => void;
  onRun: (index: number) => void;
  onManager: (index: number, planet?: PlanetId) => void;
  onHireAll: () => void;
  onPlanet: (planet: PlanetId) => void;
  onPrestigeAsk: () => void;
  onPrestigeConfirm: () => void;
  onAlgoAsk: () => void;
  onAlgoConfirm: () => void;
  onSheetClose: () => void;
  onBuyMode: (mode: BuyMode) => void;
  onSelect: (index: number) => void;
  onEnter: (index: number) => void;
  onFarm: () => void;
  onOpenSheet: (sheet: MoreSheet) => void;
  onBestMode: () => void;
  onHome: () => void;
  onContinue: () => void;
  onNewRun: () => void;
  onSignIn: (username: string) => void;
  onBuyShop: (id: string) => void;
  onClaimDrop: () => void;
  onClaimEvent: (id: string) => void;
  onClaimPass: (id: string) => void;
  onClaimChest: () => void;
  onBuyChestUpgrade: () => void;
  onMute: () => void;
  onExport: () => void;
  onImportAsk: () => void;
  onImport: (raw: string) => void;
  onRecap: () => void;
  onDismissTip: () => void;
  onOverflow: () => void;
  onReset: () => void;
};

const BUY_CHIPS: BuyMode[] = [1, 10, 100, "max", "rank"];

export function algoVisible(state: GameState): boolean {
  return canAlgo(state) || state.algoCount > 0 || state.algoMult > 1;
}

export function hasSaveProgress(state: GameState): boolean {
  return (
    state.lifetimeViews > 0 ||
    state.playMs > 2000 ||
    state.prestigeCount > 0 ||
    state.algoCount > 0 ||
    state.views > 0
  );
}

export function readUiRoute(storage?: Storage, username?: string): UiRoute {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  if (!store) return "landing";
  try {
    const key = username ? uiKeyFor(username) : UI_ROUTE_KEY;
    const raw = store.getItem(key) ?? (username ? store.getItem(UI_ROUTE_KEY) : null);
    if (!raw) return "landing";
    const parsed = JSON.parse(raw) as { screen?: string };
    return parsed.screen === "farm" ? "farm" : "landing";
  } catch {
    return "landing";
  }
}

export function persistUiRoute(screen: UiRoute, storage?: Storage, username?: string): void {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  if (!store) return;
  const payload = JSON.stringify({ screen });
  if (username) store.setItem(uiKeyFor(username), payload);
  store.setItem(UI_ROUTE_KEY, payload);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shopHot(state: GameState): boolean {
  return HYPE_SHOP.some((item) => canBuyShop(state, item.id));
}

function usernameActive(current: string, name: string): boolean {
  return current.trim().toLowerCase() === name.trim().toLowerCase();
}

function chipLabel(mode: BuyMode): string {
  if (mode === "max") return "MAX";
  if (mode === "rank") return "RANK";
  return String(mode);
}

function planetShort(id: PlanetId): string {
  if (id === "youtube") return "YT";
  if (id === "tiktok") return "TT";
  return "SIM";
}

function goalCopy(state: GameState): { title: string; detail: string; ready: boolean; pct: number } {
  const ready = canPrestige(state);
  const pct = Math.min(100, (state.viewsThisRun / state.nextPrestigeAt) * 100);
  const title = state.simulationUnlocked
    ? "Go even more viral"
    : `Unlock ${nextPlanetName(state)}`;
  const gain = prestigeGain(state.viewsThisRun, state.prestigeCount);
  const detail = ready
    ? `Reset every farm. Bank ${gain.toFixed(1)} Hype. Planets stay unlocked.`
    : `${formatNum(state.viewsThisRun)} / ${formatNum(state.nextPrestigeAt)}`;
  return { title, detail, ready, pct };
}

export function buyButtonText(quote: BuyQuote, mode: BuyMode, name?: string): string {
  if (quote.locked) return "Unlock previous first";
  const cost = formatNum(quote.cost);
  const who = name ? ` ${name}` : "";
  if (mode === "rank" && quote.gap !== null) {
    if (quote.count > 0 && quote.count < quote.gap) {
      return `Rank ${quote.count}/${quote.gap}${who} · ${cost}`;
    }
    return `Rank ${quote.gap}${who} · ${cost}`;
  }
  if (name) return `Buy ${quote.count}× ${name} · ${cost}`;
  return `Buy ${quote.count} · ${cost}`;
}

export function bestButtonText(state: GameState, mode: BuyMode, advice: FarmAdvice): string {
  if (advice.bestIndex === null) return "Nothing to buy";
  const def = BUSINESSES[state.planet][advice.bestIndex];
  const quote = quotedBuy(state, advice.bestIndex, mode);
  return `Buy BEST · ${quote.count}× ${def.name} · ${formatNum(quote.cost)}`;
}

function renderPlanetChips(state: GameState): string {
  return PLANETS.map((planet) => {
    const locked = !planetUnlocked(state, planet.id);
    const active = state.planet === planet.id;
    return `
      <button
        class="planet ${active ? "is-on" : ""} ${locked ? "is-locked" : ""}"
        data-planet="${planet.id}"
        ${locked ? "disabled" : ""}
        title="${locked ? planet.unlock : planet.name}"
      >${planetShort(planet.id)}</button>
    `;
  }).join("");
}

function renderBuyChips(buyMode: BuyMode, bestMode: boolean): string {
  const qty = BUY_CHIPS.map(
    (mode) => `
      <button class="chip ${!bestMode && buyMode === mode ? "is-on" : ""}" data-buymode="${mode}" title="${mode === "rank" ? "Buy up to the next rank" : `Buy ${chipLabel(mode)}`}">
        ${chipLabel(mode)}
      </button>
    `,
  ).join("");
  return `<span class="dock-label">Qty</span>${qty}
      <button class="chip ${bestMode ? "is-on" : ""}" data-best-mode title="Advisor spends on the BEST row">BEST</button>`;
}

function dockHint(buyMode: BuyMode, bestMode: boolean): string {
  if (buyMode !== "rank") return "";
  return bestMode
    ? `<p class="dock-hint">RANK BEST is the best step toward a rank, not the selected row.</p>`
    : `<p class="dock-hint">RANK buys up to the next x2. Partial is fine. BEST still picks the farm.</p>`;
}

function farmHireAll(state: GameState): string {
  const slots = managerSlots(state);
  const open = slots.some((slot) => slot.owned > 0 && !slot.hired);
  if (!open) return "";
  const hot = slots.some((slot) => slot.affordable);
  return `<button class="ghost-lite farm-hire" data-hire-all ${hot ? "" : "disabled"}>Hire all</button>`;
}

function dropHot(state: GameState, now: number): boolean {
  const live = currentEvent(now);
  return state.event.claimedDropId !== live.def.id;
}

function passHot(state: GameState): boolean {
  return PASS_TIERS.some((tier) => !state.pass.claimed.includes(tier.id) && state.lifetimeViews >= tier.at);
}

function mgrsHot(state: GameState): boolean {
  return managerSlots(state).some((slot) => slot.affordable);
}

function renderDockActions(
  state: GameState,
  buyMode: BuyMode,
  selected: number,
  screen: UiView["screen"],
  bestMode: boolean,
): string {
  if (bestMode) {
    const advice = adviseFarm(state, buyMode);
    return `
      <button class="buy" data-buy-best ${advice.bestIndex !== null ? "" : "disabled"}>
        ${bestButtonText(state, buyMode, advice)}
      </button>
    `;
  }
  const def = BUSINESSES[state.planet][selected];
  const row = state.businesses[state.planet][selected];
  if (!def || !row) return "";
  const quote = quotedBuy(state, selected, buyMode);
  const hire =
    screen === "inside"
      ? `
    <button class="mgr" data-dock-mgr ${row.manager || row.owned <= 0 || state.views < managerPrice(state, state.planet, selected) ? "disabled" : ""}>
      ${row.manager ? "Managed" : `${def.managerName} · ${formatNum(managerPrice(state, state.planet, selected))}`}
    </button>`
      : "";
  return `
    <button class="buy" data-dock-buy ${quote.canBuy ? "" : "disabled"}>
      ${buyButtonText(quote, buyMode, def.name)}
    </button>
    ${hire}
  `;
}

function renderOutside(state: GameState, buyMode: BuyMode, selected: number): string {
  const defs = BUSINESSES[state.planet];
  const rows = state.businesses[state.planet];
  const advice = adviseFarm(state, buyMode);
  const planetName = PLANETS.find((p) => p.id === state.planet)?.name ?? state.planet;
  return `
    <div class="farm-head">
      <strong>${planetName} farm</strong>
      <div class="farm-tools">
        ${farmHireAll(state)}
        <nav class="planets" aria-label="Planets">${renderPlanetChips(state)}</nav>
      </div>
    </div>
    ${
      state.planet === "simulation"
        ? `<p class="farm-note">Poster planet. The starter pays; next copies are 1T+ views. Scenery until a later retune.</p>`
        : ""
    }
    <div class="rows" id="biz-list">
      ${defs
        .map((def, index) => {
          const row = rows[index];
          const locked = row.owned <= 0 && index > 0 && rows[index - 1].owned <= 0;
          const next = nextMilestone(row.owned);
          const cycle = cycleSecFor(def.cycleSec, row.owned, state.shop?.tempo ?? 0);
          const vps = rowVps(state, index);
          const eta = timeToRankSec(state, index);
          const badge = advice.badges[index];
          const rankPip = next
            ? `next rank ${next} (${next - row.owned})${eta !== null ? ` · ~${formatTime(eta * 1000)}` : ""}`
            : "maxed";
          return `
            <article
              class="row ${locked ? "is-dim" : ""} ${selected === index ? "is-on" : ""}"
              data-row="${index}"
              data-select="${index}"
            >
              <div class="row-main">
                <span class="icon">${def.icon}</span>
                <span class="row-copy">
                  <strong>${def.name}</strong>
                  <small>
                    <span data-row-vps>${vps > 0 ? `${formatNum(vps)}/s` : "—"}</span>
                    · <span data-row-cycle>${row.owned > 0 ? formatCycle(cycle) : formatCycle(def.cycleSec)}</span>
                    · <span data-row-rank>${rankPip}</span>
                  </small>
                </span>
                <span class="owned">x${formatNum(row.owned)}</span>
                <span class="badge ${badge ? `is-${badge}` : "is-off"}" data-row-badge>${badge ? badge.toUpperCase() : ""}</span>
              </div>
              <button class="row-open ${selected === index ? "is-on" : ""}" data-enter="${index}" aria-label="Open ${def.name}" title="Open">›</button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderInside(state: GameState, selected: number): string {
  const def = BUSINESSES[state.planet][selected];
  const row = state.businesses[state.planet][selected];
  if (!def || !row) return "";
  const income = cycleIncome(state.planet, selected, row.owned, totalMult(state));
  const milestone = nextMilestone(row.owned);
  const cycle = cycleSecFor(def.cycleSec, row.owned, state.shop?.tempo ?? 0);
  const pct = Math.min(100, row.progress * 100);
  const hint = row.manager
    ? "On autopilot · tap to refresh"
    : row.owned <= 0
      ? "Buy one to start"
      : "Tap to upload";
  return `
    <div class="inside-head">
      <button class="texty" data-farm>← Farm</button>
      <strong>${def.name}</strong>
    </div>
    <article class="biz" data-biz="${selected}" id="biz-list">
      <button class="run" data-run="${selected}" ${row.owned <= 0 ? "disabled" : ""}>
        <span class="icon">${def.icon}</span>
        <span class="run-copy">
          <strong>${def.name}</strong>
          <small>${hint}</small>
        </span>
        <span class="owned">x${formatNum(row.owned)}</span>
      </button>
      <p class="blurb">${def.blurb}</p>
      <button class="bar" data-run="${selected}" ${row.owned <= 0 ? "disabled" : ""}>
        <i style="width:${pct}%"></i>
        <span>${row.owned > 0 ? `${formatNum(income)} views` : "—"}</span>
        <em class="nudge-pip" hidden>+refresh</em>
      </button>
      <div class="meta">
        <span>${milestone ? `Next rank at ${milestone}` : "Milestones maxed"}</span>
        <span>${row.owned > 0 ? formatCycle(cycle) : formatCycle(def.cycleSec)} cycle</span>
      </div>
    </article>
  `;
}

function renderManagers(state: GameState): string {
  return `
    <div class="farm-head">
      <strong>Managers</strong>
      <p>Same views. Hire any unlocked farm.</p>
    </div>
    <button class="buy" data-hire-all ${managerSlots(state).some((slot) => slot.affordable) ? "" : "disabled"}>
      Hire all affordable
    </button>
    ${unlockedPlanets(state)
      .map((planet) => {
        const planetName = PLANETS.find((row) => row.id === planet)?.name ?? planet;
        return `
          <section class="mgr-block" data-mgr-planet="${planet}">
            <h3>${planetName}</h3>
            ${BUSINESSES[planet]
              .map((def, index) => {
                const row = state.businesses[planet][index];
                const hired = row.manager;
                const locked = row.owned <= 0;
                const cost = managerPrice(state, planet, index);
                const disabled = hired || locked || state.views < cost;
                return `
                  <article class="mgr-row ${locked ? "is-dim" : ""}">
                    <span class="icon">${def.icon}</span>
                    <span class="row-copy">
                      <strong>${def.name}</strong>
                      <small>${locked ? "Own one first" : hired ? "On autopilot" : def.managerName}</small>
                    </span>
                    <button
                      class="mgr"
                      data-hire
                      data-hire-planet="${planet}"
                      data-hire-index="${index}"
                      ${disabled ? "disabled" : ""}
                    >${hired ? "Managed" : `Hire · ${formatNum(cost)}`}</button>
                  </article>
                `;
              })
              .join("")}
          </section>
        `;
      })
      .join("")}
  `;
}

function renderEvent(state: GameState, now: number): string {
  const live = currentEvent(now);
  const left = Math.max(0, live.endsAt - now);
  const claimed = state.event.claimedDropId === live.def.id;
  const extraVps = extraEventVps(totalMult(state), live.def);
  return `
    <div class="farm-head">
      <strong>${live.def.name}</strong>
      <p>Ends in ${formatTime(left)} · ${live.def.bonusMult}x farms</p>
    </div>
    <article class="biz">
      <p class="blurb">${live.def.blurb}</p>
      <div class="meta">
        <span>Extra: ${live.def.extraName}</span>
        <span>${formatNum(extraVps)}/s</span>
      </div>
      <p class="blurb">Clout ${formatNum(state.event.clout)} · live drop, no checkout.</p>
      <button class="buy" data-claim-drop ${claimed ? "disabled" : ""}>
        ${claimed ? "Drop claimed" : `Claim drop · ${formatNum(live.def.dropViews)} views`}
      </button>
    </article>
    <div class="track">
      ${EVENT_SHOP.map((item) => {
        const done = state.event.claimed.includes(item.id);
        const can = !done && state.event.clout >= item.clout;
        const prize =
          item.kind === "title"
            ? item.title
            : item.kind === "mult"
              ? `+${item.amount}x`
              : `${formatNum(item.amount ?? 0)} views`;
        return `
          <article class="track-row">
            <span class="row-copy">
              <strong>${item.name}</strong>
              <small>${item.clout} clout · ${prize}</small>
            </span>
            <button class="mgr" data-claim-event="${item.id}" ${can ? "" : "disabled"}>
              ${done ? "Owned" : "Claim"}
            </button>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderPass(state: GameState): string {
  const claimed = state.pass.claimed.length;
  return `
    <div class="farm-head">
      <strong>Infinity Intern</strong>
      <p>${claimed}/${PASS_TIERS.length} · lifetime views</p>
    </div>
    <p class="blurb">Free track. Earn it by posting. Nothing to buy.</p>
    <div class="track">
      ${PASS_TIERS.map((tier) => {
        const done = state.pass.claimed.includes(tier.id);
        const can = !done && state.lifetimeViews >= tier.at;
        const prize =
          tier.kind === "title"
            ? tier.title
            : tier.kind === "mult"
              ? `+${tier.amount}x`
              : `${formatNum(tier.amount ?? 0)} views`;
        return `
          <article class="track-row ${done ? "is-done" : ""}">
            <span class="row-copy">
              <strong>${tier.name}</strong>
              <small>${formatNum(tier.at)} views · ${prize}</small>
            </span>
            <button class="mgr" data-claim-pass="${tier.id}" ${can ? "" : "disabled"}>
              ${done ? "Claimed" : can ? "Claim" : "Locked"}
            </button>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderChestUpgrade(state: GameState): string {
  const preview = previewIdleChest(state, 0);
  const rank = preview.rank;
  const maxed = rank >= IDLE_CHEST_MAX_RANK;
  const cost = chestUpgradeCost(rank);
  const can = canBuyChestUpgrade(state);
  return `
    <div class="chest-up">
      <strong>Idle chest ${rank}/${IDLE_CHEST_MAX_RANK}</strong>
      <p>Fills up to ${formatTime(preview.durationMs)} at ${Math.round(preview.rate * 100)}% of manager VPS. Away 60s+ to claim.</p>
      <button class="mgr" data-chest-up ${maxed || !can ? "disabled" : ""}>
        ${maxed ? "Max duration" : `Longer chest · ${formatNum(cost)}`}
      </button>
    </div>
  `;
}

function renderHypeShop(state: GameState): string {
  return `
    <div class="hype-shop">
      <strong>Hype shop</strong>
      <p>Banked ${formatNum(state.hype)} Hype. Permanent. Survives prestige.</p>
      ${HYPE_SHOP.map((item) => {
        const level = shopLevel(state, item.id);
        const maxed = level >= item.max;
        const cost = shopCost(item.id, level);
        const can = canBuyShop(state, item.id);
        return `
          <article class="shop-row">
            <span class="row-copy">
              <strong>${item.name} ${level}/${item.max}</strong>
              <small>${item.blurb}</small>
            </span>
            <button class="mgr" data-shop-buy="${item.id}" ${can ? "" : "disabled"}>
              ${maxed ? "Max" : `Buy · ${formatNum(cost)}`}
            </button>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderSheet(state: GameState, sheet: UiSheet, now: number): string {
  if (sheet === "prestige") {
    const goal = goalCopy(state);
    const gain = prestigeGain(state.viewsThisRun, state.prestigeCount);
    const showAlgo = canAlgo(state);
    return `
      <div class="sheet is-on" data-sheet>
        <button class="sheet-back" data-sheet-close aria-label="Close"></button>
        <div class="sheet-card is-tall">
          <strong>${goal.title}</strong>
          <p>${goal.detail}</p>
          <div class="goal-track" aria-hidden="true"><i id="goal-bar" style="width:${goal.pct}%"></i></div>
          <p class="sheet-meter">${formatNum(state.viewsThisRun)} / ${formatNum(state.nextPrestigeAt)}</p>
          <div class="sheet-actions">
            <button class="ghost-lite" data-sheet-close>Cancel</button>
            <button class="ghost" data-prestige-go ${goal.ready ? "" : "disabled"}>Prestige · +${gain.toFixed(1)} Hype</button>
          </div>
          ${renderHypeShop(state)}
          ${
            showAlgo
              ? `<div class="sheet-algo">
                  <strong>Enter the algorithm?</strong>
                  <p>Second layer. Viral resets to 1.00x. Keep +${algoGain(state.prestigeMult, state.prestigeCount).toFixed(2)}x Algo. Hype shop stays.</p>
                  <button class="ghost-lite" data-algo-go>Algo</button>
                </div>`
              : ""
          }
        </div>
      </div>
    `;
  }
  if (sheet === "algo") {
    const gain = algoGain(state.prestigeMult, state.prestigeCount).toFixed(2);
    return `
      <div class="sheet is-on" data-sheet>
        <button class="sheet-back" data-sheet-close aria-label="Close"></button>
        <div class="sheet-card">
          <strong>Enter the algorithm?</strong>
          <p>Second layer. Viral resets to 1.00x. Keep +${gain}x Algo. The Simulation stays open. Hype shop stays.</p>
          <div class="sheet-actions">
            <button class="ghost-lite" data-sheet-close>Cancel</button>
            <button class="ghost" data-algo-go ${canAlgo(state) ? "" : "disabled"}>Algo</button>
          </div>
        </div>
      </div>
    `;
  }
  if (sheet === "chest") {
    const chest = state.pendingChest;
    return `
      <div class="sheet is-on" data-sheet>
        <button class="sheet-back" data-sheet-close aria-label="Close"></button>
        <div class="sheet-card">
          <strong>Comeback chest</strong>
          <p>Away ${chest ? formatTime(chest.offlineMs) : "a bit"}. Bonus ${chest ? formatNum(chest.views) : "0"} views. Local only.</p>
          ${renderChestUpgrade(state)}
          <div class="sheet-actions">
            <button class="ghost-lite" data-sheet-close>Later</button>
            <button class="ghost" data-claim-chest>Open chest</button>
          </div>
        </div>
      </div>
    `;
  }
  if (sheet === "recap") {
    const snap = recap(state);
    return `
      <div class="sheet is-on" data-sheet>
        <button class="sheet-back" data-sheet-close aria-label="Close"></button>
        <div class="sheet-card">
          <strong>Recap</strong>
          <p>
            Lifetime ${formatNum(snap.lifetimeViews)} · this run ${formatNum(snap.viewsThisRun)}<br>
            Viral ${snap.prestigeMult.toFixed(2)}x · shop ${snap.shopViral.toFixed(2)}x · Algo ${snap.algoMult.toFixed(2)}x<br>
            Hype ${formatNum(snap.hype)} · prestiges ${snap.prestigeCount} · Algos ${snap.algoCount} · managers ${snap.managers}<br>
            Play ${formatTime(snap.playMs)} · chests ${snap.chests}
            ${snap.title ? `<br>Title: ${snap.title}` : ""}
          </p>
          <div class="sheet-actions">
            <button class="ghost-lite" data-sheet-close>Close</button>
          </div>
        </div>
      </div>
    `;
  }
  if (sheet === "import") {
    return `
      <div class="sheet is-on" data-sheet>
        <button class="sheet-back" data-sheet-close aria-label="Close"></button>
        <div class="sheet-card">
          <strong>Import save</strong>
          <p>Paste a JSON export. Local only. No money. This replaces the current farm.</p>
          <textarea id="import-box" class="save-box" rows="6" placeholder="{ ... }"></textarea>
          <div class="sheet-actions">
            <button class="ghost-lite" data-sheet-close>Cancel</button>
            <button class="ghost" data-import-go>Import</button>
          </div>
        </div>
      </div>
    `;
  }
  if (sheet === "settings") {
    return `
      <div class="sheet is-on" data-sheet>
        <button class="sheet-back" data-sheet-close aria-label="Close"></button>
        <div class="sheet-card">
          <strong>Slop Capitalist</strong>
          <p>One cursed short. Then the whole internet. Local only. Lives on this PC. No IAP.</p>
          ${renderChestUpgrade(state)}
          <div class="sheet-stack">
            <button class="ghost-lite" data-mute>${state.muted ? "Unmute juice" : "Mute juice"}</button>
            <button class="ghost-lite" data-recap>Stats / recap</button>
            <button class="ghost-lite" data-export>Copy export</button>
            <button class="ghost-lite" data-import-ask>Import save</button>
            <button class="texty" data-reset>Reset save</button>
          </div>
          <div class="sheet-actions">
            <button class="ghost-lite" data-sheet-close>Close</button>
          </div>
        </div>
      </div>
    `;
  }
  if (sheet === "managers") {
    return `
      <div class="sheet is-on" data-sheet>
        <button class="sheet-back" data-sheet-close aria-label="Close"></button>
        <div class="sheet-card is-tall">
          <button class="texty sheet-back-link" data-sheet-close>← Farm</button>
          ${renderManagers(state)}
        </div>
      </div>
    `;
  }
  if (sheet === "event") {
    return `
      <div class="sheet is-on" data-sheet>
        <button class="sheet-back" data-sheet-close aria-label="Close"></button>
        <div class="sheet-card is-tall">
          <button class="texty sheet-back-link" data-sheet-close>← Farm</button>
          ${renderEvent(state, now)}
        </div>
      </div>
    `;
  }
  if (sheet === "pass") {
    return `
      <div class="sheet is-on" data-sheet>
        <button class="sheet-back" data-sheet-close aria-label="Close"></button>
        <div class="sheet-card is-tall">
          <button class="texty sheet-back-link" data-sheet-close>← Farm</button>
          ${renderPass(state)}
        </div>
      </div>
    `;
  }
  return "";
}

function renderLanding(state: GameState, session: UiSession): string {
  const progress = hasSaveProgress(state);
  const last = session.username;
  const signedIn = Boolean(last);
  const continueLabel = signedIn
    ? progress
      ? `Continue · ${escapeHtml(last)} · ${formatNum(state.views)} views`
      : `Continue · ${escapeHtml(last)}`
    : "Continue";
  return `
    <div class="frame landing-frame">
      <main class="landing">
        <p class="wordmark">Slop Capitalist</p>
        <p class="landing-tag">Idle tycoon. Farm the algorithm. One cursed short at a time.</p>
        <ul class="landing-bullets">
          <li><strong>Tap a farm, then buy it.</strong> BEST is a mode if you want the math to pick.</li>
          <li><strong>The farm is the game.</strong> Hire, drops, and the pass open as sheets — they never replace the list.</li>
          <li><strong>Prestige when the chip fills.</strong> Reset farms. Bank Hype. Spend it on permanent upgrades.</li>
        </ul>
        <form class="landing-auth" data-signin-form>
          <label class="landing-label" for="username">Username
            <input id="username" class="username" data-username type="text" maxlength="24" autocomplete="username" placeholder="Pick a name" value="${escapeHtml(last)}" />
          </label>
          <button class="${signedIn ? "ghost-lite" : "buy"}" data-sign-in type="submit">${signedIn ? "Switch / create" : "Sign in"}</button>
        </form>
        ${
          session.names.length
            ? `<div class="landing-users">${session.names
                .map(
                  (name) =>
                    `<button type="button" class="ghost-lite ${usernameActive(session.username, name) ? "is-on" : ""}" data-user-pick="${escapeHtml(name)}">${escapeHtml(name)}</button>`,
                )
                .join("")}</div>`
            : ""
        }
        <div class="landing-actions">
          <button class="${signedIn ? "buy" : "ghost-lite"}" data-continue ${signedIn ? "" : "disabled"}>${continueLabel}</button>
          <button class="ghost-lite" data-new-run ${signedIn ? "" : "disabled"}>New run</button>
        </div>
        <p class="landing-note">Toy account. Username only — no password, no email. Local to this browser. Switching names keeps the other save. No ads. No checkout. Lives on this PC.</p>
      </main>
    </div>
  `;
}

function renderCamera(state: GameState, buyMode: BuyMode, view: UiView): string {
  return view.screen === "inside"
    ? renderInside(state, view.selected)
    : renderOutside(state, buyMode, view.selected);
}

export function renderApp(
  root: HTMLElement,
  state: GameState,
  buyMode: BuyMode,
  view: UiView,
  sheet: UiSheet,
  handlers: UiHandlers,
  now = 0,
  session: UiSession = EMPTY_SESSION,
): void {
  const clock = now > 0 ? now : Date.now();

  if (view.screen === "landing") {
    root.innerHTML = `${renderLanding(state, session)}${renderSheet(state, sheet, clock)}`;
    bindChrome(root, view, handlers);
    return;
  }

  const goal = goalCopy(state);
  const camera = renderCamera(state, buyMode, view);
  const showAlgo = algoVisible(state);
  const algoReady = canAlgo(state);

  root.innerHTML = `
    <div class="frame">
      <header class="chrome-top">
        <div class="brand-row">
          <button class="wordmark-btn" data-home aria-label="Home">
            <span class="wordmark wordmark-home">Slop</span>
            <span class="wordmark"> Capitalist</span>
          </button>
          ${state.title ? `<p class="flavor-title">${state.title}</p>` : ""}
          <button class="overflow" data-overflow aria-label="Settings">…</button>
        </div>
        <div class="wallet wallet-thin">
          <div class="wallet-money">
            <div class="wallet-views">
              <span class="label">Views</span>
              <strong id="views">${formatNum(state.views)}</strong>
            </div>
            <em id="vps">${formatNum(globalViewsPerSec(state, clock))}/s</em>
          </div>
          <div class="wallet-chips">
            <span class="stat-chip" id="mult">Viral ${totalMult(state).toFixed(2)}x</span>
            ${
              state.hype > 0 || state.prestigeCount > 0
                ? `<span class="stat-chip" id="hype">Hype ${formatNum(state.hype)}</span>`
                : ""
            }
            ${
              showAlgo
                ? algoReady
                  ? `<button class="stat-chip is-ready" data-algo id="algo">Algo ${state.algoMult.toFixed(2)}x</button>`
                  : `<span class="stat-chip" id="algo">Algo ${state.algoMult.toFixed(2)}x</span>`
                : ""
            }
            <button class="stat-chip prestige-chip ${goal.ready ? "is-ready" : ""} ${shopHot(state) ? "is-hot" : ""}" data-prestige>
              <span>Prestige</span>
              <i class="mini-bar" aria-hidden="true"><b id="goal-bar" style="width:${goal.pct}%"></b></i>
            </button>
          </div>
        </div>
      </header>
      <main class="camera">${camera}${
        state.seenTooltip
          ? ""
          : `<div class="tip" data-tip>
              <strong>Tap a row. The mint button follows it.</strong>
              <p>Quantity is 1 / 10 / 100 / MAX / RANK. BEST is a mode that spends on the advisor winner instead.</p>
              <button class="ghost" data-dismiss-tip>Got it</button>
            </div>`
      }</main>
      <footer class="chrome-bot">
        <div id="toast-slot" class="toast-slot" role="status"></div>
        <div class="dock-modes">
          ${renderBuyChips(buyMode, view.bestMode)}
        </div>
        ${dockHint(buyMode, view.bestMode)}
        <nav class="dock-icons" aria-label="More">
          <button class="dock-icon ${mgrsHot(state) ? "is-hot" : ""}" data-sheet-open="managers">Mgrs</button>
          <button class="dock-icon ${dropHot(state, clock) ? "is-hot" : ""}" data-sheet-open="event">Drop</button>
          <button class="dock-icon ${passHot(state) ? "is-hot" : ""}" data-sheet-open="pass">Pass</button>
        </nav>
        <div class="dock-actions" id="dock-actions">
          ${renderDockActions(state, buyMode, view.selected, view.screen, view.bestMode)}
        </div>
      </footer>
      ${renderSheet(state, sheet, clock)}
    </div>
  `;

  bindChrome(root, view, handlers);
}

function bindChrome(root: HTMLElement, view: UiView, handlers: UiHandlers): void {
  root.querySelector("[data-home]")?.addEventListener("click", handlers.onHome);
  root.querySelector("[data-continue]")?.addEventListener("click", handlers.onContinue);
  root.querySelector("[data-new-run]")?.addEventListener("click", handlers.onNewRun);
  root.querySelector("[data-signin-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const box = root.querySelector<HTMLInputElement>("[data-username]");
    handlers.onSignIn(box?.value ?? "");
  });
  root.querySelectorAll<HTMLButtonElement>("[data-user-pick]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onSignIn(btn.dataset.userPick ?? ""));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-shop-buy]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onBuyShop(btn.dataset.shopBuy ?? ""));
  });
  root.querySelector("[data-best-mode]")?.addEventListener("click", handlers.onBestMode);
  root.querySelectorAll<HTMLButtonElement>("[data-sheet-open]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onOpenSheet(btn.dataset.sheetOpen as MoreSheet));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-planet]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onPlanet(btn.dataset.planet as PlanetId));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-buymode]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onBuyMode(parseBuyMode(btn.dataset.buymode)));
  });
  root.querySelector("[data-prestige]")?.addEventListener("click", handlers.onPrestigeAsk);
  root.querySelector("[data-prestige-go]")?.addEventListener("click", handlers.onPrestigeConfirm);
  root.querySelector("[data-algo]")?.addEventListener("click", handlers.onAlgoAsk);
  root.querySelector("[data-algo-go]")?.addEventListener("click", handlers.onAlgoConfirm);
  root.querySelectorAll("[data-sheet-close]").forEach((el) => {
    el.addEventListener("click", handlers.onSheetClose);
  });
  root.querySelector("[data-overflow]")?.addEventListener("click", handlers.onOverflow);
  root.querySelector("[data-reset]")?.addEventListener("click", handlers.onReset);
  root.querySelector("[data-farm]")?.addEventListener("click", handlers.onFarm);
  root.querySelector("[data-buy-best]")?.addEventListener("click", handlers.onBuyBest);
  root.querySelector("[data-dock-buy]")?.addEventListener("click", () => handlers.onBuy(view.selected));
  root.querySelector("[data-dock-mgr]")?.addEventListener("click", () => handlers.onManager(view.selected));
  root.querySelectorAll("[data-hire-all]").forEach((el) => {
    el.addEventListener("click", handlers.onHireAll);
  });
  root.querySelector("[data-chest-up]")?.addEventListener("click", handlers.onBuyChestUpgrade);
  root.querySelector("[data-claim-chest]")?.addEventListener("click", handlers.onClaimChest);
  root.querySelector("[data-mute]")?.addEventListener("click", handlers.onMute);
  root.querySelector("[data-export]")?.addEventListener("click", handlers.onExport);
  root.querySelector("[data-import-ask]")?.addEventListener("click", handlers.onImportAsk);
  root.querySelector("[data-recap]")?.addEventListener("click", handlers.onRecap);
  root.querySelector("[data-dismiss-tip]")?.addEventListener("click", handlers.onDismissTip);
  root.querySelector("[data-import-go]")?.addEventListener("click", () => {
    const box = root.querySelector<HTMLTextAreaElement>("#import-box");
    handlers.onImport(box?.value ?? "");
  });
  root.querySelector("[data-claim-drop]")?.addEventListener("click", handlers.onClaimDrop);
  root.querySelectorAll<HTMLButtonElement>("[data-claim-event]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onClaimEvent(btn.dataset.claimEvent ?? ""));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-claim-pass]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onClaimPass(btn.dataset.claimPass ?? ""));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-hire]").forEach((btn) => {
    btn.addEventListener("click", () => {
      handlers.onManager(Number(btn.dataset.hireIndex), btn.dataset.hirePlanet as PlanetId);
    });
  });

  root.querySelectorAll<HTMLElement>("[data-select]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).closest("[data-enter]")) return;
      handlers.onSelect(Number(row.dataset.select));
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-enter]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const index = Number(btn.dataset.enter);
      handlers.onEnter(index);
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-run]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onRun(Number(btn.dataset.run)));
  });
}

function patchGoal(root: HTMLElement, state: GameState): void {
  const goal = goalCopy(state);
  const bar = root.querySelector<HTMLElement>("#goal-bar");
  const chip = root.querySelector<HTMLButtonElement>("[data-prestige]");
  if (bar) bar.style.width = `${goal.pct}%`;
  if (chip) chip.classList.toggle("is-ready", goal.ready);
}

function patchOutsideRows(root: HTMLElement, state: GameState, buyMode: BuyMode, selected: number): void {
  const defs = BUSINESSES[state.planet];
  const rows = state.businesses[state.planet];
  const advice = adviseFarm(state, buyMode);

  defs.forEach((def, index) => {
    const row = rows[index];
    const el = root.querySelector<HTMLElement>(`[data-row="${index}"]`);
    if (!el) return;
    el.classList.toggle("is-on", selected === index);
    const open = el.querySelector<HTMLElement>("[data-enter]");
    if (open) open.classList.toggle("is-on", selected === index);
    const vps = rowVps(state, index);
    const cycle = cycleSecFor(def.cycleSec, row.owned, state.shop?.tempo ?? 0);
    const next = nextMilestone(row.owned);
    const eta = timeToRankSec(state, index);
    const badge = advice.badges[index];
    const vpsEl = el.querySelector("[data-row-vps]");
    const cycleEl = el.querySelector("[data-row-cycle]");
    const rankEl = el.querySelector("[data-row-rank]");
    const badgeEl = el.querySelector("[data-row-badge]");
    const ownedEl = el.querySelector(".owned");
    if (vpsEl) vpsEl.textContent = vps > 0 ? `${formatNum(vps)}/s` : "—";
    if (cycleEl) cycleEl.textContent = row.owned > 0 ? formatCycle(cycle) : formatCycle(def.cycleSec);
    if (rankEl) {
      rankEl.textContent = next
        ? `next rank ${next} (${next - row.owned})${eta !== null ? ` · ~${formatTime(eta * 1000)}` : ""}`
        : "maxed";
    }
    if (badgeEl) {
      badgeEl.textContent = badge ? badge.toUpperCase() : "";
      badgeEl.className = `badge ${badge ? `is-${badge}` : "is-off"}`;
    }
    if (ownedEl) ownedEl.textContent = `x${formatNum(row.owned)}`;
  });
}

function patchInside(root: HTMLElement, state: GameState, selected: number): void {
  const def = BUSINESSES[state.planet][selected];
  const row = state.businesses[state.planet][selected];
  if (!def || !row) return;
  const fill = root.querySelector<HTMLElement>(".bar i");
  if (fill) fill.style.width = `${Math.min(100, row.progress * 100)}%`;
  const payout = root.querySelector(".bar span");
  if (payout) {
    payout.textContent =
      row.owned > 0 ? `${formatNum(cycleIncome(state.planet, selected, row.owned, totalMult(state)))} views` : "—";
  }
  const hint = root.querySelector(".run-copy small");
  if (hint) {
    hint.textContent = row.manager
      ? "On autopilot · tap to refresh"
      : row.owned <= 0
        ? "Buy one to start"
        : "Tap to upload";
  }
  root.querySelectorAll<HTMLButtonElement>("[data-run]").forEach((btn) => {
    btn.disabled = row.owned <= 0;
  });
  const owned = root.querySelector(".biz .owned");
  if (owned) owned.textContent = `x${formatNum(row.owned)}`;
  const meta = root.querySelectorAll(".meta span");
  const milestone = nextMilestone(row.owned);
  if (meta[0]) meta[0].textContent = milestone ? `Next rank at ${milestone}` : "Milestones maxed";
  if (meta[1]) {
    meta[1].textContent = `${row.owned > 0 ? formatCycle(cycleSecFor(def.cycleSec, row.owned, state.shop?.tempo ?? 0)) : formatCycle(def.cycleSec)} cycle`;
  }
}

function patchManagers(root: HTMLElement, state: GameState): void {
  root.querySelectorAll<HTMLButtonElement>("[data-hire]").forEach((btn) => {
    const planet = btn.dataset.hirePlanet as PlanetId;
    const index = Number(btn.dataset.hireIndex);
    const def = BUSINESSES[planet]?.[index];
    const row = state.businesses[planet]?.[index];
    if (!def || !row) return;
    if (row.manager) {
      btn.disabled = true;
      btn.textContent = "Managed";
      return;
    }
    const cost = managerPrice(state, planet, index);
    btn.disabled = row.owned <= 0 || state.views < cost;
    btn.textContent = `Hire · ${formatNum(cost)}`;
  });
}

function patchEvent(root: HTMLElement, state: GameState, now: number): void {
  const live = currentEvent(now);
  const drop = root.querySelector<HTMLButtonElement>("[data-claim-drop]");
  if (drop) {
    const claimed = state.event.claimedDropId === live.def.id;
    drop.disabled = claimed;
    drop.textContent = claimed ? "Drop claimed" : `Claim drop · ${formatNum(live.def.dropViews)} views`;
  }
  root.querySelectorAll<HTMLButtonElement>("[data-claim-event]").forEach((btn) => {
    const id = btn.dataset.claimEvent ?? "";
    const item = EVENT_SHOP.find((row) => row.id === id);
    if (!item) return;
    const done = state.event.claimed.includes(id);
    btn.disabled = done || state.event.clout < item.clout;
    btn.textContent = done ? "Owned" : "Claim";
  });
}

function patchPass(root: HTMLElement, state: GameState): void {
  root.querySelectorAll<HTMLButtonElement>("[data-claim-pass]").forEach((btn) => {
    const id = btn.dataset.claimPass ?? "";
    const tier = PASS_TIERS.find((row) => row.id === id);
    if (!tier) return;
    const done = state.pass.claimed.includes(id);
    const can = !done && state.lifetimeViews >= tier.at;
    btn.disabled = !can;
    btn.textContent = done ? "Claimed" : can ? "Claim" : "Locked";
  });
}

export function patchMeters(
  root: HTMLElement,
  state: GameState,
  buyMode: BuyMode,
  view: UiView,
  now = 0,
): void {
  const clock = now > 0 ? now : Date.now();
  if (view.screen === "landing") {
    const cont = root.querySelector<HTMLButtonElement>("[data-continue]");
    const name = root.querySelector<HTMLInputElement>("[data-username]")?.value.trim();
    if (cont && hasSaveProgress(state) && name) {
      cont.textContent = `Continue · ${name} · ${formatNum(state.views)} views`;
    }
    return;
  }

  const views = root.querySelector("#views");
  const vps = root.querySelector("#vps");
  const mult = root.querySelector("#mult");
  const algo = root.querySelector("#algo");
  if (views) views.textContent = formatNum(state.views);
  if (vps) vps.textContent = `${formatNum(globalViewsPerSec(state, clock))}/s`;
  if (mult) mult.textContent = `Viral ${totalMult(state).toFixed(2)}x`;
  const hype = root.querySelector("#hype");
  if (hype) hype.textContent = `Hype ${formatNum(state.hype)}`;
  if (algo) algo.textContent = `Algo ${state.algoMult.toFixed(2)}x`;
  patchGoal(root, state);

  if (root.querySelector("[data-hire]")) patchManagers(root, state);
  root.querySelectorAll<HTMLButtonElement>("[data-hire-all]").forEach((btn) => {
    btn.disabled = !managerSlots(state).some((slot) => slot.affordable);
  });
  if (root.querySelector("[data-claim-drop]")) patchEvent(root, state, clock);
  if (root.querySelector("[data-claim-pass]")) patchPass(root, state);
  if (view.screen === "outside") patchOutsideRows(root, state, buyMode, view.selected);
  else if (view.screen === "inside") patchInside(root, state, view.selected);

  const dockBuy = root.querySelector<HTMLButtonElement>("[data-dock-buy]");
  const dockMgr = root.querySelector<HTMLButtonElement>("[data-dock-mgr]");
  const bestBtn = root.querySelector<HTMLButtonElement>("[data-buy-best]");
  const def = BUSINESSES[state.planet][view.selected];
  const row = state.businesses[state.planet][view.selected];
  if (bestBtn) {
    const advice = adviseFarm(state, buyMode);
    bestBtn.disabled = advice.bestIndex === null;
    bestBtn.textContent = bestButtonText(state, buyMode, advice);
  }
  if (def && row && dockBuy) {
    const quote = quotedBuy(state, view.selected, buyMode);
    dockBuy.disabled = !quote.canBuy;
    dockBuy.textContent = buyButtonText(quote, buyMode, def.name);
  }
  if (def && row && dockMgr && !row.manager) {
    dockMgr.disabled = row.owned <= 0 || state.views < managerPrice(state, state.planet, view.selected);
  }
}

export function flashNudge(root: HTMLElement): void {
  const bar = root.querySelector(".bar");
  const pip = root.querySelector<HTMLElement>(".nudge-pip");
  if (!bar) return;
  bar.classList.add("is-flash");
  if (pip) pip.hidden = false;
  window.setTimeout(() => {
    bar.classList.remove("is-flash");
    if (pip) pip.hidden = true;
  }, 220);
}

let toastTimer = 0;
let toastOut = 0;

export function showToast(message: string): void {
  const slot = document.querySelector("#toast-slot");
  if (!slot) return;
  slot.textContent = message;
  slot.classList.add("is-in");
  window.clearTimeout(toastTimer);
  window.clearTimeout(toastOut);
  toastTimer = window.setTimeout(() => {
    slot.classList.remove("is-in");
    toastOut = window.setTimeout(() => {
      if (!slot.classList.contains("is-in")) slot.textContent = "";
    }, 280);
  }, 3200);
}

export function showAway(earned: number, offlineMs: number): void {
  if (earned <= 0 || offlineMs < 5000) return;
  showToast(pickFlavor("offline", { time: formatTime(offlineMs), views: formatNum(earned) }));
}
