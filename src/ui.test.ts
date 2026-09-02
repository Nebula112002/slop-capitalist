/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { BUSINESSES, PRESTIGE_AT, UI_ROUTE_KEY } from "./data";
import { formatNum } from "./format";
import { adviseFarm, buyShop, hireManager, newGame, prestige, quotedBuy, type BuyMode } from "./game";
import {
  algoVisible,
  bestButtonText,
  buyButtonText,
  dockHintText,
  flashShop,
  hasSaveProgress,
  persistUiRoute,
  readUiRoute,
  patchMeters,
  renderApp,
  type UiHandlers,
  type UiView,
} from "./ui";

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
  onEraseAll() {},
};

const MODES: BuyMode[] = [1, 10, 100, "max", "rank"];

describe("landing + route memory", () => {
  it("renders a one-screen pitch without the farm list", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), 1, landing, null, noop);
    expect(root.textContent).toContain("Tap a farm, then buy it");
    expect(root.textContent).toContain("The farm is the game");
    expect(root.textContent).toContain("Prestige when the chip fills");
    expect(root.querySelector("[data-row]")).toBeNull();
    expect(root.querySelector("[data-buy-best]")).toBeNull();
    expect(root.querySelector("#views")).toBeNull();
    expect(root.querySelector("#toast-slot")).toBeTruthy();
  });

  it("offers one primary with nobody signed in, not a dead Continue", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), 1, landing, null, noop);
    expect(root.querySelector("[data-continue]")).toBeNull();
    const primary = root.querySelector("[data-sign-in]") as HTMLButtonElement;
    expect(primary.textContent?.trim()).toBe("Start posting");
    expect(primary.classList.contains("buy")).toBe(true);
    expect(root.querySelector("[data-username]")).toBeTruthy();
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

  it("Continue names the signed-in save, not whatever is typed", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 40;
    renderApp(root, state, 1, landing, null, noop, 0, { username: "Caleb", names: ["Caleb"] });
    const cont = root.querySelector("[data-continue]") as HTMLButtonElement;
    expect(cont.disabled).toBe(false);
    expect(cont.textContent).toContain("Caleb");
    expect(cont.textContent).toContain("40");
    expect(root.querySelector("[data-new-run]")).toBeTruthy();
    const box = root.querySelector("[data-username]") as HTMLInputElement;
    box.value = "Alice";
    patchMeters(root, state, 1, landing);
    expect(cont.textContent).toContain("Caleb");
    expect(cont.textContent).not.toContain("Alice");
  });

  it("lists the other local saves without switching away from the signed-in one", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), 1, landing, null, noop, 0, {
      username: "Caleb",
      names: ["Caleb", "Alice"],
    });
    const picks = Array.from(root.querySelectorAll("[data-user-pick]")).map((el) => el.textContent?.trim());
    expect(picks).toEqual(["Alice"]);
  });
});

describe("farm chrome", () => {
  it("keeps one money block and no 4-stat exam", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, farm, null, noop);
    expect(root.querySelector("#views")).toBeTruthy();
    expect(root.querySelector("#vps")).toBeTruthy();
    expect(root.querySelector("#mult")).toBeTruthy();
    expect(root.querySelector("#algo")).toBeNull();
    expect(root.querySelector("#hype")).toBeNull();
    expect(root.textContent).not.toContain("Unlock The Feed");
    expect(root.querySelector("[data-prestige]")).toBeTruthy();
    expect(root.querySelector("[data-overflow]")?.getAttribute("aria-label")).toBe("Menu");
  });

  it("keeps an idle farm at 0/s and still shows the drop chip", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, farm, null, noop, 1);
    const chip = root.querySelector("#drop") as HTMLButtonElement;
    expect(chip).toBeTruthy();
    expect(chip.textContent).toMatch(/Drop \u00d7[\d.]+/);
    expect(chip.textContent).not.toMatch(/\+/);
    expect(chip.dataset.sheetOpen).toBe("event");
    expect(root.querySelector("[data-row='0'] [data-row-vps]")?.textContent).toBe("idle");
    expect(root.querySelector("#vps")?.textContent).toBe("0/s");
  });

  it("keeps the rare jobs out of the dock and inside one menu", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, farm, null, noop);
    expect(root.querySelectorAll(".dock [data-sheet-open]").length).toBe(0);
    expect(root.querySelector('[data-sheet-open="managers"]')).toBeNull();
    expect(root.querySelector('[data-sheet-open="pass"]')).toBeNull();

    renderApp(root, state, 1, farm, "menu", noop);
    expect(root.querySelector('[data-sheet-open="managers"]')).toBeTruthy();
    expect(root.querySelector('[data-sheet-open="event"]')).toBeTruthy();
    expect(root.querySelector('[data-sheet-open="pass"]')).toBeTruthy();
    expect(root.querySelector('[data-sheet-open="settings"]')).toBeTruthy();
    expect(root.querySelector('[data-sheet-open="recap"]')).toBeTruthy();
    expect(root.querySelector("[data-row]")).toBeTruthy();
  });

  it("flags a waiting chest on the farm and in the menu", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.pendingChest = { views: 4200, offlineMs: 300_000 };
    renderApp(root, state, 1, farm, null, noop);
    const strip = root.querySelector('[data-sheet-open="chest"]') as HTMLButtonElement;
    expect(strip).toBeTruthy();
    expect(strip.textContent).toContain("Comeback chest");
    expect(strip.textContent).toContain("4.2K");
    expect(root.querySelector("[data-overflow]")?.classList.contains("is-hot")).toBe(true);
  });

  it("gives every sheet dialog semantics and a close control", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), 1, farm, "menu", noop);
    const card = root.querySelector("[data-sheet-card]") as HTMLElement;
    expect(card.getAttribute("role")).toBe("dialog");
    expect(card.getAttribute("aria-modal")).toBe("true");
    const label = card.getAttribute("aria-labelledby") ?? "";
    expect(root.querySelector(`#${label}`)?.textContent).toBe("Menu");
    expect(root.querySelectorAll("[data-sheet-close]").length).toBeGreaterThan(1);
  });

  it("makes the chrome behind an open sheet inert", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, farm, null, noop);
    expect(root.querySelector(".camera")?.hasAttribute("inert")).toBe(false);
    renderApp(root, state, 1, farm, "menu", noop);
    expect(root.querySelector(".camera")?.hasAttribute("inert")).toBe(true);
    expect(root.querySelector(".hud")?.hasAttribute("inert")).toBe(true);
    expect(root.querySelector(".dock")?.hasAttribute("inert")).toBe(false);
  });

  it("shows the tools sheet stack over a mounted farm", () => {
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
  });

  it("moves the inside hire onto the card instead of the dock", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 10_000;
    expect(hireManager(state, 0)).toBe(true);
    renderApp(root, state, 1, inside, null, noop);
    expect(root.querySelector("[data-dock-mgr]")).toBeNull();
    const hire = root.querySelector("[data-card-mgr]") as HTMLButtonElement;
    expect(hire).toBeTruthy();
    expect(hire.disabled).toBe(true);
    expect(hire.textContent).toContain("Managed");
    expect(root.querySelector("[data-farm]")).toBeTruthy();
    expect(root.querySelector(".bar")).toBeTruthy();
    expect(root.querySelector("[data-dock-buy]")).toBeTruthy();
  });

  it("opens prestige from the goal meter and keeps Algo off a fresh farm", () => {
    const root = document.createElement("div");
    const state = newGame();
    expect(algoVisible(state)).toBe(false);
    renderApp(root, state, 1, farm, null, noop);
    expect(root.querySelector("#algo")).toBeNull();
    expect((root.querySelector("[data-prestige]") as HTMLButtonElement).disabled).toBe(false);
    expect(root.querySelector("[data-prestige]")?.getAttribute("aria-label")).toContain("Prestige");

    renderApp(root, state, 1, farm, "prestige", noop);
    expect(root.textContent).toContain("0 / 1M");
    expect((root.querySelector("[data-prestige-go]") as HTMLButtonElement).disabled).toBe(true);
    expect(root.textContent).toContain("Hype shop");
    expect(root.textContent).not.toContain("Permanent +");
    expect(root.textContent).not.toContain("Enter the algorithm");
  });

  it("patches a hype buy without remounting the prestige sheet", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.hype = 20;
    state.prestigeCount = 1;
    renderApp(root, state, 1, farm, "prestige", noop);
    const card = root.querySelector("[data-sheet-card]");
    const row = root.querySelector('[data-shop-row="viral"]');
    expect(root.querySelector<HTMLButtonElement>('[data-shop-buy="viral"]')?.disabled).toBe(false);
    expect(buyShop(state, "viral")).toBe(true);
    patchMeters(root, state, 1, farm);
    expect(root.querySelector("[data-sheet-card]")).toBe(card);
    expect(root.querySelector('[data-shop-row="viral"]')).toBe(row);
    expect(root.querySelector("[data-hype-bank]")?.textContent).toBe(`Hype shop \u00b7 ${formatNum(state.hype)} banked`);
    expect(root.querySelector('[data-shop-level="viral"]')?.textContent).toBe("1/20");
    expect(root.querySelector("#hype")?.textContent).toBe(`Hype ${formatNum(state.hype)}`);
  });

  it("glitches the bought hype row", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.hype = 20;
    state.prestigeCount = 1;
    renderApp(root, state, 1, farm, "prestige", noop);
    flashShop(root, "viral");
    expect(root.querySelector('[data-shop-row="viral"]')?.classList.contains("is-glitch")).toBe(true);
    expect(root.querySelector('[data-shop-buy="viral"]')?.classList.contains("is-punch")).toBe(true);
    expect(root.querySelector("[data-hype-bank]")?.classList.contains("is-pop")).toBe(true);
  });

  it("enables prestige confirm when this-run hits the bar", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.viewsThisRun = PRESTIGE_AT;
    renderApp(root, state, 1, farm, "prestige", noop);
    expect((root.querySelector("[data-prestige-go]") as HTMLButtonElement).disabled).toBe(false);
    expect(root.querySelector("[data-prestige]")?.classList.contains("is-ready")).toBe(true);
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

  it("lists The Simulation on the planet switcher once unlocked", () => {
    const root = document.createElement("div");
    const state = newGame();
    const locked = root.ownerDocument.createElement("div");
    renderApp(locked, state, 1, farm, null, noop);
    expect((locked.querySelector('[data-planet="simulation"]') as HTMLButtonElement).disabled).toBe(true);
    expect(locked.textContent).toContain("SIM");

    state.viewsThisRun = PRESTIGE_AT;
    prestige(state);
    state.viewsThisRun = state.nextPrestigeAt;
    prestige(state);
    renderApp(root, state, 1, farm, null, noop);
    expect((root.querySelector('[data-planet="simulation"]') as HTMLButtonElement).disabled).toBe(false);
    expect(root.textContent).toContain("The Simulation farm");
    expect(root.textContent).toContain("Prompt Farm");
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
    expect(root.querySelector("[data-mute]")).toBeTruthy();
    expect(root.querySelector("[data-export]")).toBeTruthy();
  });

  it("puts hire-all on the farm when a manager is waiting", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 10_000;
    renderApp(root, state, 1, farm, null, noop);
    const farmHire = root.querySelector(".pill-hire") as HTMLButtonElement;
    expect(farmHire).toBeTruthy();
    expect(farmHire.disabled).toBe(false);
    expect(farmHire.textContent).toContain("Hire all");
  });
});

describe("farm rows", () => {
  it("splits every row into native run / pick / open buttons", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, { ...farm, selected: 1 }, null, noop);
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-row]"));
    expect(rows.length).toBe(BUSINESSES.youtube.length);
    expect(rows.map((row) => row.querySelector("[data-select]")?.getAttribute("aria-pressed"))).toEqual([
      "false",
      "true",
      "false",
      "false",
      "false",
    ]);
    rows.forEach((row) => {
      expect(row.querySelector("[data-row-run]")?.tagName).toBe("BUTTON");
      expect(row.querySelector("[data-select]")?.tagName).toBe("BUTTON");
      // Nesting a control inside a control is what the old listbox row did.
      expect(row.querySelector("[data-select] button")).toBeNull();
    });
  });

  it("labels the run button by what a tap would actually do", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, farm, null, noop);
    const owned = root.querySelector("[data-row='0'] [data-row-run]") as HTMLButtonElement;
    expect(owned.disabled).toBe(false);
    expect(owned.classList.contains("is-ready")).toBe(true);
    expect(owned.getAttribute("aria-label")).toBe("Upload Cursed Short");

    const unowned = root.querySelector("[data-row='1'] [data-row-run]") as HTMLButtonElement;
    expect(unowned.disabled).toBe(true);
    expect(unowned.classList.contains("is-empty")).toBe(true);

    state.businesses.youtube[0].running = true;
    patchMeters(root, state, 1, farm);
    expect(owned.classList.contains("is-live")).toBe(true);
    expect(owned.getAttribute("aria-label")).toBe("Cursed Short is uploading");

    state.views = 10_000;
    expect(hireManager(state, 0)).toBe(true);
    patchMeters(root, state, 1, farm);
    expect(owned.classList.contains("is-auto")).toBe(true);
    expect(owned.getAttribute("aria-label")).toBe("Nudge Cursed Short");
  });

  it("teaches the tap loop on a fresh farm", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), 1, farm, null, noop);
    const tip = root.querySelector("[data-tip]") as HTMLElement;
    expect(tip.textContent).toContain("Tap an icon to post");
    expect(tip.textContent).toContain("until you hire a manager");
  });

  it("only puts Open on the selected row so the rest cannot be fat-fingered", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 80;
    renderApp(root, state, 1, { ...farm, selected: 0 }, null, noop);
    const opens = root.querySelectorAll("[data-enter]");
    expect(opens.length).toBe(1);
    expect(opens[0].getAttribute("data-enter")).toBe("0");
    expect(opens[0].getAttribute("aria-label")).toContain("Open");
    expect(opens[0].textContent).toContain("\u203a");
    expect(root.querySelector("[data-row='0']")?.classList.contains("is-on")).toBe(true);
  });

  it("shows live rows with a cycle bar and cold rows with a pitch", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, farm, null, noop);
    const live = root.querySelector("[data-row='0']") as HTMLElement;
    expect(live.classList.contains("is-owned")).toBe(true);
    expect(live.querySelector("[data-row-fill]")).toBeTruthy();
    expect(live.querySelector("[data-row-rank]")?.textContent).toContain("\u00d72 at 25");
    const cold = root.querySelector("[data-row='1']") as HTMLElement;
    expect(cold.classList.contains("is-cold")).toBe(true);
    expect(cold.querySelector("[data-row-fill]")).toBeNull();
    expect(cold.textContent).toContain("Top 7 things");
  });

  it("shows a running bar instead of a strobe once the cycle hits the floor", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.businesses.youtube[0].owned = 100;
    state.businesses.youtube[0].manager = true;
    state.businesses.youtube[0].progress = 0.1;
    renderApp(root, state, 1, farm, null, noop);
    const row = root.querySelector("[data-row='0']") as HTMLElement;
    expect(row.querySelector("[data-row-bar]")?.classList.contains("is-running")).toBe(true);
    expect((row.querySelector("[data-row-fill]") as HTMLElement).style.width).toBe("100%");
    expect(row.querySelector("[data-row-cycle]")?.textContent).toBe("0.25s min");

    const slow = newGame();
    renderApp(root, slow, 1, farm, null, noop);
    const slowRow = root.querySelector("[data-row='0']") as HTMLElement;
    expect(slowRow.querySelector("[data-row-bar]")?.classList.contains("is-running")).toBe(false);
    expect(slowRow.querySelector("[data-row-cycle]")?.textContent).toBe("0.60s");
  });

  it("keeps the row BEST badge on whatever adviseFarm picks for the live chip", () => {
    const state = newGame();
    state.views = 5_000;
    state.businesses.youtube[0].owned = 40;
    state.businesses.youtube[1].owned = 2;
    for (const mode of MODES) {
      const root = document.createElement("div");
      renderApp(root, state, mode, farm, null, noop);
      const badged = Array.from(root.querySelectorAll("[data-row]")).findIndex((row) =>
        row.querySelector(".badge.is-best"),
      );
      expect(badged).toBe(adviseFarm(state, mode).bestIndex ?? -1);
    }
  });

  it("marks the next unlock without a header BEST repeat", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 80;
    renderApp(root, state, 1, farm, null, noop);
    expect(root.textContent).toContain("BEST");
    expect(root.textContent).toContain("LOCK");
    expect(root.textContent).not.toMatch(/Best:\s+\d+/);
    expect(root.querySelector("#advisor")).toBeNull();
    expect(root.querySelector("[data-buy-best]")).toBeNull();
    expect(root.querySelector("[data-dock-buy]")?.textContent).toContain("Cursed Short");
  });
});

describe("dock", () => {
  it("keeps quantity chips and BEST on one row", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), 1, farm, null, noop);
    expect(root.querySelectorAll("[data-buymode]").length).toBe(5);
    expect(root.querySelector("[data-best-mode]")?.textContent).toBe("BEST");
    expect(root.textContent).toContain("\u00d710");
    expect(root.textContent).toContain("\u00d7100");
    expect(root.textContent).toContain("MAX");
    expect(root.textContent).toContain("RANK");
    expect(root.querySelector('[data-buymode="1"]')?.getAttribute("aria-pressed")).toBe("true");
  });

  it("teaches the chips in one muted line instead of a Qty label", () => {
    const root = document.createElement("div");
    const state = newGame();
    renderApp(root, state, 1, farm, null, noop);
    expect(root.querySelector("[data-dock-hint]")?.textContent).toContain("MAX spends it all");
    renderApp(root, state, "max", farm, null, noop);
    expect(root.querySelector("[data-dock-hint]")?.textContent).toContain("MAX spends every view");
    renderApp(root, state, "rank", farm, null, noop);
    expect(root.querySelector("[data-dock-hint]")?.textContent).toContain(
      "RANK buys the next \u00d72 rank. You need the full cost.",
    );
    renderApp(root, state, "rank", { ...farm, bestMode: true }, null, noop);
    expect(root.querySelector("[data-dock-hint]")?.textContent).toContain(
      "RANK BEST is the best step toward a rank",
    );
  });

  it("explains BEST without naming a second winner", () => {
    const state = newGame();
    state.views = 80;
    const hint = dockHintText(state, 1, true);
    expect(hint).toContain("views per second per view spent");
    for (const def of BUSINESSES.youtube) {
      expect(hint).not.toContain(def.name);
    }
    const broke = newGame();
    broke.views = 0;
    expect(dockHintText(broke, 1, true)).toContain("Nothing is affordable");
  });

  it("labels RANK as the full remaining gap and stays disabled until it is affordable", () => {
    const state = newGame();
    state.businesses.youtube[0].owned = 20;
    state.views = 20;
    const quote = quotedBuy(state, 0, "rank");
    expect(quote.gap).toBe(5);
    expect(quote.count).toBe(0);
    expect(quote.canBuy).toBe(false);
    expect(buyButtonText(quote, "rank")).toBe(`Rank 5 \u00b7 ${formatNum(quote.cost)}`);

    const root = document.createElement("div");
    renderApp(root, state, "rank", farm, null, noop);
    expect(root.querySelector<HTMLButtonElement>("[data-dock-buy]")?.disabled).toBe(true);
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
    expect(root.querySelector("[data-best-mode]")?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector("[data-buy-best]")?.textContent).toContain("Buy BEST");
    expect(root.querySelector("[data-buy-best]")?.textContent).toContain("Cursed Short");
    expect(root.querySelector("[data-dock-buy]")).toBeNull();
  });

  it("keeps the quantity chip lit in BEST mode because BEST still buys that many", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 5_000;
    renderApp(root, state, 10, { ...farm, bestMode: true }, null, noop);
    expect(root.querySelector('[data-buymode="10"]')?.classList.contains("is-on")).toBe(true);
    expect(root.querySelector('[data-buymode="1"]')?.classList.contains("is-on")).toBe(false);
    const label = root.querySelector("[data-buy-best]")?.textContent ?? "";
    expect(label).toContain("10\u00d7");
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

  it("returns the mint button to the selected row when BEST is off", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 80;
    renderApp(root, state, 10, { ...farm, selected: 0, bestMode: false }, null, noop);
    expect(root.querySelector('[data-buymode="10"]')?.classList.contains("is-on")).toBe(true);
    expect(root.querySelector("[data-best-mode]")?.classList.contains("is-on")).toBe(false);
    expect(root.querySelector("[data-dock-buy]")?.textContent).toContain("Cursed Short");
    expect(root.querySelector("[data-buy-best]")).toBeNull();
  });

  it("says nothing to buy instead of pretending", () => {
    const root = document.createElement("div");
    const state = newGame();
    state.views = 0;
    renderApp(root, state, 100, { ...farm, bestMode: true }, null, noop);
    const best = root.querySelector("[data-buy-best]") as HTMLButtonElement;
    expect(best.disabled).toBe(true);
    expect(best.textContent).toContain("Nothing to buy");
  });
});
