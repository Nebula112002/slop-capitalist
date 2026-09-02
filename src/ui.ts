import {
  BUSINESSES,
  EVENT_SHOP,
  HYPE_SHOP,
  IDLE_CHEST_MAX_RANK,
  MIN_CYCLE_SEC,
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

export type MoreSheet =
  | "menu"
  | "managers"
  | "event"
  | "pass"
  | "settings"
  | "recap"
  | "chest"
  | "legal";

export type UiView = {
  screen: "landing" | "outside" | "inside";
  selected: number;
  bestMode: boolean;
};

export type UiSheet = "prestige" | "algo" | "import" | MoreSheet | null;

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
  onEraseAll: () => void;
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
  return `\u00d7${mode}`;
}

function chipTitle(mode: BuyMode): string {
  if (mode === "max") return "Buy everything you can afford";
  if (mode === "rank") return "Buy up to the next \u00d72 rank";
  return `Buy ${mode} at a time`;
}

function planetShort(id: PlanetId): string {
  if (id === "youtube") return "TUBE";
  if (id === "tiktok") return "FEED";
  return "SIM";
}

function planetName(id: PlanetId): string {
  return PLANETS.find((planet) => planet.id === id)?.name ?? id;
}

type Goal = {
  title: string;
  ready: boolean;
  pct: number;
  chip: string;
  aria: string;
};

function goalCopy(state: GameState): Goal {
  const ready = canPrestige(state);
  const pct = Math.min(100, (state.viewsThisRun / state.nextPrestigeAt) * 100);
  const title = state.simulationUnlocked
    ? "Go even more viral"
    : `Unlock ${nextPlanetName(state)}`;
  // The sub-label names the bar the run has to clear. The meter carries progress.
  const chip = ready ? "Ready" : formatNum(state.nextPrestigeAt);
  const aria = ready
    ? "Prestige ready. Open the prestige sheet."
    : `Prestige at ${Math.floor(pct)} percent of ${formatNum(state.nextPrestigeAt)} views this run.`;
  return { title, ready, pct, chip, aria };
}

export function buyButtonText(quote: BuyQuote, mode: BuyMode, name?: string): string {
  if (quote.locked) return "Unlock the row above first";
  const cost = formatNum(quote.cost);
  const who = name ? ` ${name}` : "";
  if (mode === "rank" && quote.gap !== null) {
    if (quote.count > 0 && quote.count < quote.gap) {
      return `Rank ${quote.count}/${quote.gap}${who} \u00b7 ${cost}`;
    }
    return `Rank ${quote.gap}${who} \u00b7 ${cost}`;
  }
  if (name) return `Buy ${quote.count}\u00d7 ${name} \u00b7 ${cost}`;
  return `Buy ${quote.count} \u00b7 ${cost}`;
}

export function bestButtonText(state: GameState, mode: BuyMode, advice: FarmAdvice): string {
  if (advice.bestIndex === null) return "Nothing to buy";
  const def = BUSINESSES[state.planet][advice.bestIndex];
  const quote = quotedBuy(state, advice.bestIndex, mode);
  return `Buy BEST \u00b7 ${quote.count}\u00d7 ${def.name} \u00b7 ${formatNum(quote.cost)}`;
}

/** One muted line under the chips. Teaches the chips; never repeats the BEST winner. */
export function dockHintText(state: GameState, mode: BuyMode, bestMode: boolean): string {
  if (bestMode) {
    if (mode === "rank") {
      return "RANK BEST is the best step toward a rank, not the selected row.";
    }
    if (adviseFarm(state, mode).bestIndex === null) {
      return "Nothing is affordable yet. The advisor will not pretend otherwise.";
    }
    return "BEST spends on the most views per second per view spent. Ties go to the top row.";
  }
  if (mode === "rank") return "RANK buys up to the next \u00d72 rank. Partial is fine.";
  if (mode === "max") return "MAX spends every view you have on this row.";
  return "MAX spends it all. RANK stops at the next \u00d72.";
}

function renderPlanets(state: GameState): string {
  const chips = PLANETS.map((planet) => {
    const locked = !planetUnlocked(state, planet.id);
    const active = state.planet === planet.id;
    return `
      <button
        class="planet ${active ? "is-on" : ""} ${locked ? "is-locked" : ""}"
        data-planet="${planet.id}"
        aria-pressed="${active ? "true" : "false"}"
        ${locked ? "disabled" : ""}
        title="${locked ? planet.unlock : planet.name}"
      ><span aria-hidden="true">${planetShort(planet.id)}</span><span class="sr-only">${planet.name}</span></button>
    `;
  }).join("");
  return `<div class="planets" role="group" aria-label="Planets">${chips}</div>`;
}

function renderChips(state: GameState, buyMode: BuyMode, bestMode: boolean): string {
  // Quantity and BEST are different axes: the chip still says how many the
  // advisor will buy, so it stays lit while BEST picks the row.
  const qty = BUY_CHIPS.map(
    (mode) => `
      <button
        class="chip ${buyMode === mode ? "is-on" : ""}"
        data-buymode="${mode}"
        aria-pressed="${buyMode === mode ? "true" : "false"}"
        title="${chipTitle(mode)}"
      >${chipLabel(mode)}</button>
    `,
  ).join("");
  const advice = bestMode ? adviseFarm(state, buyMode) : null;
  const dead = advice !== null && advice.bestIndex === null;
  return `
    <div class="dock-modes">
      <div class="qty-rail" role="group" aria-label="How many to buy">${qty}</div>
      <button
        class="chip chip-best ${bestMode ? "is-on" : ""} ${dead ? "is-dead" : ""}"
        data-best-mode
        aria-pressed="${bestMode ? "true" : "false"}"
        title="Let the advisor pick the row"
      >BEST</button>
    </div>
    <p class="dock-hint" data-dock-hint>${dockHintText(state, buyMode, bestMode)}</p>
  `;
}

/**
 * Stays in the DOM so it can appear the second a manager becomes affordable,
 * but it is hidden rather than greyed. A dead grey button reads as broken.
 */
function farmHireAll(state: GameState): string {
  const slots = managerSlots(state);
  if (!slots.some((slot) => slot.owned > 0 && !slot.hired)) return "";
  const hot = slots.some((slot) => slot.affordable);
  return `<button class="pill pill-hire is-hot" data-hire-all ${hot ? "" : "hidden"}>Hire all</button>`;
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

function menuHot(state: GameState, now: number): boolean {
  return (
    mgrsHot(state) || dropHot(state, now) || passHot(state) || Boolean(state.pendingChest)
  );
}

function dropText(state: GameState, now: number): string {
  const live = currentEvent(now);
  return `Drop \u00d7${live.def.bonusMult} \u00b7 +${formatNum(extraEventVps(totalMult(state), live.def))}/s`;
}

/**
 * The live drop multiplies every farm and adds income of its own, so a farm
 * with nothing running still earns. Without this the wallet looks like the game
 * is playing itself.
 */
function dropChip(state: GameState, now: number): string {
  return `<button class="hud-chip" data-sheet-open="event" id="drop" title="Live drop. Tap for the details.">${dropText(state, now)}</button>`;
}

function renderDockActions(state: GameState, buyMode: BuyMode, selected: number, bestMode: boolean): string {
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
  return `
    <button class="buy" data-dock-buy ${quote.canBuy ? "" : "disabled"}>
      ${buyButtonText(quote, buyMode, def.name)}
    </button>
  `;
}

/**
 * Under ~0.4s a per-cycle bar is a strobe, not information. Those rows show a
 * steady running state instead. The economy is untouched; only the read changes.
 */
const STROBE_SEC = 0.4;

function barRun(cycleSec: number): boolean {
  return cycleSec <= STROBE_SEC;
}

function cycleCopy(cycleSec: number): string {
  return cycleSec <= MIN_CYCLE_SEC + 1e-6 ? `${formatCycle(cycleSec)} min` : formatCycle(cycleSec);
}

function rankCopy(state: GameState, index: number, owned: number): string {
  const next = nextMilestone(owned);
  if (next === null) return "Ranks maxed";
  const eta = timeToRankSec(state, index);
  const gap = next - owned;
  const when = eta !== null ? ` \u00b7 ~${formatTime(eta * 1000)}` : "";
  return `\u00d72 at ${next} \u00b7 ${formatNum(gap)} to go${when}`;
}

function badgeTitle(badge: string): string {
  if (badge === "best") return "Most views per second per view spent right now";
  if (badge === "lock") return "Next row to unlock";
  return "Slowest climb to its next rank";
}

/** Idle / running / on autopilot. Drives the icon button's look and label. */
function runState(state: GameState, index: number): "auto" | "live" | "ready" | "empty" {
  const row = state.businesses[state.planet][index];
  if (!row || row.owned <= 0) return "empty";
  if (row.manager) return "auto";
  return row.running ? "live" : "ready";
}

function runLabel(state: GameState, index: number, name: string): string {
  const mode = runState(state, index);
  if (mode === "auto") return `Nudge ${name}`;
  if (mode === "live") return `${name} is uploading`;
  if (mode === "ready") return `Upload ${name}`;
  return `${name} not owned yet`;
}

function renderRows(state: GameState, buyMode: BuyMode, selected: number): string {
  const defs = BUSINESSES[state.planet];
  const rows = state.businesses[state.planet];
  const advice = adviseFarm(state, buyMode);
  const cards = defs
    .map((def, index) => {
      const row = rows[index];
      const owns = row.owned > 0;
      const locked = !owns && index > 0 && rows[index - 1].owned <= 0;
      const cycle = cycleSecFor(def.cycleSec, row.owned, state.shop?.tempo ?? 0);
      const vps = rowVps(state, index);
      const badge = advice.badges[index];
      const on = selected === index;
      const fill = owns ? Math.min(100, row.progress * 100) : 0;
      const run = barRun(cycle) && vps > 0;
      const mode = runState(state, index);
      const body = owns
        ? `
          <span class="frow-live">
            <i class="frow-cycle ${run ? "is-running" : ""}" data-row-bar aria-hidden="true"><b data-row-fill style="width:${run ? 100 : fill}%"></b></i>
            <span class="frow-vps" data-row-vps>${vps > 0 ? `${formatNum(vps)}/s` : "idle"}</span>
          </span>
          <span class="frow-foot">
            <span data-row-rank>${rankCopy(state, index, row.owned)}</span>
            <span class="frow-cyclelabel" data-row-cycle>${cycleCopy(cycle)}</span>
          </span>`
        : `
          <span class="frow-pitch">${def.blurb}</span>
          <span class="frow-foot">
            <span>${locked ? "Needs the row above" : `Costs ${formatNum(def.baseCost)} views`}</span>
            <span class="frow-cyclelabel">${formatCycle(def.cycleSec)}</span>
          </span>`;
      return `
        <div class="frow ${on ? "is-on" : ""} ${owns ? "is-owned" : "is-cold"} ${locked ? "is-locked" : ""}" data-row="${index}">
          <button
            class="frow-run is-${mode}"
            data-run="${index}"
            data-row-run
            ${owns ? "" : "disabled"}
            aria-label="${runLabel(state, index, def.name)}"
          >
            <span class="frow-icon" aria-hidden="true">${def.icon}</span>
            <span class="frow-auto" aria-hidden="true"></span>
          </button>
          <button class="frow-pick" data-select="${index}" aria-pressed="${on ? "true" : "false"}">
            <span class="frow-name">${def.name}</span>
            <span class="frow-tags">
              <span class="badge ${badge ? `is-${badge}` : "is-off"}" data-row-badge ${badge ? `title="${badgeTitle(badge)}"` : ""}>${badge ? badge.toUpperCase() : ""}</span>
              ${owns ? `<span class="frow-owned" data-row-owned>\u00d7${formatNum(row.owned)}</span>` : ""}
            </span>
            ${body}
          </button>
          ${
            on
              ? `<button class="frow-open" data-enter="${index}" aria-label="Open ${def.name}" title="Open ${def.name}">\u203a</button>`
              : ""
          }
        </div>
      `;
    })
    .join("");
  return `<div class="rows" id="biz-list">${cards}</div>`;
}

function renderOutside(state: GameState, buyMode: BuyMode, selected: number): string {
  return `
    <div class="farm-bar">
      <strong class="farm-name">${planetName(state.planet)} farm</strong>
      <div class="farm-tools">
        ${farmHireAll(state)}
        ${renderPlanets(state)}
      </div>
    </div>
    ${
      state.pendingChest
        ? `<button class="strip strip-gold" data-sheet-open="chest">
            <span class="strip-icon" aria-hidden="true">\u2022</span>
            <span class="strip-copy"><strong>Comeback chest</strong><small>+${formatNum(state.pendingChest.views)} views waiting</small></span>
            <span class="strip-go">Open</span>
          </button>`
        : ""
    }
    ${
      state.planet === "simulation"
        ? `<p class="farm-note">Poster planet. The starter pays. The next copy is 1T+ views, so this is scenery for now.</p>`
        : ""
    }
    ${
      state.seenTooltip
        ? ""
        : `<aside class="tip" data-tip>
            <span class="tip-copy">
              <strong>Tap an icon to post. Tap a row to aim.</strong>
              <span>One clip per tap until you hire a manager.</span>
            </span>
            <button class="pill" data-dismiss-tip>Got it</button>
          </aside>`
    }
    ${renderRows(state, buyMode, selected)}
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
  const price = managerPrice(state, state.planet, selected);
  const hint = row.manager
    ? "On autopilot \u00b7 tap to nudge the bar"
    : row.owned <= 0
      ? "Buy one to start"
      : "Tap to upload";
  return `
    <div class="inside-bar">
      <button class="pill pill-back" data-farm>\u2190 Farm</button>
      <span class="inside-count" data-inside-owned>\u00d7${formatNum(row.owned)}</span>
    </div>
    <article class="card" data-biz="${selected}" id="biz-list">
      <header class="card-head">
        <span class="card-icon" aria-hidden="true">${def.icon}</span>
        <span class="card-copy">
          <strong>${def.name}</strong>
          <small data-inside-hint>${hint}</small>
        </span>
      </header>
      <button
        class="bar ${barRun(cycle) && rowVps(state, selected) > 0 ? "is-running" : ""}"
        data-run="${selected}"
        data-inside-bar
        ${row.owned <= 0 ? "disabled" : ""}
        aria-label="Upload ${def.name}"
      >
        <i data-inside-fill style="width:${barRun(cycle) && rowVps(state, selected) > 0 ? 100 : pct}%"></i>
        <span data-inside-payout>${row.owned > 0 ? `${formatNum(income)} views` : "\u2014"}</span>
        <em class="nudge-pip" hidden>+refresh</em>
      </button>
      <dl class="card-stats">
        <div><dt>Per second</dt><dd data-inside-vps>${row.owned > 0 ? `${formatNum(rowVps(state, selected))}/s` : "\u2014"}</dd></div>
        <div><dt>Cycle</dt><dd data-inside-cycle>${cycleCopy(row.owned > 0 ? cycle : def.cycleSec)}</dd></div>
        <div><dt>Next rank</dt><dd data-inside-rank>${milestone ?? "max"}</dd></div>
      </dl>
      <p class="blurb">${def.blurb}</p>
      <button
        class="pill pill-wide"
        data-card-mgr
        ${row.manager || row.owned <= 0 || state.views < price ? "disabled" : ""}
      >${row.manager ? "Managed" : `${def.managerName} \u00b7 ${formatNum(price)}`}</button>
    </article>
  `;
}

function renderManagers(state: GameState): string {
  const blocks = unlockedPlanets(state)
    .map((planet) => {
      const rowsHtml = BUSINESSES[planet]
        .map((def, index) => {
          const row = state.businesses[planet][index];
          const hired = row.manager;
          const locked = row.owned <= 0;
          const cost = managerPrice(state, planet, index);
          const disabled = hired || locked || state.views < cost;
          return `
            <article class="list-row ${locked ? "is-dim" : ""} ${hired ? "is-done" : ""}">
              <span class="list-icon" aria-hidden="true">${def.icon}</span>
              <span class="list-copy">
                <strong>${def.name}</strong>
                <small>${locked ? "Own one first" : hired ? "On autopilot" : def.managerName}</small>
              </span>
              <button
                class="pill"
                data-hire
                data-hire-planet="${planet}"
                data-hire-index="${index}"
                ${disabled ? "disabled" : ""}
              >${hired ? "Managed" : `Hire \u00b7 ${formatNum(cost)}`}</button>
            </article>
          `;
        })
        .join("");
      return `
        <section class="list-block" data-mgr-planet="${planet}">
          <h3>${planetName(planet)}</h3>
          ${rowsHtml}
        </section>
      `;
    })
    .join("");
  return `
    <button class="buy" data-hire-all ${mgrsHot(state) ? "" : "disabled"}>Hire all affordable</button>
    <p class="sheet-note">Same views either way. A manager just means you stop tapping.</p>
    ${blocks}
  `;
}

function renderEvent(state: GameState, now: number): string {
  const live = currentEvent(now);
  const claimed = state.event.claimedDropId === live.def.id;
  const extraVps = extraEventVps(totalMult(state), live.def);
  return `
    <p class="sheet-note">${live.def.blurb}</p>
    <dl class="card-stats">
      <div><dt>Farms</dt><dd>${live.def.bonusMult}\u00d7</dd></div>
      <div><dt>${live.def.extraName}</dt><dd>${formatNum(extraVps)}/s</dd></div>
      <div><dt>Clout</dt><dd>${formatNum(state.event.clout)}</dd></div>
    </dl>
    <button class="buy" data-claim-drop ${claimed ? "disabled" : ""}>
      ${claimed ? "Drop claimed" : `Claim drop \u00b7 ${formatNum(live.def.dropViews)} views`}
    </button>
    <div class="list-block">
      <h3>Clout track</h3>
      ${EVENT_SHOP.map((item) => {
        const done = state.event.claimed.includes(item.id);
        const can = !done && state.event.clout >= item.clout;
        const prize =
          item.kind === "title"
            ? item.title
            : item.kind === "mult"
              ? `+${item.amount}\u00d7`
              : `${formatNum(item.amount ?? 0)} views`;
        return `
          <article class="list-row ${done ? "is-done" : ""}">
            <span class="list-copy">
              <strong>${item.name}</strong>
              <small>${item.clout} clout \u00b7 ${prize}</small>
            </span>
            <button class="pill" data-claim-event="${item.id}" ${can ? "" : "disabled"}>
              ${done ? "Owned" : "Claim"}
            </button>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderPass(state: GameState): string {
  return `
    <p class="sheet-note">Free track. Earned by posting, not by paying. Half of it is titles.</p>
    <div class="list-block">
      ${PASS_TIERS.map((tier) => {
        const done = state.pass.claimed.includes(tier.id);
        const can = !done && state.lifetimeViews >= tier.at;
        const prize =
          tier.kind === "title"
            ? tier.title
            : tier.kind === "mult"
              ? `+${tier.amount}\u00d7 viral`
              : `${formatNum(tier.amount ?? 0)} views`;
        return `
          <article class="list-row ${done ? "is-done" : ""}">
            <span class="list-copy">
              <strong>${tier.name}</strong>
              <small>${formatNum(tier.at)} lifetime \u00b7 ${prize}</small>
            </span>
            <button class="pill" data-claim-pass="${tier.id}" ${can ? "" : "disabled"}>
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
    <section class="list-block">
      <h3>Idle chest ${rank}/${IDLE_CHEST_MAX_RANK}</h3>
      <article class="list-row">
        <span class="list-copy">
          <strong>Longer chest</strong>
          <small>Fills up to ${formatTime(preview.durationMs)} at ${Math.round(preview.rate * 100)}% of manager views. Away 60s+ to claim.</small>
        </span>
        <button class="pill" data-chest-up ${maxed || !can ? "disabled" : ""}>
          ${maxed ? "Max" : `Buy \u00b7 ${formatNum(cost)}`}
        </button>
      </article>
    </section>
  `;
}

function renderHypeShop(state: GameState): string {
  return `
    <section class="list-block">
      <h3>Hype shop \u00b7 ${formatNum(state.hype)} banked</h3>
      ${HYPE_SHOP.map((item) => {
        const level = shopLevel(state, item.id);
        const maxed = level >= item.max;
        const cost = shopCost(item.id, level);
        const can = canBuyShop(state, item.id);
        return `
          <article class="list-row ${maxed ? "is-done" : ""}">
            <span class="list-copy">
              <strong>${item.name} <span class="list-level">${level}/${item.max}</span></strong>
              <small>${item.blurb}</small>
            </span>
            <button class="pill ${can ? "is-hot" : ""}" data-shop-buy="${item.id}" ${can ? "" : "disabled"}>
              ${maxed ? "Max" : `${formatNum(cost)} Hype`}
            </button>
          </article>
        `;
      }).join("")}
    </section>
  `;
}

type SheetOpts = {
  key: string;
  title: string;
  sub?: string;
  body: string;
  tall?: boolean;
};

function sheetShell(opts: SheetOpts): string {
  const id = `sheet-title-${opts.key}`;
  return `
    <div class="sheet is-on" data-sheet>
      <button class="sheet-back" data-sheet-close aria-label="Close" tabindex="-1"></button>
      <div
        class="sheet-card ${opts.tall ? "is-tall" : ""}"
        role="dialog"
        aria-modal="true"
        aria-labelledby="${id}"
        data-sheet-card
      >
        <div class="sheet-head">
          <div class="sheet-head-copy">
            <strong id="${id}">${opts.title}</strong>
            ${opts.sub ? `<p>${opts.sub}</p>` : ""}
          </div>
          <button class="sheet-x" data-sheet-close aria-label="Close">\u00d7</button>
        </div>
        <div class="sheet-body">${opts.body}</div>
      </div>
    </div>
  `;
}

function menuRow(
  attr: string,
  label: string,
  detail: string,
  flag: string,
): string {
  return `
    <button class="menu-row" ${attr}>
      <span class="list-copy">
        <strong>${label}</strong>
        <small>${detail}</small>
      </span>
      ${flag ? `<span class="menu-flag">${flag}</span>` : `<span class="menu-go" aria-hidden="true">\u203a</span>`}
    </button>
  `;
}

function renderMenu(state: GameState, now: number): string {
  const live = currentEvent(now);
  const left = Math.max(0, live.endsAt - now);
  const slots = managerSlots(state);
  const waiting = slots.filter((slot) => slot.owned > 0 && !slot.hired).length;
  const ready = slots.filter((slot) => slot.affordable).length;
  const passDone = state.pass.claimed.length;
  const rows = [
    state.pendingChest
      ? menuRow(
          'data-sheet-open="chest"',
          "Comeback chest",
          `+${formatNum(state.pendingChest.views)} views from your time away`,
          "Ready",
        )
      : "",
    menuRow(
      'data-sheet-open="managers"',
      "Managers",
      waiting > 0 ? `${waiting} farm${waiting === 1 ? "" : "s"} still tapped by hand` : "Every owned farm is on autopilot",
      ready > 0 ? `${ready} ready` : "",
    ),
    menuRow(
      'data-sheet-open="event"',
      "Drop",
      `${live.def.name} \u00b7 ${live.def.bonusMult}\u00d7 farms \u00b7 ${formatTime(left)} left`,
      dropHot(state, now) ? "Free" : "",
    ),
    menuRow(
      'data-sheet-open="pass"',
      "Pass",
      `Infinity Intern \u00b7 ${passDone}/${PASS_TIERS.length} claimed`,
      passHot(state) ? "Claim" : "",
    ),
    menuRow('data-sheet-open="recap"', "Stats", "Lifetime views, viral, Hype, playtime", ""),
    menuRow('data-sheet-open="settings"', "Settings", "Chest, sound, export, import, reset", ""),
    menuRow('data-sheet-open="legal"', "Privacy & legal", "What is stored, and how to delete it", ""),
  ]
    .filter(Boolean)
    .join("");
  return `<div class="menu-list">${rows}</div>
    <p class="sheet-note">Nothing in here costs money. There is no checkout.</p>`;
}

/**
 * Says exactly what the game does with data, in the app rather than only in a
 * markdown file. Keep it factual: the strong position here is that there is
 * nothing to collect, not that a policy permits collecting it.
 */
function renderLegal(state: GameState): string {
  return `
    <section class="list-block">
      <h3>What is stored</h3>
      <article class="list-row">
        <span class="list-copy">
          <strong>Your progress and your player name</strong>
          <small>Views, farms, managers, Hype, upgrades, and which screen you were last on. Kept in this browser's local storage on this device.</small>
        </span>
      </article>
      <article class="list-row">
        <span class="list-copy">
          <strong>Nothing else, and nowhere else</strong>
          <small>No account, no password, no email, no server, no analytics, no advertising, no tracking, no cookies for tracking, no third-party requests. The fonts ship with the game.</small>
        </span>
      </article>
      <article class="list-row">
        <span class="list-copy">
          <strong>Nothing is for sale</strong>
          <small>No purchases, no currency you can buy, no ads, no checkout. Hype is earned by playing.</small>
        </span>
      </article>
    </section>
    <section class="list-block">
      <h3>Your data, your call</h3>
      <article class="list-row">
        <span class="list-copy">
          <strong>Take it with you</strong>
          <small>Copy export in settings hands you the whole save as JSON.</small>
        </span>
        <button class="pill" data-export>Export</button>
      </article>
      <article class="list-row">
        <span class="list-copy">
          <strong>Delete everything</strong>
          <small>Erases every save on this browser, every player name, and the saved screen. Immediate and unrecoverable.</small>
        </span>
        <button class="pill pill-danger" data-erase-all>Delete all</button>
      </article>
    </section>
    <section class="list-block">
      <h3>Notices</h3>
      <article class="list-row">
        <span class="list-copy">
          <strong>Parody, not a licensed product</strong>
          <small>A joke about algorithmic video platforms in general. It is not affiliated with, endorsed by, or connected to any real platform or company, and no real brand is used in the game.</small>
        </span>
      </article>
      <article class="list-row">
        <span class="list-copy">
          <strong>Fonts</strong>
          <small>IBM Plex Sans and IBM Plex Mono &copy; IBM Corp. Bebas Neue &copy; Dharma Type. Both under the SIL Open Font License 1.1, bundled at /fonts/.</small>
        </span>
      </article>
      <article class="list-row">
        <span class="list-copy">
          <strong>The game itself</strong>
          <small>MIT licensed. Provided as is, with no warranty of any kind. It is a toy: do not rely on it for anything.</small>
        </span>
      </article>
      ${
        state.muted
          ? ""
          : `<article class="list-row">
              <span class="list-copy">
                <strong>Sound</strong>
                <small>Short generated tones only. No microphone, no camera, no recording. Mute lives in settings.</small>
              </span>
            </article>`
      }
    </section>
    <p class="sheet-note">Full text: docs/PRIVACY.md, docs/TERMS.md and docs/THIRD-PARTY.md in the repository.</p>
  `;
}

function renderSheet(state: GameState, sheet: UiSheet, now: number): string {
  if (sheet === "menu") {
    return sheetShell({
      key: "menu",
      title: "Menu",
      sub: "The rare jobs live here so the farm keeps the screen.",
      body: renderMenu(state, now),
      tall: true,
    });
  }
  if (sheet === "prestige") {
    const goal = goalCopy(state);
    const gain = prestigeGain(state.viewsThisRun, state.prestigeCount);
    const showAlgo = canAlgo(state);
    return sheetShell({
      key: "prestige",
      title: goal.title,
      sub: goal.ready
        ? `Reset every farm. Bank ${gain.toFixed(1)} Hype. Planets stay unlocked.`
        : "Every farm resets. Hype and the shop do not. Planets stay unlocked.",
      tall: true,
      body: `
        <div class="goal-track" aria-hidden="true"><i id="goal-bar" style="width:${goal.pct}%"></i></div>
        <p class="sheet-meter">${formatNum(state.viewsThisRun)} / ${formatNum(state.nextPrestigeAt)} views this run</p>
        <button class="buy" data-prestige-go ${goal.ready ? "" : "disabled"}>${
          goal.ready
            ? `Prestige \u00b7 bank ${gain.toFixed(1)} Hype`
            : `Needs ${formatNum(state.nextPrestigeAt)} views this run`
        }</button>
        ${renderHypeShop(state)}
        ${
          showAlgo
            ? `<section class="list-block">
                <h3>Second layer</h3>
                <article class="list-row">
                  <span class="list-copy">
                    <strong>Enter the algorithm</strong>
                    <small>Viral resets to 1.00\u00d7. You keep +${algoGain(state.prestigeMult, state.prestigeCount).toFixed(2)}\u00d7 Algo and the Hype shop.</small>
                  </span>
                  <button class="pill" data-algo-go>Algo</button>
                </article>
              </section>`
            : ""
        }
      `,
    });
  }
  if (sheet === "algo") {
    const gain = algoGain(state.prestigeMult, state.prestigeCount).toFixed(2);
    return sheetShell({
      key: "algo",
      title: "Enter the algorithm?",
      sub: `Viral resets to 1.00\u00d7. You keep +${gain}\u00d7 Algo, The Simulation, and the Hype shop.`,
      body: `
        <div class="sheet-actions">
          <button class="pill" data-sheet-close>Cancel</button>
          <button class="buy" data-algo-go ${canAlgo(state) ? "" : "disabled"}>Algo</button>
        </div>
      `,
    });
  }
  if (sheet === "chest") {
    const chest = state.pendingChest;
    return sheetShell({
      key: "chest",
      title: "Comeback chest",
      sub: `Away ${chest ? formatTime(chest.offlineMs) : "a bit"}. Bonus ${chest ? formatNum(chest.views) : "0"} views on top of what the managers already banked.`,
      tall: true,
      body: `
        <button class="buy" data-claim-chest ${chest ? "" : "disabled"}>Open chest \u00b7 +${formatNum(chest?.views ?? 0)}</button>
        ${renderChestUpgrade(state)}
      `,
    });
  }
  if (sheet === "recap") {
    const snap = recap(state);
    return sheetShell({
      key: "recap",
      title: "Stats",
      sub: state.title ? `Title: ${state.title}` : "No title yet. Post more slop.",
      tall: true,
      body: `
        <dl class="card-stats is-grid">
          <div><dt>Lifetime</dt><dd>${formatNum(snap.lifetimeViews)}</dd></div>
          <div><dt>This run</dt><dd>${formatNum(snap.viewsThisRun)}</dd></div>
          <div><dt>Per second</dt><dd>${formatNum(snap.vps)}/s</dd></div>
          <div><dt>Viral</dt><dd>${snap.prestigeMult.toFixed(2)}\u00d7</dd></div>
          <div><dt>Shop</dt><dd>${snap.shopViral.toFixed(2)}\u00d7</dd></div>
          <div><dt>Algo</dt><dd>${snap.algoMult.toFixed(2)}\u00d7</dd></div>
          <div><dt>Hype</dt><dd>${formatNum(snap.hype)}</dd></div>
          <div><dt>Prestiges</dt><dd>${snap.prestigeCount}</dd></div>
          <div><dt>Managers</dt><dd>${snap.managers}</dd></div>
          <div><dt>Chests</dt><dd>${snap.chests}</dd></div>
          <div><dt>Playtime</dt><dd>${formatTime(snap.playMs)}</dd></div>
          <div><dt>Clout</dt><dd>${formatNum(snap.clout)}</dd></div>
        </dl>
      `,
    });
  }
  if (sheet === "import") {
    return sheetShell({
      key: "import",
      title: "Import save",
      sub: "Paste a JSON export. Local only. This replaces the current farm.",
      body: `
        <textarea id="import-box" class="save-box" rows="6" placeholder="{ ... }" data-autofocus aria-label="Save JSON"></textarea>
        <div class="sheet-actions">
          <button class="pill" data-sheet-close>Cancel</button>
          <button class="buy" data-import-go>Import</button>
        </div>
      `,
    });
  }
  if (sheet === "settings") {
    return sheetShell({
      key: "settings",
      title: "Settings",
      sub: "Local to this browser. Lives on this PC. No ads, no IAP, no checkout.",
      tall: true,
      body: `
        ${renderChestUpgrade(state)}
        <div class="sheet-stack">
          <button class="pill pill-wide" data-mute>${state.muted ? "Unmute juice" : "Mute juice"}</button>
          <button class="pill pill-wide" data-export>Copy export</button>
          <button class="pill pill-wide" data-import-ask>Import save</button>
          <button class="pill pill-wide" data-sheet-open="legal">Privacy &amp; legal</button>
          <button class="pill pill-wide pill-danger" data-reset>Reset this save</button>
        </div>
      `,
    });
  }
  if (sheet === "legal") {
    return sheetShell({
      key: "legal",
      title: "Privacy & legal",
      sub: "Local game, local save, nothing sold, nothing sent.",
      tall: true,
      body: renderLegal(state),
    });
  }
  if (sheet === "managers") {
    return sheetShell({
      key: "managers",
      title: "Managers",
      sub: "Hire once. They post without you, awake or not.",
      tall: true,
      body: renderManagers(state),
    });
  }
  if (sheet === "event") {
    const live = currentEvent(now);
    return sheetShell({
      key: "event",
      title: live.def.name,
      sub: `Ends in ${formatTime(Math.max(0, live.endsAt - now))}`,
      tall: true,
      body: renderEvent(state, now),
    });
  }
  if (sheet === "pass") {
    return sheetShell({
      key: "pass",
      title: "Infinity Intern",
      sub: "Lifetime views only. Nothing here is for sale.",
      tall: true,
      body: renderPass(state),
    });
  }
  return "";
}

const PITCH_POINTS: { k: string; strong: string; rest: string }[] = [
  {
    k: "Aim",
    strong: "Tap a farm, then buy it.",
    rest: "The mint button always names the row you picked and what it costs.",
  },
  {
    k: "Stay",
    strong: "The farm is the game.",
    rest: "Hiring, drops and the pass open over the list. Nothing replaces it.",
  },
  {
    k: "Reset",
    strong: "Prestige when the chip fills.",
    rest: "Farms reset. Hype does not. Spend it on upgrades that stay.",
  },
];

function renderPitchMock(): string {
  const rows = [
    { icon: "\ud83d\udcf1", name: "Cursed Short", fill: 68, tag: "BEST" },
    { icon: "\ud83d\udcdd", name: "Faceless Listicle", fill: 34, tag: "" },
    { icon: "\ud83c\udf99\ufe0f", name: "AI Voiceover Essay", fill: 12, tag: "" },
  ]
    .map(
      (row, i) => `
        <div class="mock-row ${i === 0 ? "is-on" : ""}">
          <span class="mock-icon">${row.icon}</span>
          <span class="mock-name">${row.name}</span>
          ${row.tag ? `<span class="mock-tag">${row.tag}</span>` : ""}
          <i class="mock-bar" style="--fill:${row.fill}%"><b></b></i>
        </div>`,
    )
    .join("");
  return `
    <div class="mock" aria-hidden="true">
      <div class="mock-hud">
        <span class="mock-views">1.24M</span>
        <span class="mock-vps">18.2K/s</span>
        <span class="mock-goal"><b></b></span>
      </div>
      ${rows}
      <div class="mock-dock"><span>Buy 10\u00d7 Cursed Short \u00b7 84.1K</span></div>
    </div>
  `;
}

function renderLanding(state: GameState, session: UiSession): string {
  const progress = hasSaveProgress(state);
  const last = session.username;
  const signedIn = Boolean(last);
  const continueLabel = progress
    ? `Continue \u00b7 ${escapeHtml(last)} \u00b7 ${formatNum(state.views)} views`
    : `Continue \u00b7 ${escapeHtml(last)}`;
  const others = session.names.filter((name) => !usernameActive(last, name));
  return `
    <div class="frame frame-pitch">
      <main class="pitch">
        <header class="pitch-head">
          <img class="pitch-mark" src="/favicon.svg" width="52" height="52" alt="" />
          <p class="wordmark wordmark-xl"><span class="ink-mint">Slop</span> Capitalist</p>
          <p class="pitch-tag">An idle tycoon about farming the algorithm. You do not make content. You make throughput.</p>
        </header>
        ${renderPitchMock()}
        <ol class="pitch-points">
          ${PITCH_POINTS.map(
            (point) => `
              <li>
                <span class="pitch-k">${point.k}</span>
                <span class="pitch-copy"><strong>${point.strong}</strong> ${point.rest}</span>
              </li>`,
          ).join("")}
        </ol>
        <form class="pitch-auth" data-signin-form>
          <label class="field">
            <span class="field-label">Player name</span>
            <input
              id="username"
              class="field-input"
              data-username
              type="text"
              maxlength="24"
              autocomplete="username"
              placeholder="${signedIn ? escapeHtml(last) : "Pick any name"}"
              value="${escapeHtml(last)}"
            />
          </label>
          ${
            signedIn
              ? `<button class="buy buy-lg" data-continue data-continue-user="${escapeHtml(last)}">${continueLabel}</button>
                 <div class="pitch-alt">
                   <button class="link" data-sign-in type="submit">Switch or create a player</button>
                   <button class="link link-danger" data-new-run type="button">New run</button>
                 </div>`
              : `<button class="buy buy-lg" data-sign-in type="submit">Start posting</button>
                 <p class="pitch-hint">No password. No email. The name is just which save to load.</p>`
          }
        </form>
        ${
          others.length
            ? `<div class="pitch-users">
                <span class="field-label">Other saves</span>
                <div class="pitch-users-row">${others
                  .map(
                    (name) =>
                      `<button type="button" class="pill" data-user-pick="${escapeHtml(name)}">${escapeHtml(name)}</button>`,
                  )
                  .join("")}</div>
              </div>`
            : ""
        }
        <footer class="pitch-foot">
          <p>Saves live in this browser. No account, no ads, no checkout, nothing sent anywhere. It runs on one PC and that is the whole plan.</p>
          <button type="button" class="link" data-sheet-open="legal">Privacy &amp; legal</button>
        </footer>
        <div id="toast-slot" class="toast-slot is-static" role="status" aria-live="polite"></div>
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
    manageSheetFocus(root, sheet, handlers);
    return;
  }

  const goal = goalCopy(state);
  const showAlgo = algoVisible(state);
  const algoReady = canAlgo(state);

  root.innerHTML = `
    <div class="frame">
      <header class="hud" ${sheet ? "inert" : ""}>
        <div class="hud-brand">
          <button class="brandmark" data-home aria-label="Slop Capitalist \u2014 back to the start screen">
            <span class="ink-mint">Slop</span> Capitalist
          </button>
          ${state.title ? `<span class="hud-title">${escapeHtml(state.title)}</span>` : ""}
          <button class="hud-menu ${menuHot(state, clock) ? "is-hot" : ""}" data-overflow aria-label="Menu">
            <span class="hud-menu-icon" aria-hidden="true"></span>
          </button>
        </div>
        <div class="hud-body">
          <div class="hud-money">
            <strong id="views" class="hud-views">${formatNum(state.views)}</strong>
            <span class="hud-unit">views</span>
            <em id="vps" class="hud-vps">${formatNum(globalViewsPerSec(state, clock))}/s</em>
          </div>
          <button
            class="hud-goal ${goal.ready ? "is-ready" : ""} ${shopHot(state) ? "is-hot" : ""}"
            data-prestige
            aria-label="${goal.aria}"
          >
            <span class="hud-goal-top">Prestige</span>
            <i class="meter" aria-hidden="true"><b id="goal-bar" style="width:${goal.pct}%"></b></i>
            <span class="hud-goal-sub" id="goal-sub">${goal.chip}</span>
          </button>
          <div class="hud-meta">
            <span id="mult">Viral ${totalMult(state).toFixed(2)}\u00d7</span>
            ${dropChip(state, clock)}
            ${
              state.hype > 0 || state.prestigeCount > 0
                ? `<span id="hype">Hype ${formatNum(state.hype)}</span>`
                : ""
            }
            ${
              showAlgo
                ? algoReady
                  ? `<button class="hud-chip is-ready" data-algo id="algo">Algo ${state.algoMult.toFixed(2)}\u00d7 \u00b7 ready</button>`
                  : `<span id="algo">Algo ${state.algoMult.toFixed(2)}\u00d7</span>`
                : ""
            }
          </div>
        </div>
      </header>
      <main class="camera" ${sheet ? "inert" : ""}>${renderCamera(state, buyMode, view)}</main>
      <footer class="dock">
        <div id="toast-slot" class="toast-slot" role="status" aria-live="polite"></div>
        ${renderChips(state, buyMode, view.bestMode)}
        <div class="dock-actions" id="dock-actions">
          ${renderDockActions(state, buyMode, view.selected, view.bestMode)}
        </div>
      </footer>
      ${renderSheet(state, sheet, clock)}
    </div>
  `;

  bindChrome(root, view, handlers);
  manageSheetFocus(root, sheet, handlers);
  if (keyboardRows && view.screen === "outside" && !sheet) {
    root.querySelector<HTMLElement>(`[data-row="${view.selected}"] [data-select]`)?.focus();
  }
}

let keyboardRows = false;
let focusedSheet: UiSheet = null;

function focusables(scope: HTMLElement): HTMLElement[] {
  return Array.from(
    scope.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("hidden"));
}

function manageSheetFocus(root: HTMLElement, sheet: UiSheet, handlers: UiHandlers): void {
  const card = root.querySelector<HTMLElement>("[data-sheet-card]");
  if (!card) {
    focusedSheet = null;
    return;
  }
  card.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handlers.onSheetClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables(card);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = root.ownerDocument?.activeElement as HTMLElement | null;
    if (event.shiftKey && (active === first || !card.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });
  if (focusedSheet !== sheet) {
    focusedSheet = sheet;
    const target = card.querySelector<HTMLElement>("[data-autofocus]") ?? focusables(card)[0];
    target?.focus();
  }
}

/** Arrows walk the list. Enter is the button's own click, so it needs no handler. */
function bindRowKeys(root: HTMLElement, handlers: UiHandlers): void {
  const picks = Array.from(root.querySelectorAll<HTMLElement>("[data-select]"));
  if (picks.length === 0) return;
  const move = (index: number) => {
    keyboardRows = true;
    handlers.onSelect(Math.min(picks.length - 1, Math.max(0, index)));
  };
  picks.forEach((pick) => {
    pick.addEventListener("keydown", (event) => {
      const index = Number(pick.dataset.select);
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          move(index + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          move(index - 1);
          break;
        case "Home":
          event.preventDefault();
          move(0);
          break;
        case "End":
          event.preventDefault();
          move(picks.length - 1);
          break;
        default:
          break;
      }
    });
  });
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
  root.querySelector("[data-erase-all]")?.addEventListener("click", handlers.onEraseAll);
  root.querySelector("[data-farm]")?.addEventListener("click", handlers.onFarm);
  root.querySelector("[data-buy-best]")?.addEventListener("click", handlers.onBuyBest);
  root.querySelector("[data-dock-buy]")?.addEventListener("click", () => handlers.onBuy(view.selected));
  root.querySelector("[data-card-mgr]")?.addEventListener("click", () => handlers.onManager(view.selected));
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

  root.querySelectorAll<HTMLElement>("[data-select]").forEach((pick) => {
    pick.addEventListener("click", () => {
      keyboardRows = false;
      handlers.onSelect(Number(pick.dataset.select));
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-enter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      keyboardRows = false;
      handlers.onEnter(Number(btn.dataset.enter));
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-run]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onRun(Number(btn.dataset.run)));
  });
  bindRowKeys(root, handlers);
}

function patchGoal(root: HTMLElement, state: GameState): void {
  const goal = goalCopy(state);
  const bar = root.querySelector<HTMLElement>("#goal-bar");
  const chip = root.querySelector<HTMLButtonElement>("[data-prestige]");
  const sub = root.querySelector<HTMLElement>("#goal-sub");
  if (bar) bar.style.width = `${goal.pct}%`;
  if (sub) sub.textContent = goal.chip;
  if (chip) {
    chip.classList.toggle("is-ready", goal.ready);
    chip.classList.toggle("is-hot", shopHot(state));
    chip.setAttribute("aria-label", goal.aria);
  }
}

function patchOutsideRows(
  root: HTMLElement,
  state: GameState,
  buyMode: BuyMode,
  selected: number,
): void {
  const defs = BUSINESSES[state.planet];
  const rows = state.businesses[state.planet];
  const advice = adviseFarm(state, buyMode);

  defs.forEach((def, index) => {
    const row = rows[index];
    const el = root.querySelector<HTMLElement>(`[data-row="${index}"]`);
    if (!el) return;
    const on = selected === index;
    el.classList.toggle("is-on", on);
    el.querySelector("[data-select]")?.setAttribute("aria-pressed", on ? "true" : "false");
    const runBtn = el.querySelector<HTMLButtonElement>("[data-row-run]");
    if (runBtn) {
      const mode = runState(state, index);
      runBtn.classList.toggle("is-ready", mode === "ready");
      runBtn.classList.toggle("is-live", mode === "live");
      runBtn.classList.toggle("is-auto", mode === "auto");
      runBtn.classList.toggle("is-empty", mode === "empty");
      runBtn.disabled = mode === "empty";
      runBtn.setAttribute("aria-label", runLabel(state, index, def.name));
    }
    const cycleSec = cycleSecFor(def.cycleSec, row.owned, state.shop?.tempo ?? 0);
    const vps = rowVps(state, index);
    const run = barRun(cycleSec) && vps > 0;
    const bar = el.querySelector<HTMLElement>("[data-row-bar]");
    if (bar) bar.classList.toggle("is-running", run);
    const fill = el.querySelector<HTMLElement>("[data-row-fill]");
    if (fill) fill.style.width = run ? "100%" : `${Math.min(100, row.progress * 100)}%`;
    const vpsEl = el.querySelector("[data-row-vps]");
    if (vpsEl) vpsEl.textContent = vps > 0 ? `${formatNum(vps)}/s` : "idle";
    const cycleEl = el.querySelector("[data-row-cycle]");
    if (cycleEl) cycleEl.textContent = cycleCopy(cycleSec);
    const rankEl = el.querySelector("[data-row-rank]");
    if (rankEl) rankEl.textContent = rankCopy(state, index, row.owned);
    const badge = advice.badges[index];
    const badgeEl = el.querySelector("[data-row-badge]");
    if (badgeEl) {
      badgeEl.textContent = badge ? badge.toUpperCase() : "";
      badgeEl.className = `badge ${badge ? `is-${badge}` : "is-off"}`;
      if (badge) badgeEl.setAttribute("title", badgeTitle(badge));
      else badgeEl.removeAttribute("title");
    }
    const ownedEl = el.querySelector("[data-row-owned]");
    if (ownedEl) ownedEl.textContent = `\u00d7${formatNum(row.owned)}`;
  });
}

function patchInside(root: HTMLElement, state: GameState, selected: number): void {
  const def = BUSINESSES[state.planet][selected];
  const row = state.businesses[state.planet][selected];
  if (!def || !row) return;
  const cycleSec = cycleSecFor(def.cycleSec, row.owned, state.shop?.tempo ?? 0);
  const run = barRun(cycleSec) && rowVps(state, selected) > 0;
  const bar = root.querySelector<HTMLElement>("[data-inside-bar]");
  if (bar) bar.classList.toggle("is-running", run);
  const fill = root.querySelector<HTMLElement>("[data-inside-fill]");
  if (fill) fill.style.width = run ? "100%" : `${Math.min(100, row.progress * 100)}%`;
  const payout = root.querySelector("[data-inside-payout]");
  if (payout) {
    payout.textContent =
      row.owned > 0 ? `${formatNum(cycleIncome(state.planet, selected, row.owned, totalMult(state)))} views` : "\u2014";
  }
  const hint = root.querySelector("[data-inside-hint]");
  if (hint) {
    hint.textContent = row.manager
      ? "On autopilot \u00b7 tap to nudge the bar"
      : row.owned <= 0
        ? "Buy one to start"
        : "Tap to upload";
  }
  root.querySelectorAll<HTMLButtonElement>("[data-run]").forEach((btn) => {
    btn.disabled = row.owned <= 0;
  });
  const owned = root.querySelector("[data-inside-owned]");
  if (owned) owned.textContent = `\u00d7${formatNum(row.owned)}`;
  const vps = root.querySelector("[data-inside-vps]");
  if (vps) vps.textContent = row.owned > 0 ? `${formatNum(rowVps(state, selected))}/s` : "\u2014";
  const cycle = root.querySelector("[data-inside-cycle]");
  if (cycle) cycle.textContent = cycleCopy(row.owned > 0 ? cycleSec : def.cycleSec);
  const rank = root.querySelector("[data-inside-rank]");
  if (rank) rank.textContent = String(nextMilestone(row.owned) ?? "max");
  const mgr = root.querySelector<HTMLButtonElement>("[data-card-mgr]");
  if (mgr) {
    const price = managerPrice(state, state.planet, selected);
    mgr.disabled = row.manager || row.owned <= 0 || state.views < price;
    mgr.textContent = row.manager ? "Managed" : `${def.managerName} \u00b7 ${formatNum(price)}`;
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
    btn.textContent = `Hire \u00b7 ${formatNum(cost)}`;
  });
}

function patchEvent(root: HTMLElement, state: GameState, now: number): void {
  const live = currentEvent(now);
  const drop = root.querySelector<HTMLButtonElement>("[data-claim-drop]");
  if (drop) {
    const claimed = state.event.claimedDropId === live.def.id;
    drop.disabled = claimed;
    drop.textContent = claimed ? "Drop claimed" : `Claim drop \u00b7 ${formatNum(live.def.dropViews)} views`;
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
    const signed = cont?.dataset.continueUser?.trim();
    if (cont && signed && hasSaveProgress(state) && !cont.disabled) {
      cont.textContent = `Continue \u00b7 ${signed} \u00b7 ${formatNum(state.views)} views`;
    }
    return;
  }

  const views = root.querySelector("#views");
  const vps = root.querySelector("#vps");
  const mult = root.querySelector("#mult");
  const algo = root.querySelector("#algo");
  if (views) views.textContent = formatNum(state.views);
  if (vps) vps.textContent = `${formatNum(globalViewsPerSec(state, clock))}/s`;
  if (mult) mult.textContent = `Viral ${totalMult(state).toFixed(2)}\u00d7`;
  const hype = root.querySelector("#hype");
  if (hype) hype.textContent = `Hype ${formatNum(state.hype)}`;
  const drop = root.querySelector("#drop");
  if (drop) drop.textContent = dropText(state, clock);
  if (algo) {
    algo.textContent = `Algo ${state.algoMult.toFixed(2)}\u00d7${
      algo.classList.contains("is-ready") ? " \u00b7 ready" : ""
    }`;
  }
  patchGoal(root, state);

  const menu = root.querySelector<HTMLElement>("[data-overflow]");
  if (menu) menu.classList.toggle("is-hot", menuHot(state, clock));

  if (root.querySelector("[data-hire]")) patchManagers(root, state);
  const hireHot = mgrsHot(state);
  const farmHire = root.querySelector<HTMLButtonElement>(".pill-hire");
  if (farmHire) farmHire.hidden = !hireHot;
  const sheetHire = root.querySelector<HTMLButtonElement>(".buy[data-hire-all]");
  if (sheetHire) sheetHire.disabled = !hireHot;
  if (root.querySelector("[data-claim-drop]")) patchEvent(root, state, clock);
  if (root.querySelector("[data-claim-pass]")) patchPass(root, state);
  if (view.screen === "outside") patchOutsideRows(root, state, buyMode, view.selected);
  else if (view.screen === "inside") patchInside(root, state, view.selected);

  const hint = root.querySelector("[data-dock-hint]");
  if (hint) hint.textContent = dockHintText(state, buyMode, view.bestMode);

  const dockBuy = root.querySelector<HTMLButtonElement>("[data-dock-buy]");
  const bestBtn = root.querySelector<HTMLButtonElement>("[data-buy-best]");
  const bestChip = root.querySelector<HTMLElement>("[data-best-mode]");
  const def = BUSINESSES[state.planet][view.selected];
  const row = state.businesses[state.planet][view.selected];
  if (bestBtn) {
    const advice = adviseFarm(state, buyMode);
    bestBtn.disabled = advice.bestIndex === null;
    bestBtn.textContent = bestButtonText(state, buyMode, advice);
    if (bestChip) bestChip.classList.toggle("is-dead", advice.bestIndex === null);
  }
  if (def && row && dockBuy) {
    const quote = quotedBuy(state, view.selected, buyMode);
    dockBuy.disabled = !quote.canBuy;
    dockBuy.textContent = buyButtonText(quote, buyMode, def.name);
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

/** Upload juice: the tapped icon dips so a manual cycle feels like a press. */
export function pulseRun(root: HTMLElement, index: number): void {
  const btn = root.querySelector<HTMLElement>(`[data-row="${index}"] [data-row-run]`);
  const target = btn ?? root.querySelector<HTMLElement>("[data-inside-bar]");
  if (!target) return;
  target.classList.remove("is-tap");
  void target.offsetWidth;
  target.classList.add("is-tap");
  window.setTimeout(() => target.classList.remove("is-tap"), 200);
}

/** Buy juice: the row thumps, the counter pops, a gain chip floats off the row. */
export function flashBuy(root: HTMLElement, index: number, count: number): void {
  const wallet = root.querySelector<HTMLElement>("#views");
  if (wallet) {
    wallet.classList.remove("is-pop");
    void wallet.offsetWidth;
    wallet.classList.add("is-pop");
    window.setTimeout(() => wallet.classList.remove("is-pop"), 320);
  }
  const button = root.querySelector<HTMLElement>("[data-dock-buy], [data-buy-best]");
  if (button) {
    button.classList.remove("is-punch");
    void button.offsetWidth;
    button.classList.add("is-punch");
    window.setTimeout(() => button.classList.remove("is-punch"), 260);
  }
  const row = root.querySelector<HTMLElement>(`[data-row="${index}"]`);
  if (!row) return;
  row.classList.add("is-bought");
  window.setTimeout(() => row.classList.remove("is-bought"), 420);
  const gain = root.ownerDocument.createElement("span");
  gain.className = "gain-pop";
  gain.textContent = `+${formatNum(count)}`;
  gain.setAttribute("aria-hidden", "true");
  row.appendChild(gain);
  window.setTimeout(() => gain.remove(), 700);
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
