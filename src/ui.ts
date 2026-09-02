import { BUSINESSES, PLANETS, type PlanetId } from "./data";
import { formatCycle, formatNum, formatTime } from "./format";
import { pickFlavor } from "./flavor";
import {
  adviseFarm,
  canPrestige,
  cycleIncome,
  effectiveCycleSec,
  globalViewsPerSec,
  nextMilestone,
  parseBuyMode,
  prestigeGain,
  quotedBuy,
  rowVps,
  timeToRankSec,
  type BuyMode,
  type BuyQuote,
  type FarmAdvice,
  type GameState,
} from "./game";

export type UiView = {
  screen: "outside" | "inside";
  selected: number;
};

export type UiSheet = "prestige" | "settings" | null;

export type UiHandlers = {
  onBuy: (index: number) => void;
  onRun: (index: number) => void;
  onManager: (index: number) => void;
  onPlanet: (planet: PlanetId) => void;
  onPrestigeAsk: () => void;
  onPrestigeConfirm: () => void;
  onSheetClose: () => void;
  onBuyMode: (mode: BuyMode) => void;
  onSelect: (index: number) => void;
  onEnter: (index: number) => void;
  onFarm: () => void;
  onOverflow: () => void;
  onReset: () => void;
};

const BUY_CHIPS: BuyMode[] = [1, 10, 100, "max", "rank"];

function chipLabel(mode: BuyMode): string {
  if (mode === "max") return "MAX";
  if (mode === "rank") return "RANK";
  return String(mode);
}

function goalCopy(state: GameState): { title: string; detail: string; ready: boolean; pct: number } {
  const ready = canPrestige(state);
  const pct = Math.min(100, (state.viewsThisRun / state.nextPrestigeAt) * 100);
  const title = state.tiktokUnlocked ? "Go even more viral" : "Unlock TikTok";
  const detail = ready
    ? `Reset both planets. Keep a +${prestigeGain(state.viewsThisRun).toFixed(2)}x multiplier.`
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
  return `Buy ${quote.count}${who} · ${cost}`;
}

function advisorLine(state: GameState, mode: BuyMode, advice: FarmAdvice): string {
  if (advice.bestIndex !== null) {
    const def = BUSINESSES[state.planet][advice.bestIndex];
    const quote = quotedBuy(state, advice.bestIndex, mode);
    const eta = timeToRankSec(state, advice.bestIndex);
    const clock = eta !== null ? ` · rank in ${formatTime(eta * 1000)}` : ` · ${formatNum(quote.cost)}`;
    return `Best: ${quote.count}× ${def.name}${clock}`;
  }
  if (advice.lockIndex !== null) {
    const def = BUSINESSES[state.planet][advice.lockIndex];
    const quote = quotedBuy(state, advice.lockIndex, 1);
    return `Save for ${def.name} · ${formatNum(quote.cost)}`;
  }
  return "Nothing to buy. Keep posting.";
}

function renderPlanetChips(state: GameState): string {
  return PLANETS.map((planet) => {
    const locked = planet.id === "tiktok" && !state.tiktokUnlocked;
    const active = state.planet === planet.id;
    const short = planet.id === "youtube" ? "YT" : "TT";
    return `
      <button
        class="planet ${active ? "is-on" : ""} ${locked ? "is-locked" : ""}"
        data-planet="${planet.id}"
        ${locked ? "disabled" : ""}
        title="${locked ? planet.unlock : planet.name}"
      >${short}</button>
    `;
  }).join("");
}

function renderBuyChips(buyMode: BuyMode): string {
  return BUY_CHIPS.map(
    (mode) => `
      <button class="chip ${buyMode === mode ? "is-on" : ""}" data-buymode="${mode}">
        ${chipLabel(mode)}
      </button>
    `,
  ).join("");
}

function renderDockActions(state: GameState, buyMode: BuyMode, selected: number, screen: UiView["screen"]): string {
  const def = BUSINESSES[state.planet][selected];
  const row = state.businesses[state.planet][selected];
  if (!def || !row) return "";
  const quote = quotedBuy(state, selected, buyMode);
  const name = screen === "outside" ? def.name : undefined;
  const hireDisabled = row.manager || row.owned <= 0 || state.views < def.managerCost;
  return `
    <button class="buy" data-dock-buy ${quote.canBuy ? "" : "disabled"}>
      ${buyButtonText(quote, buyMode, name)}
    </button>
    ${
      screen === "inside"
        ? `<button class="mgr" data-dock-mgr ${hireDisabled ? "disabled" : ""}>
            ${row.manager ? "Managed" : `${def.managerName} · ${formatNum(def.managerCost)}`}
          </button>`
        : ""
    }
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
      <p id="advisor">${advisorLine(state, buyMode, advice)}</p>
    </div>
    <div class="rows" id="biz-list">
      ${defs
        .map((def, index) => {
          const row = rows[index];
          const locked = row.owned <= 0 && index > 0 && rows[index - 1].owned <= 0;
          const next = nextMilestone(row.owned);
          const cycle = effectiveCycleSec(def.cycleSec, row.owned);
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
              <button class="row-enter" data-enter="${index}">
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
              </button>
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
  const income = cycleIncome(state.planet, selected, row.owned, state.prestigeMult);
  const milestone = nextMilestone(row.owned);
  const cycle = effectiveCycleSec(def.cycleSec, row.owned);
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

function renderSheet(state: GameState, sheet: UiSheet): string {
  if (sheet === "prestige") {
    const gain = prestigeGain(state.viewsThisRun).toFixed(2);
    return `
      <div class="sheet is-on" data-sheet>
        <div class="sheet-card">
          <strong>Go viral?</strong>
          <p>Reset both planets. Keep +${gain}x. TikTok stays unlocked.</p>
          <div class="sheet-actions">
            <button class="ghost-lite" data-sheet-close>Cancel</button>
            <button class="ghost" data-prestige-go>Prestige</button>
          </div>
        </div>
      </div>
    `;
  }
  if (sheet === "settings") {
    return `
      <div class="sheet is-on" data-sheet>
        <div class="sheet-card">
          <strong>Slop Capitalist</strong>
          <p>One cursed short. Then the whole internet. Local only. Lives on this PC.</p>
          <div class="sheet-actions">
            <button class="ghost-lite" data-sheet-close>Close</button>
            <button class="texty" data-reset>Reset save</button>
          </div>
        </div>
      </div>
    `;
  }
  return "";
}

export function renderApp(
  root: HTMLElement,
  state: GameState,
  buyMode: BuyMode,
  view: UiView,
  sheet: UiSheet,
  handlers: UiHandlers,
): void {
  const goal = goalCopy(state);
  const camera =
    view.screen === "inside" ? renderInside(state, view.selected) : renderOutside(state, buyMode, view.selected);

  root.innerHTML = `
    <div class="frame">
      <header class="chrome-top">
        <div class="brand-row">
          <p class="wordmark">Slop Capitalist</p>
          <button class="overflow" data-overflow aria-label="Settings">…</button>
        </div>
        <div class="wallet">
          <div>
            <span class="label">Views</span>
            <strong id="views">${formatNum(state.views)}</strong>
          </div>
          <div>
            <span class="label">Per second</span>
            <em id="vps">${formatNum(globalViewsPerSec(state))}/s</em>
          </div>
          <div>
            <span class="label">Viral</span>
            <em id="mult">${state.prestigeMult.toFixed(2)}x</em>
          </div>
        </div>
        <div class="goal">
          <div class="goal-copy">
            <strong id="goal-title">${goal.title}</strong>
            <p id="goal-detail">${goal.detail}</p>
          </div>
          <div class="goal-track" aria-hidden="true"><i id="goal-bar" style="width:${goal.pct}%"></i></div>
          <button class="ghost" data-prestige ${goal.ready ? "" : "disabled"}>Prestige</button>
          <nav class="planets" aria-label="Planets">${renderPlanetChips(state)}</nav>
        </div>
      </header>
      <main class="camera">${camera}</main>
      <footer class="chrome-bot">
        <div id="toast-slot" class="toast-slot" role="status"></div>
        <div class="dock-modes">
          <span>Buy</span>
          ${renderBuyChips(buyMode)}
        </div>
        <div class="dock-actions" id="dock-actions">
          ${renderDockActions(state, buyMode, view.selected, view.screen)}
        </div>
      </footer>
      ${renderSheet(state, sheet)}
    </div>
  `;

  bindChrome(root, view, handlers);
}

function bindChrome(root: HTMLElement, view: UiView, handlers: UiHandlers): void {
  root.querySelectorAll<HTMLButtonElement>("[data-planet]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onPlanet(btn.dataset.planet as PlanetId));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-buymode]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onBuyMode(parseBuyMode(btn.dataset.buymode)));
  });
  root.querySelector("[data-prestige]")?.addEventListener("click", handlers.onPrestigeAsk);
  root.querySelector("[data-prestige-go]")?.addEventListener("click", handlers.onPrestigeConfirm);
  root.querySelector("[data-sheet-close]")?.addEventListener("click", handlers.onSheetClose);
  root.querySelector("[data-overflow]")?.addEventListener("click", handlers.onOverflow);
  root.querySelector("[data-reset]")?.addEventListener("click", handlers.onReset);
  root.querySelector("[data-farm]")?.addEventListener("click", handlers.onFarm);
  root.querySelector("[data-dock-buy]")?.addEventListener("click", () => handlers.onBuy(view.selected));
  root.querySelector("[data-dock-mgr]")?.addEventListener("click", () => handlers.onManager(view.selected));

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
  const title = root.querySelector("#goal-title");
  const detail = root.querySelector("#goal-detail");
  const bar = root.querySelector<HTMLElement>("#goal-bar");
  const btn = root.querySelector<HTMLButtonElement>("[data-prestige]");
  if (title) title.textContent = goal.title;
  if (detail) detail.textContent = goal.detail;
  if (bar) bar.style.width = `${goal.pct}%`;
  if (btn) btn.disabled = !goal.ready;
}

function patchOutsideRows(root: HTMLElement, state: GameState, buyMode: BuyMode, selected: number): void {
  const defs = BUSINESSES[state.planet];
  const rows = state.businesses[state.planet];
  const advice = adviseFarm(state, buyMode);
  const advisor = root.querySelector("#advisor");
  if (advisor) advisor.textContent = advisorLine(state, buyMode, advice);

  defs.forEach((def, index) => {
    const row = rows[index];
    const el = root.querySelector<HTMLElement>(`[data-row="${index}"]`);
    if (!el) return;
    el.classList.toggle("is-on", selected === index);
    const vps = rowVps(state, index);
    const cycle = effectiveCycleSec(def.cycleSec, row.owned);
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
      row.owned > 0 ? `${formatNum(cycleIncome(state.planet, selected, row.owned, state.prestigeMult))} views` : "—";
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
    meta[1].textContent = `${row.owned > 0 ? formatCycle(effectiveCycleSec(def.cycleSec, row.owned)) : formatCycle(def.cycleSec)} cycle`;
  }
}

export function patchMeters(
  root: HTMLElement,
  state: GameState,
  buyMode: BuyMode,
  view: UiView,
): void {
  const views = root.querySelector("#views");
  const vps = root.querySelector("#vps");
  const mult = root.querySelector("#mult");
  if (views) views.textContent = formatNum(state.views);
  if (vps) vps.textContent = `${formatNum(globalViewsPerSec(state))}/s`;
  if (mult) mult.textContent = `${state.prestigeMult.toFixed(2)}x`;
  patchGoal(root, state);

  if (view.screen === "outside") patchOutsideRows(root, state, buyMode, view.selected);
  else patchInside(root, state, view.selected);

  const dockBuy = root.querySelector<HTMLButtonElement>("[data-dock-buy]");
  const dockMgr = root.querySelector<HTMLButtonElement>("[data-dock-mgr]");
  const def = BUSINESSES[state.planet][view.selected];
  const row = state.businesses[state.planet][view.selected];
  if (def && row && dockBuy) {
    const quote = quotedBuy(state, view.selected, buyMode);
    dockBuy.disabled = !quote.canBuy;
    dockBuy.textContent = buyButtonText(quote, buyMode, view.screen === "outside" ? def.name : undefined);
  }
  if (def && row && dockMgr && !row.manager) {
    dockMgr.disabled = row.owned <= 0 || state.views < def.managerCost;
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
