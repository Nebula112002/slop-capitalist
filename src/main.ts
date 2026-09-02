import { BUSINESSES, SAVE_KEY } from "./data";
import { playJuice } from "./audio";
import { pickFlavor, resetFlavorSession } from "./flavor";
import { formatNum } from "./format";
import {
  algo,
  applyOffline,
  buy,
  buyBest,
  canAlgo,
  claimChest,
  claimEventDrop,
  claimEventShop,
  claimPass,
  defaultSelected,
  dismissTooltip,
  exportSave,
  hireAllAffordable,
  hireManager,
  importSave,
  newTapSession,
  nextMilestone,
  nextPlanetName,
  offerComebackChest,
  persist,
  prestige,
  readStorage,
  setPlanet,
  tapBar,
  tick,
  toggleMute,
  type BuyMode,
  type GameState,
  type TapSession,
} from "./game";
import {
  flashNudge,
  hasSaveProgress,
  patchMeters,
  persistUiRoute,
  readUiRoute,
  renderApp,
  showAway,
  showToast,
  type MoreSheet,
  type UiHandlers,
  type UiSheet,
  type UiView,
} from "./ui";
import "./styles.css";

const mount = document.querySelector<HTMLElement>("#app");
if (!mount) throw new Error("#app missing");
const root = mount;

let state: GameState = readStorage();
let buyMode: BuyMode = 1;
let view: UiView = bootView(state, buyMode);
let sheet: UiSheet = view.screen === "landing" ? null : state.pendingChest ? "chest" : null;
let taps: TapSession = newTapSession();
let last = performance.now();
let saveAt = 0;

const away = applyOffline(state);
offerComebackChest(state, away.earned, away.offlineMs);
if (view.screen !== "landing" && state.pendingChest) sheet = "chest";
persist(state);

function homeView(game: GameState, mode: BuyMode, bestMode = false): UiView {
  return { screen: "outside", selected: defaultSelected(game, mode), bestMode };
}

function landingView(game: GameState, mode: BuyMode): UiView {
  return { screen: "landing", selected: defaultSelected(game, mode), bestMode: false };
}

function bootView(game: GameState, mode: BuyMode): UiView {
  return readUiRoute() === "farm" ? homeView(game, mode) : landingView(game, mode);
}

const handlers: UiHandlers = {
  onBuyBest() {
    const result = buyBest(state, buyMode);
    if (!result) return;
    const def = BUSINESSES[state.planet][result.index];
    const ownedNow = state.businesses[state.planet][result.index].owned;
    const mark = nextMilestone(ownedNow - result.count);
    persist(state);
    view = { ...view, selected: result.index };
    rebuild();
    playJuice("buy", state.muted);
    if (mark !== null && ownedNow >= mark) {
      showToast(pickFlavor("milestone", { name: def.name, mark }));
    } else if (result.count >= 10) {
      showToast(pickFlavor("buy-bulk", { n: result.count, name: def.name }));
    }
  },
  onBuy(index) {
    const row = state.businesses[state.planet][index];
    const def = BUSINESSES[state.planet][index];
    if (!row || !def) return;
    const mark = nextMilestone(row.owned);
    const n = buy(state, index, buyMode);
    if (n > 0) {
      persist(state);
      rebuild();
      playJuice("buy", state.muted);
      if (mark !== null && row.owned >= mark) {
        showToast(pickFlavor("milestone", { name: def.name, mark }));
      } else if (n >= 10) {
        showToast(pickFlavor("buy-bulk", { n, name: def.name }));
      }
    }
  },
  onRun(index) {
    const result = tapBar(state, index, taps);
    if (result === "none") return;
    persist(state);
    playJuice("tap", state.muted);
    if (result === "nudge") {
      patchMeters(root, state, buyMode, view, Date.now());
      flashNudge(root);
      return;
    }
    rebuild();
  },
  onManager(index, planet) {
    const target = planet ?? state.planet;
    const def = BUSINESSES[target][index];
    if (hireManager(state, index, target)) {
      persist(state);
      rebuild();
      playJuice("hire", state.muted);
      showToast(pickFlavor("manager", { name: def?.name ?? "this bar" }));
    }
  },
  onHireAll() {
    const n = hireAllAffordable(state);
    if (n <= 0) return;
    persist(state);
    rebuild();
    playJuice("hire", state.muted);
    showToast(`Hired ${n}. Those bars run themselves.`);
  },
  onPlanet(planet) {
    if (planet === state.planet) {
      view = { ...view, screen: "outside" };
      rebuild();
      return;
    }
    if (setPlanet(state, planet)) {
      view = { screen: "outside", selected: defaultSelected(state, buyMode), bestMode: view.bestMode };
      rebuild();
    }
  },
  onPrestigeAsk() {
    sheet = "prestige";
    rebuild();
  },
  onPrestigeConfirm() {
    const unlockedName = nextPlanetName(state);
    const gain = prestige(state);
    sheet = null;
    taps = newTapSession();
    if (gain > 0) {
      view = homeView(state, buyMode, view.bestMode);
      persist(state);
      rebuild();
      playJuice("prestige", state.muted);
      showToast(pickFlavor("prestige", { gain: gain.toFixed(2), name: unlockedName }));
      return;
    }
    rebuild();
  },
  onAlgoAsk() {
    if (!canAlgo(state)) return;
    sheet = "algo";
    rebuild();
  },
  onAlgoConfirm() {
    const gain = algo(state);
    sheet = null;
    taps = newTapSession();
    if (gain > 0) {
      view = homeView(state, buyMode, view.bestMode);
      persist(state);
      rebuild();
      playJuice("prestige", state.muted);
      showToast(`Algo +${gain.toFixed(2)}x. Viral reset. The Simulation is open.`);
      return;
    }
    rebuild();
  },
  onSheetClose() {
    sheet = null;
    rebuild();
  },
  onBuyMode(mode) {
    buyMode = mode;
    view = { ...view, bestMode: false };
    rebuild();
  },
  onBestMode() {
    view = { ...view, bestMode: !view.bestMode };
    rebuild();
  },
  onSelect(index) {
    view = { ...view, selected: index };
    rebuild();
  },
  onEnter(index) {
    view = { ...view, screen: "inside", selected: index };
    rebuild();
  },
  onFarm() {
    view = { ...view, screen: "outside" };
    rebuild();
  },
  onOverflow() {
    sheet = "settings";
    rebuild();
  },
  onReset() {
    if (!window.confirm("Wipe this save? The algorithm forgets you.")) return;
    localStorage.removeItem(SAVE_KEY);
    state = readStorage();
    buyMode = 1;
    persistUiRoute("farm");
    view = homeView(state, buyMode);
    sheet = null;
    taps = newTapSession();
    resetFlavorSession();
    rebuild();
    showToast("Fresh account. Post your first cursed short.");
  },
  onOpenSheet(next: MoreSheet) {
    sheet = next;
    rebuild();
  },
  onHome() {
    persistUiRoute("landing");
    view = landingView(state, buyMode);
    sheet = null;
    rebuild();
  },
  onContinue() {
    persistUiRoute("farm");
    view = homeView(state, buyMode, view.bestMode);
    sheet = state.pendingChest ? "chest" : null;
    rebuild();
  },
  onNewRun() {
    if (hasSaveProgress(state) && !window.confirm("Wipe this save? The algorithm forgets you.")) return;
    localStorage.removeItem(SAVE_KEY);
    state = readStorage();
    buyMode = 1;
    persistUiRoute("farm");
    view = homeView(state, buyMode);
    sheet = null;
    taps = newTapSession();
    resetFlavorSession();
    rebuild();
    showToast("Fresh account. Post your first cursed short.");
  },
  onClaimDrop() {
    const views = claimEventDrop(state, Date.now());
    if (views <= 0) return;
    persist(state);
    rebuild();
    playJuice("claim", state.muted);
    showToast(`Event drop +${formatNum(views)}`);
  },
  onClaimEvent(id) {
    const item = claimEventShop(state, id);
    if (!item) return;
    persist(state);
    rebuild();
    playJuice("claim", state.muted);
    showToast(`Claimed ${item.name}`);
  },
  onClaimPass(id) {
    const tier = claimPass(state, id);
    if (!tier) return;
    persist(state);
    rebuild();
    playJuice("claim", state.muted);
    showToast(`Pass: ${tier.name}`);
  },
  onClaimChest() {
    const views = claimChest(state);
    sheet = null;
    if (views > 0) {
      persist(state);
      rebuild();
      playJuice("chest", state.muted);
      showToast(`Comeback chest +${formatNum(views)}`);
      return;
    }
    rebuild();
  },
  onMute() {
    toggleMute(state);
    persist(state);
    rebuild();
    showToast(state.muted ? "Juice muted." : "Juice on.");
  },
  onExport() {
    const text = exportSave(state);
    void navigator.clipboard.writeText(text).then(
      () => showToast("Save copied."),
      () => {
        window.prompt("Copy this save", text);
      },
    );
  },
  onImportAsk() {
    sheet = "import";
    rebuild();
  },
  onImport(raw) {
    const loaded = importSave(raw);
    if (!loaded) {
      showToast("Import failed. Not valid JSON.");
      return;
    }
    state = loaded;
    taps = newTapSession();
    persistUiRoute("farm");
    view = homeView(state, buyMode, view.bestMode);
    sheet = state.pendingChest ? "chest" : null;
    persist(state);
    rebuild();
    showToast("Save imported.");
  },
  onRecap() {
    sheet = "recap";
    rebuild();
  },
  onDismissTip() {
    dismissTooltip(state);
    persist(state);
    rebuild();
  },
};

function rebuild(): void {
  renderApp(root, state, buyMode, view, sheet, handlers, Date.now());
}

rebuild();
showAway(away.earned, away.offlineMs);

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  const wall = Date.now();
  tick(state, dt, taps, wall);
  state.playMs += dt * 1000;
  patchMeters(root, state, buyMode, view, wall);
  if (now - saveAt > 2000) {
    persist(state);
    saveAt = now;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener("beforeunload", () => persist(state));

if (import.meta.env.DEV) {
  Object.assign(window, {
    __slop: {
      getState: () => state,
      buyBest: () => buyBest(state, buyMode),
      hireAll: () => hireAllAffordable(state),
      prestige: () => prestige(state),
      algo: () => algo(state),
      exportSave: () => exportSave(state),
    },
  });
  console.info("Slop Capitalist", { views: formatNum(state.views) });
}
