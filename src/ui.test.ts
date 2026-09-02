/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { PRESTIGE_AT } from "./data";
import { hireManager, newGame, prestige, quotedBuy } from "./game";
import { buyButtonText, renderApp, type UiHandlers } from "./ui";

const noop: UiHandlers = {
  onBuy() {},
  onRun() {},
  onManager() {},
  onPlanet() {},
  onPrestigeAsk() {},
  onPrestigeConfirm() {},
  onSheetClose() {},
  onBuyMode() {},
  onSelect() {},
  onEnter() {},
  onFarm() {},
  onTab() {},
  onClaimDrop() {},
  onClaimEvent() {},
  onClaimPass() {},
  onOverflow() {},
  onReset() {},
};

describe("chrome + views", () => {
  it("renders sticky dock chips and a first-clip inside card", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, { screen: "inside", selected: 0, tab: "buy" }, null, noop);
    expect(root.querySelector("#views")).toBeTruthy();
    expect(root.querySelector("#vps")).toBeTruthy();
    expect(root.querySelectorAll("[data-buymode]").length).toBe(5);
    expect(root.textContent).toContain("RANK");
    expect(root.textContent).toContain("100");
    expect(root.querySelector("[data-farm]")).toBeTruthy();
    expect(root.querySelector(".bar")).toBeTruthy();
    expect((root.querySelector("[data-prestige]") as HTMLButtonElement).disabled).toBe(true);
    expect(root.textContent).toContain("0 / 1M");
    expect(root.textContent).toContain("Mgrs");
    expect(root.textContent).toContain("Drop");
    expect(root.textContent).toContain("Pass");
    expect(root.textContent).toContain("SIM");
  });

  it("shows BEST and LOCK on the outside farm", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 80;
    renderApp(root, state, 1, { screen: "outside", selected: 0, tab: "buy" }, null, noop);
    expect(root.textContent).toContain("BEST");
    expect(root.textContent).toContain("LOCK");
    expect(root.querySelector("[data-row='0']")?.classList.contains("is-on")).toBe(true);
  });

  it("lists The Simulation on the outside planet row once unlocked", () => {
    const root = document.createElement("div");
    const state = newGame();
    const locked = root.ownerDocument.createElement("div");
    renderApp(locked, state, 1, { screen: "outside", selected: 0, tab: "buy" }, null, noop);
    expect((locked.querySelector('[data-planet="simulation"]') as HTMLButtonElement).disabled).toBe(true);

    state.viewsThisRun = PRESTIGE_AT;
    prestige(state);
    state.viewsThisRun = state.nextPrestigeAt;
    prestige(state);
    renderApp(root, state, 1, { screen: "outside", selected: 0, tab: "buy" }, null, noop);
    expect((root.querySelector('[data-planet="simulation"]') as HTMLButtonElement).disabled).toBe(false);
    expect(root.textContent).toContain("The Simulation farm");
    expect(root.textContent).toContain("Prompt Farm");
  });

  it("keeps inside hire working after the managers tab renders", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 10_000;
    renderApp(root, state, 1, { screen: "outside", selected: 0, tab: "managers" }, null, noop);
    expect(root.textContent).toContain("Managers");
    expect(root.querySelector("[data-hire]")).toBeTruthy();
    expect(root.textContent).toContain("Hire a thumbnail gremlin");
    expect(hireManager(state, 0)).toBe(true);
    expect(state.businesses.youtube[0].manager).toBe(true);
    renderApp(root, state, 1, { screen: "inside", selected: 0, tab: "buy" }, null, noop);
    const insideHire = root.querySelector("[data-dock-mgr]") as HTMLButtonElement;
    expect(insideHire).toBeTruthy();
    expect(insideHire.disabled).toBe(true);
    expect(insideHire.textContent).toContain("Managed");
  });

  it("enables prestige when this-run hits the bar", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    renderApp(root, state, 1, { screen: "outside", selected: 0, tab: "buy" }, null, noop);
    expect((root.querySelector("[data-prestige]") as HTMLButtonElement).disabled).toBe(false);
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
});
