import {
  BUSINESSES,
  EVENT_SHOP,
  PASS_TIERS,
  PLANETS,
  type PlanetId,
} from "./data";
import { formatCycle, formatNum, formatTime } from "./format";
import { pickFlavor } from "./flavor";
import {
  adviseFarm,
  canPrestige,
  currentEvent,
  cycleIncome,
  effectiveCycleSec,
  extraEventVps,
  globalViewsPerSec,
  nextMilestone,
  nextPlanetName,
  parseBuyMode,
  planetUnlocked,
  prestigeGain,
  quotedBuy,
  recap,
  rowVps,
  timeToRankSec,
  totalMult,
  unlockedPlanets,
  algoGain,
  canAlgo,
  managerSlots,
  type BuyMode,
  type BuyQuote,
  type FarmAdvice,
  type GameState,
} from "./game";

export type DockTab = "buy" | "managers" | "event" | "pass";

export type UiView = {
  screen: "outside" | "inside";
  selected: number;
  tab: DockTab;
};

export type UiSheet = "prestige" | "algo" | "settings" | "chest" | "recap" | "import" | null;

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
  onTab: (tab: DockTab) => void;
  onClaimDrop: () => void;
  onClaimEvent: (id: string) => void;
  onClaimPass: (id: string) => void;
  onClaimChest: () => void;
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
const DOCK_TABS: { id: DockTab; label: string }[] = [
  { id: "buy", label: "Buy" },
  { id: "managers", label: "Mgrs" },
  { id: "event", label: "Drop" },
  { id: "pass", label: "Pass" },
];

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
  const detail = ready
    ? `Reset every farm. Keep a +${prestigeGain(state.viewsThisRun).toFixed(2)}x multiplier.`
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

export function bestButtonText(state: GameState, mode: BuyMode, advice: FarmAdvice): string {
  if (advice.bestIndex === null) return "Nothing to buy";
  const def = BUSINESSES[state.planet][advice.bestIndex];
  const quote = quotedBuy(state, advice.bestIndex, mode);
  return `Buy BEST · ${quote.count}× ${def.name} · ${formatNum(quote.cost)}`;
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

function renderBuyChips(buyMode: BuyMode): string {
  return BUY_CHIPS.map(
    (mode) => `
      <button class="chip ${buyMode === mode ? "is-on" : ""}" data-buymode="${mode}">
        ${chipLabel(mode)}
      </button>
    `,
  ).join("");
}

function renderDockTabs(tab: DockTab): string {
  return DOCK_TABS.map(
    (item) => `
      <button class="dock-tab ${tab === item.id ? "is-on" : ""}" data-tab="${item.id}">
        ${item.label}
      </button>
    `,
  ).join("");
}

function renderDockActions(state: GameState, buyMode: BuyMode, selected: number, screen: UiView["screen"]): string {
  if (screen === "outside") {
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
  const hireDisabled = row.manager || row.owned <= 0 || state.views < def.managerCost;
  return `
    <button class="buy" data-dock-buy ${quote.canBuy ? "" : "disabled"}>
      ${buyButtonText(quote, buyMode)}
    </button>
    <button class="mgr" data-dock-mgr ${hireDisabled ? "disabled" : ""}>
      ${row.manager ? "Managed" : `${def.managerName} · ${formatNum(def.managerCost)}`}
    </button>
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
              <button class="row-open" data-enter="${index}" aria-label="Open ${def.name}">Open</button>
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
                const disabled = hired || locked || state.views < def.managerCost;
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
                    >${hired ? "Managed" : `Hire · ${formatNum(def.managerCost)}`}</button>
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
  const extraVps = extraEventVps(state.prestigeMult, live.def);
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

function renderSheet(state: GameState, sheet: UiSheet): string {
  if (sheet === "prestige") {
    const gain = prestigeGain(state.viewsThisRun).toFixed(2);
    return `
      <div class="sheet is-on" data-sheet>
        <div class="sheet-card">
          <strong>Go viral?</strong>
          <p>Reset every farm. Keep +${gain}x. Unlocked planets stay.</p>
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

function eventPip(now: number): string {
  const live = currentEvent(now);
  return `${live.def.name} · ${formatTime(Math.max(0, live.endsAt - now))} · ${live.def.bonusMult}x`;
}

function passPip(state: GameState): string {
  const next = PASS_TIERS.find((tier) => !state.pass.claimed.includes(tier.id));
  const have = state.pass.claimed.length;
  if (!next) return `Pass ${have}/${PASS_TIERS.length} · maxed`;
  return `Pass ${have}/${PASS_TIERS.length} · ${formatNum(state.lifetimeViews)} / ${formatNum(next.at)}`;
}

function renderCamera(
  state: GameState,
  buyMode: BuyMode,
  view: UiView,
  now: number,
): string {
  if (view.tab === "managers") return renderManagers(state);
  if (view.tab === "event") return renderEvent(state, now);
  if (view.tab === "pass") return renderPass(state);
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
): void {
  const goal = goalCopy(state);
  const clock = now > 0 ? now : Date.now();
  const camera = renderCamera(state, buyMode, view, clock);

  root.innerHTML = `
    <div class="frame">
      <header class="chrome-top">
        <div class="brand-row">
          <div>
            <p class="wordmark">Slop Capitalist</p>
            ${state.title ? `<p class="flavor-title">${state.title}</p>` : ""}
          </div>
          <button class="overflow" data-overflow aria-label="Settings">…</button>
        </div>
        <div class="wallet">
          <div>
            <span class="label">Views</span>
            <strong id="views">${formatNum(state.views)}</strong>
          </div>
          <div>
            <span class="label">Per second</span>
            <em id="vps">${formatNum(globalViewsPerSec(state, clock))}/s</em>
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
        <div class="pips">
          <p id="event-pip">${eventPip(clock)}</p>
          <p id="pass-pip">${passPip(state)}</p>
        </div>
      </header>
      <main class="camera">${camera}</main>
      <footer class="chrome-bot">
        <div id="toast-slot" class="toast-slot" role="status"></div>
        <nav class="dock-tabs" aria-label="Dock">${renderDockTabs(view.tab)}</nav>
        ${
          view.tab === "buy"
            ? `<div class="dock-modes">
                <span>Buy</span>
                ${renderBuyChips(buyMode)}
              </div>
              <div class="dock-actions" id="dock-actions">
                ${renderDockActions(state, buyMode, view.selected, view.screen)}
              </div>`
            : ""
        }
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
  root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onTab(btn.dataset.tab as DockTab));
  });
  root.querySelector("[data-prestige]")?.addEventListener("click", handlers.onPrestigeAsk);
  root.querySelector("[data-prestige-go]")?.addEventListener("click", handlers.onPrestigeConfirm);
  root.querySelector("[data-sheet-close]")?.addEventListener("click", handlers.onSheetClose);
  root.querySelector("[data-overflow]")?.addEventListener("click", handlers.onOverflow);
  root.querySelector("[data-reset]")?.addEventListener("click", handlers.onReset);
  root.querySelector("[data-farm]")?.addEventListener("click", handlers.onFarm);
  root.querySelector("[data-dock-buy]")?.addEventListener("click", () => handlers.onBuy(view.selected));
  root.querySelector("[data-dock-mgr]")?.addEventListener("click", () => handlers.onManager(view.selected));
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
    btn.disabled = row.owned <= 0 || state.views < def.managerCost;
    btn.textContent = `Hire · ${formatNum(def.managerCost)}`;
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
  const views = root.querySelector("#views");
  const vps = root.querySelector("#vps");
  const mult = root.querySelector("#mult");
  if (views) views.textContent = formatNum(state.views);
  if (vps) vps.textContent = `${formatNum(globalViewsPerSec(state, clock))}/s`;
  if (mult) mult.textContent = `${state.prestigeMult.toFixed(2)}x`;
  patchGoal(root, state);
  const eventEl = root.querySelector("#event-pip");
  const passEl = root.querySelector("#pass-pip");
  if (eventEl) eventEl.textContent = eventPip(clock);
  if (passEl) passEl.textContent = passPip(state);

  if (view.tab === "managers") patchManagers(root, state);
  else if (view.tab === "event") patchEvent(root, state, clock);
  else if (view.tab === "pass") patchPass(root, state);
  else if (view.screen === "outside") patchOutsideRows(root, state, buyMode, view.selected);
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
