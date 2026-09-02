/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { PRESTIGE_AT } from "./data";
import { newGame, quotedBuy } from "./game";
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
  onOverflow() {},
  onReset() {},
};

describe("chrome + views", () => {
  it("renders sticky dock chips and a first-clip inside card", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, { screen: "inside", selected: 0 }, null, noop);
    expect(root.querySelector("#views")).toBeTruthy();
    expect(root.querySelector("#vps")).toBeTruthy();
    expect(root.querySelectorAll("[data-buymode]").length).toBe(5);
    expect(root.textContent).toContain("RANK");
    expect(root.textContent).toContain("100");
    expect(root.querySelector("[data-farm]")).toBeTruthy();
    expect(root.querySelector(".bar")).toBeTruthy();
    expect((root.querySelector("[data-prestige]") as HTMLButtonElement).disabled).toBe(true);
    expect(root.textContent).toContain("0 / 1M");
  });

  it("shows BEST and LOCK on the outside farm", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 80;
    renderApp(root, state, 1, { screen: "outside", selected: 0 }, null, noop);
    expect(root.textContent).toContain("BEST");
    expect(root.textContent).toContain("LOCK");
    expect(root.querySelector("[data-row='0']")?.classList.contains("is-on")).toBe(true);
  });

  it("enables prestige when this-run hits the bar", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    renderApp(root, state, 1, { screen: "outside", selected: 0 }, null, noop);
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
