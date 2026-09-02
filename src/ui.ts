import { BUSINESSES, PLANETS, PRESTIGE_AT, type PlanetId } from "./data";
import { formatNum, formatTime } from "./format";
import {
  buyCost,
  canPrestige,
  cycleIncome,
  globalViewsPerSec,
  nextMilestone,
  prestigeGain,
  resolveBuyCount,
  type BuyMode,
  type GameState,
} from "./game";

export type UiHandlers = {
  onBuy: (index: number) => void;
  onRun: (index: number) => void;
  onManager: (index: number) => void;
  onPlanet: (planet: PlanetId) => void;
  onPrestige: () => void;
  onBuyMode: (mode: BuyMode) => void;
  onReset: () => void;
};

export function renderApp(
  root: HTMLElement,
  state: GameState,
  buyMode: BuyMode,
  handlers: UiHandlers,
): void {
  root.innerHTML = `
    <div class="shell">
      <header class="top">
        <p class="eyebrow">Idle tycoon · farm the algorithm</p>
        <h1>Slop Capitalist</h1>
        <p class="tagline">One cursed short. Then the whole internet.</p>
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
            <span class="label">Viral multiplier</span>
            <em>${state.prestigeMult.toFixed(2)}x</em>
          </div>
        </div>
        <nav class="planets" aria-label="Planets">
          ${PLANETS.map((planet) => {
            const locked = planet.id === "tiktok" && !state.tiktokUnlocked;
            const active = state.planet === planet.id;
            return `
              <button
                class="planet ${active ? "is-on" : ""} ${locked ? "is-locked" : ""}"
                data-planet="${planet.id}"
                ${locked ? "disabled" : ""}
              >
                <span>${planet.tag}</span>
                <strong>${planet.name}</strong>
                <small>${locked ? planet.unlock : planet.id === "youtube" ? "The upload grind" : "For You, forever"}</small>
              </button>
            `;
          }).join("")}
        </nav>
        <section class="prestige">
          <div class="prestige-copy">
            <strong>${state.tiktokUnlocked ? "Go even more viral" : "Unlock TikTok"}</strong>
            <p>${
              canPrestige(state)
                ? `Reset both planets. Keep a +${prestigeGain(state.lifetimeViews).toFixed(2)}x multiplier.`
                : `Earn ${formatNum(PRESTIGE_AT)} lifetime views first. ${formatNum(state.lifetimeViews)} / ${formatNum(PRESTIGE_AT)}`
            }</p>
          </div>
          <button class="ghost" data-prestige ${canPrestige(state) ? "" : "disabled"}>
            Prestige
          </button>
        </section>
      </header>
      <div class="toolbar">
        <span>Buy</span>
        ${([1, 10, "max"] as BuyMode[])
          .map(
            (mode) => `
          <button class="chip ${buyMode === mode ? "is-on" : ""}" data-buymode="${mode}">
            ${mode === "max" ? "Max" : `x${mode}`}
          </button>
        `,
          )
          .join("")}
      </div>
      <main class="list" id="biz-list"></main>
      <footer class="foot">
        <button class="texty" data-reset>Reset save</button>
        <span>Local only. Lives on this PC.</span>
      </footer>
    </div>
  `;

  const list = root.querySelector("#biz-list") as HTMLElement;
  list.innerHTML = renderBusinesses(state, buyMode);

  root.querySelectorAll<HTMLButtonElement>("[data-planet]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onPlanet(btn.dataset.planet as PlanetId));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-buymode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.dataset.buymode;
      handlers.onBuyMode(raw === "max" ? "max" : raw === "10" ? 10 : 1);
    });
  });
  root.querySelector("[data-prestige]")?.addEventListener("click", handlers.onPrestige);
  root.querySelector("[data-reset]")?.addEventListener("click", handlers.onReset);
  bindBusinessEvents(list, handlers);
}

export function renderBusinesses(state: GameState, buyMode: BuyMode): string {
  const defs = BUSINESSES[state.planet];
  const rows = state.businesses[state.planet];
  return defs
    .map((def, index) => {
      const row = rows[index];
      const count = resolveBuyCount(state, index, buyMode);
      const cost = count > 0 ? buyCost(def.baseCost, def.costMult, row.owned, count) : buyCost(def.baseCost, def.costMult, row.owned, buyMode === "max" ? 1 : buyMode);
      const canBuy = count > 0 && state.views >= cost;
      const income = cycleIncome(state.planet, index, row.owned, state.prestigeMult);
      const milestone = nextMilestone(row.owned);
      const pct = Math.min(100, row.progress * 100);
      const locked = row.owned <= 0 && index > 0 && rows[index - 1].owned <= 0;
      return `
        <article class="biz ${locked ? "is-dim" : ""}" data-biz="${index}">
          <button class="run" data-run="${index}" ${row.owned <= 0 || row.running ? "disabled" : ""}>
            <span class="icon">${def.icon}</span>
            <span class="run-copy">
              <strong>${def.name}</strong>
              <small>${row.manager ? "On autopilot" : row.owned <= 0 ? "Buy one to start" : "Tap to upload"}</small>
            </span>
            <span class="owned">x${formatNum(row.owned)}</span>
          </button>
          <p class="blurb">${def.blurb}</p>
          <button class="bar" data-run="${index}" ${row.owned <= 0 ? "disabled" : ""}>
            <i style="width:${pct}%"></i>
            <span>${row.owned > 0 ? `${formatNum(income)} views` : "—"}</span>
          </button>
          <div class="meta">
            <span>${milestone ? `Next x2 at ${milestone}` : "Milestones maxed"}</span>
            <span>${def.cycleSec}s cycle</span>
          </div>
          <div class="actions">
            <button class="buy" data-buy="${index}" ${canBuy ? "" : "disabled"}>
              Buy ${buyMode === "max" ? (count || 0) : buyMode} · ${formatNum(cost)}
            </button>
            <button class="mgr" data-mgr="${index}" ${row.manager || row.owned <= 0 || state.views < def.managerCost ? "disabled" : ""}>
              ${row.manager ? "Managed" : `${def.managerName} · ${formatNum(def.managerCost)}`}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

export function bindBusinessEvents(list: HTMLElement, handlers: UiHandlers): void {
  list.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.onBuy(Number(btn.dataset.buy));
    });
  });
  list.querySelectorAll<HTMLButtonElement>("[data-mgr]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.onManager(Number(btn.dataset.mgr));
    });
  });
  list.querySelectorAll<HTMLButtonElement>("[data-run]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onRun(Number(btn.dataset.run)));
  });
}

export function patchMeters(root: HTMLElement, state: GameState, buyMode: BuyMode): void {
  const views = root.querySelector("#views");
  const vps = root.querySelector("#vps");
  if (views) views.textContent = formatNum(state.views);
  if (vps) vps.textContent = `${formatNum(globalViewsPerSec(state))}/s`;

  const defs = BUSINESSES[state.planet];
  const rows = state.businesses[state.planet];
  defs.forEach((def, index) => {
    const row = rows[index];
    const fill = root.querySelector<HTMLElement>(`.biz[data-biz="${index}"] .bar i`);
    if (fill) fill.style.width = `${Math.min(100, row.progress * 100)}%`;

    const count = resolveBuyCount(state, index, buyMode);
    const cost =
      count > 0
        ? buyCost(def.baseCost, def.costMult, row.owned, count)
        : buyCost(def.baseCost, def.costMult, row.owned, buyMode === "max" ? 1 : buyMode);
    const buyBtn = root.querySelector<HTMLButtonElement>(`[data-buy="${index}"]`);
    if (buyBtn) {
      buyBtn.disabled = !(count > 0 && state.views >= cost);
      buyBtn.textContent = `Buy ${buyMode === "max" ? count || 0 : buyMode} · ${formatNum(cost)}`;
    }
    const mgr = root.querySelector<HTMLButtonElement>(`[data-mgr="${index}"]`);
    if (mgr && !row.manager) {
      mgr.disabled = row.owned <= 0 || state.views < def.managerCost;
    }
    root.querySelectorAll<HTMLButtonElement>(`[data-run="${index}"]`).forEach((btn) => {
      btn.disabled = btn.classList.contains("bar") ? row.owned <= 0 : row.owned <= 0 || row.running;
    });
    const hint = root.querySelector(`.biz[data-biz="${index}"] .run-copy small`);
    if (hint) {
      hint.textContent = row.manager ? "On autopilot" : row.owned <= 0 ? "Buy one to start" : "Tap to upload";
    }
    const payout = root.querySelector(`.biz[data-biz="${index}"] .bar span`);
    if (payout) {
      payout.textContent =
        row.owned > 0
          ? `${formatNum(cycleIncome(state.planet, index, row.owned, state.prestigeMult))} views`
          : "—";
    }
  });
}

export function patchList(
  root: HTMLElement,
  state: GameState,
  buyMode: BuyMode,
  handlers: UiHandlers,
): void {
  const list = root.querySelector("#biz-list");
  if (!list) return;
  list.innerHTML = renderBusinesses(state, buyMode);
  bindBusinessEvents(list as HTMLElement, handlers);
  patchMeters(root, state, buyMode);
}

export function showToast(message: string): void {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  window.setTimeout(() => {
    el.classList.remove("is-in");
    window.setTimeout(() => el.remove(), 280);
  }, 3200);
}

export function showAway(earned: number, offlineMs: number): void {
  if (earned <= 0 || offlineMs < 5000) return;
  showToast(`While you were gone (${formatTime(offlineMs)}): +${formatNum(earned)} views`);
}
