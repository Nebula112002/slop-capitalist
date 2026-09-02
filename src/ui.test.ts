/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { PRESTIGE_AT, UI_ROUTE_KEY } from "./data";
import { hireManager, newGame, prestige, quotedBuy } from "./game";
import {
  algoVisible,
  bestButtonText,
  buyButtonText,
  hasSaveProgress,
  persistUiRoute,
  readUiRoute,
  renderApp,
  type UiHandlers,
  type UiView,
} from "./ui";
import { adviseFarm } from "./game";

const farm: UiView = { screen: "outside", selected: 0, bestMode: false };
const inside: UiView = { screen: "inside", selected: 0, bestMode: false };
const landing: UiView = { screen: "landing", selected: 0, bestMode: false };

const noop: UiHandlers = {
  onBuyBest() {},
  onBuy() {},
  onRun() {},
  onManager() {},
  onHireAll() {},
  onPlanet() {},
  onPrestigeAsk() {},
  onPrestigeConfirm() {},
  onAlgoAsk() {},
  onAlgoConfirm() {},
  onSheetClose() {},
  onBuyMode() {},
  onSelect() {},
  onEnter() {},
  onFarm() {},
  onOpenSheet() {},
  onBestMode() {},
  onHome() {},
  onContinue() {},
  onNewRun() {},
  onSignIn() {},
  onBuyShop() {},
  onBuyChestUpgrade() {},
  onClaimDrop() {},
  onClaimEvent() {},
  onClaimPass() {},
  onClaimChest() {},
  onMute() {},
  onExport() {},
  onImportAsk() {},
  onImport() {},
  onRecap() {},
  onDismissTip() {},
  onOverflow() {},
  onReset() {},
};

describe("landing + route memory", () => {
  it("renders a one-screen pitch without the farm list", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), 1, landing, null, noop);
    expect(root.textContent).toContain("Continue");
    expect(root.textContent).toContain("New run");
    expect(root.textContent).toContain("Tap a farm, then buy it");
    expect(root.textContent).toContain("The farm is the game");
    expect(root.textContent).toContain("Prestige when the chip fills");
    expect(root.querySelector("[data-row]")).toBeNull();
    expect(root.querySelector("[data-buy-best]")).toBeNull();
    expect(root.querySelector("#views")).toBeNull();
  });

  it("remembers last screen without touching the game save key", () => {
    const store = {
      data: {} as Record<string, string>,
      getItem(key: string) {
        return this.data[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.data[key] = value;
      },
      removeItem(key: string) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      },
      key() {
        return null;
      },
      get length() {
        return Object.keys(this.data).length;
      },
    } as Storage;
    expect(readUiRoute(store)).toBe("landing");
    persistUiRoute("farm", store);
    expect(readUiRoute(store)).toBe("farm");
    expect(store.getItem(UI_ROUTE_KEY)).toContain("farm");
    expect(store.getItem("slop-capitalist.v1")).toBeNull();
  });

  it("does not treat a fresh game as save progress", () => {
    expect(hasSaveProgress(newGame())).toBe(false);
    const played = newGame();
    played.views = 12;
    expect(hasSaveProgress(played)).toBe(true);
  });
});

describe("chrome + views", () => {
  it("keeps inside hire and a thin wallet, without a 4-stat exam", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, inside, null, noop);
    expect(root.querySelector("#views")).toBeTruthy();
    expect(root.querySelector("#vps")).toBeTruthy();
    expect(root.querySelector("[data-farm]")).toBeTruthy();
    expect(root.querySelector(".bar")).toBeTruthy();
    expect(root.querySelector("#algo")).toBeNull();
    expect(root.textContent).not.toContain("Unlock The Simulation");
    expect(root.textContent).toContain("Mgrs");
    expect(root.textContent).toContain("Drop");
    expect(root.textContent).toContain("Pass");
    expect(root.querySelector("[data-best-mode]")).toBeTruthy();
    expect(root.querySelectorAll("[data-buymode]").length).toBe(5);
  });

  it("shows BEST on the row, not as a header repeat or default mint button", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 80;
    renderApp(root, state, 1, farm, null, noop);
    expect(root.textContent).toContain("BEST");
    expect(root.textContent).toContain("LOCK");
    expect(root.querySelector("[data-row='0']")?.classList.contains("is-on")).toBe(true);
    expect(root.querySelector("[data-buy-best]")).toBeNull();
    expect(root.querySelector("[data-dock-buy]")?.textContent).toContain("Cursed Short");
    expect(root.querySelector("[data-dock-buy]")?.textContent).not.toContain("Buy BEST");
    expect(root.textContent).not.toMatch(/Best:\s+\d+×/);
    expect(root.querySelector("#advisor")).toBeNull();
    expect(root.querySelector("[data-enter]")?.getAttribute("aria-label")).toContain("Open");
    expect(root.querySelector("[data-enter]")?.textContent).toContain("›");
    expect(root.textContent).toContain("YouTube farm");
    expect(root.textContent).toContain("SIM");
  });

  it("keeps quantity chips and BEST on the dock", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), 1, farm, null, noop);
    expect(root.querySelectorAll("[data-buymode]").length).toBe(5);
    expect(root.querySelector("[data-best-mode]")?.textContent).toBe("BEST");
    expect(root.textContent).toContain("Qty");
    expect(root.textContent).toContain("RANK");
    expect(root.textContent).toContain("100");
  });

  it("lists The Simulation on the outside planet row once unlocked", () => {
    const root = document.createElement("div");
    const state = newGame();
    const locked = root.ownerDocument.createElement("div");
    renderApp(locked, state, 1, farm, null, noop);
    expect((locked.querySelector('[data-planet="simulation"]') as HTMLButtonElement).disabled).toBe(true);

    state.viewsThisRun = PRESTIGE_AT;
    prestige(state);
    state.viewsThisRun = state.nextPrestigeAt;
    prestige(state);
    renderApp(root, state, 1, farm, null, noop);
    expect((root.querySelector('[data-planet="simulation"]') as HTMLButtonElement).disabled).toBe(false);
    expect(root.textContent).toContain("The Simulation farm");
    expect(root.textContent).toContain("Prompt Farm");
  });

  it("keeps the farm mounted when managers open as a sheet", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 10_000;
    renderApp(root, state, 1, farm, "managers", noop);
    expect(root.querySelector("[data-row]")).toBeTruthy();
    expect(root.querySelector("[data-dock-buy]")).toBeTruthy();
    expect(root.textContent).toContain("Managers");
    expect(root.querySelector("[data-hire]")).toBeTruthy();
    expect(root.querySelector("[data-hire-all]")).toBeTruthy();
    expect(root.textContent).toContain("Hire a thumbnail gremlin");
    expect(hireManager(state, 0)).toBe(true);
    expect(state.businesses.youtube[0].manager).toBe(true);
    renderApp(root, state, 1, inside, null, noop);
    const insideHire = root.querySelector("[data-dock-mgr]") as HTMLButtonElement;
    expect(insideHire).toBeTruthy();
    expect(insideHire.disabled).toBe(true);
    expect(insideHire.textContent).toContain("Managed");
  });

  it("opens prestige from a chip and keeps Algo off a fresh farm", () => {
    const root = document.createElement("div");
    const state = newGame();
    expect(algoVisible(state)).toBe(false);
    renderApp(root, state, 1, farm, null, noop);
    expect(root.querySelector("#algo")).toBeNull();
    expect(root.querySelector("[data-prestige]")).toBeTruthy();
    expect((root.querySelector("[data-prestige]") as HTMLButtonElement).disabled).toBe(false);

    renderApp(root, state, 1, farm, "prestige", noop);
    expect(root.textContent).toContain("0 / 1M");
    expect((root.querySelector("[data-prestige-go]") as HTMLButtonElement).disabled).toBe(true);
    expect(root.textContent).not.toContain("Enter the algorithm?");
  });

  it("enables prestige confirm when this-run hits the bar", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    renderApp(root, state, 1, farm, "prestige", noop);
    expect((root.querySelector("[data-prestige-go]") as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows Algo only after it can do something", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.prestigeMult = 3;
    expect(algoVisible(state)).toBe(true);
    renderApp(root, state, 1, farm, null, noop);
    expect(root.querySelector("#algo")).toBeTruthy();
    expect(root.querySelector("[data-algo]")).toBeTruthy();
  });

  it("labels RANK as a partial gap", () => {
    const state = newGame();
    state.businesses.youtube[0].owned = 20;
    state.views = 20;
    const quote = quotedBuy(state, 0, "rank");
    expect(quote.gap).toBe(5);
    expect(quote.count).toBeLessThan(5);
    const label = buyButtonText(quote, "rank");
    expect(label.startsWith("Rank ")).toBe(true);
  });

  it("Buy BEST label names the winning row", () => {
    const state = newGame();
    state.views = 80;
    const advice = adviseFarm(state, 1);
    expect(advice.bestIndex).toBe(0);
    expect(bestButtonText(state, 1, advice)).toContain("Cursed Short");
  });

  it("BEST chip switches the mint button to Buy BEST", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 80;
    renderApp(root, state, 1, { ...farm, bestMode: true }, null, noop);
    expect(root.querySelector("[data-best-mode]")?.classList.contains("is-on")).toBe(true);
    expect(root.querySelector("[data-buy-best]")?.textContent).toContain("Buy BEST");
    expect(root.querySelector("[data-buy-best]")?.textContent).toContain("Cursed Short");
    expect(root.querySelector("[data-dock-buy]")).toBeNull();
    expect(root.querySelector('[data-buymode="1"]')?.classList.contains("is-on")).toBe(false);
  });

  it("follows the selected Simulation row unless BEST mode is on", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    prestige(state);
    state.viewsThisRun = state.nextPrestigeAt;
    prestige(state);
    state.views = 1e20;
    state.businesses.simulation.forEach((row) => {
      row.owned = Math.max(row.owned, 1);
    });
    const sim = 4;
    renderApp(root, state, 1, { screen: "outside", selected: sim, bestMode: false }, null, noop);
    expect(root.querySelector(`[data-row="${sim}"]`)?.classList.contains("is-on")).toBe(true);
    const selectedBuy = root.querySelector("[data-dock-buy]") as HTMLButtonElement;
    expect(selectedBuy.textContent).toContain("The Simulation");
    expect(selectedBuy.textContent).not.toContain("Buy BEST");
    expect(root.querySelector("[data-buy-best]")).toBeNull();

    renderApp(root, state, 1, { screen: "outside", selected: sim, bestMode: true }, null, noop);
    const bestBuy = root.querySelector("[data-buy-best]") as HTMLButtonElement;
    expect(bestBuy).toBeTruthy();
    expect(bestBuy.textContent).toContain("Buy BEST");
    expect(root.querySelector(`[data-row="${sim}"]`)?.classList.contains("is-on")).toBe(true);
  });

  it("quantity chips leave BEST highlighted so the button can return to the row", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 80;
    renderApp(root, state, 10, { ...farm, selected: 0, bestMode: false }, null, noop);
    expect(root.querySelector('[data-buymode="10"]')?.classList.contains("is-on")).toBe(true);
    expect(root.querySelector("[data-best-mode]")?.classList.contains("is-on")).toBe(false);
    expect(root.querySelector("[data-dock-buy]")?.textContent).toContain("Cursed Short");
  });

  it("puts hire-all on the farm when a manager is waiting", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 10_000;
    renderApp(root, state, 1, farm, null, noop);
    const farmHire = root.querySelector(".farm-hire") as HTMLButtonElement;
    expect(farmHire).toBeTruthy();
    expect(farmHire.disabled).toBe(false);
    expect(farmHire.textContent).toContain("Hire all");
  });

  it("explains RANK in one muted line", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), "rank", farm, null, noop);
    expect(root.textContent).toContain("RANK buys up to the next x2");
    renderApp(root, newGame(), "rank", { ...farm, bestMode: true }, null, noop);
    expect(root.textContent).toContain("RANK BEST is the best step toward a rank");
  });

  it("marks The Simulation as a poster planet", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    prestige(state);
    state.viewsThisRun = state.nextPrestigeAt;
    prestige(state);
    renderApp(root, state, 1, farm, null, noop);
    expect(root.textContent).toContain("Poster planet");
    expect(root.textContent).toContain("1T+");
  });

  it("skips the farm tip once the landing loop has been seen", () => {
    const root = document.createElement("div");
    const fresh = newGame();
    renderApp(root, fresh, 1, farm, null, noop);
    expect(root.querySelector("[data-tip]")).toBeTruthy();
    fresh.seenTooltip = true;
    renderApp(root, fresh, 1, farm, null, noop);
    expect(root.querySelector("[data-tip]")).toBeNull();
  });

  it("offers idle-chest upgrades from settings", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 1_000;
    renderApp(root, state, 1, farm, "settings", noop);
    expect(root.textContent).toContain("Idle chest");
    expect(root.querySelector("[data-chest-up]")).toBeTruthy();
  });
});
