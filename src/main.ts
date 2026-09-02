import { BUSINESSES, SAVE_KEY } from "./data";
import { pickFlavor, resetFlavorSession } from "./flavor";
import { formatNum } from "./format";
import {
  applyOffline,
  buy,
  canPrestige,
  defaultSelected,
  hireManager,
  newTapSession,
  nextMilestone,
  ownedCount,
  persist,
  prestige,
  readStorage,
  setPlanet,
  tapBar,
  tick,
  type BuyMode,
  type GameState,
  type TapSession,
} from "./game";
import {
  flashNudge,
  patchMeters,
  renderApp,
  showAway,
  showToast,
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
let view: UiView = homeView(state, buyMode);
let sheet: UiSheet = null;
let taps: TapSession = newTapSession();
let last = performance.now();
let saveAt = 0;

const away = applyOffline(state);
persist(state);

function homeView(game: GameState, mode: BuyMode): UiView {
  if (ownedCount(game) <= 1 && !game.tiktokUnlocked) {
    return { screen: "inside", selected: 0 };
  }
  return { screen: "outside", selected: defaultSelected(game, mode) };
}

const handlers: UiHandlers = {
  onBuy(index) {
    const row = state.businesses[state.planet][index];
    const def = BUSINESSES[state.planet][index];
    if (!row || !def) return;
    const mark = nextMilestone(row.owned);
    const n = buy(state, index, buyMode);
    if (n > 0) {
      persist(state);
      rebuild();
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
    if (result === "nudge") {
      patchMeters(root, state, buyMode, view);
      flashNudge(root);
      return;
    }
    rebuild();
  },
  onManager(index) {
    const def = BUSINESSES[state.planet][index];
    if (hireManager(state, index)) {
      persist(state);
      rebuild();
      showToast(pickFlavor("manager", { name: def?.name ?? "this bar" }));
    }
  },
  onPlanet(planet) {
    if (planet === state.planet) {
      view = { screen: "outside", selected: view.selected };
      rebuild();
      return;
    }
    if (setPlanet(state, planet)) {
      view = { screen: "outside", selected: defaultSelected(state, buyMode) };
      rebuild();
    }
  },
  onPrestigeAsk() {
    if (!canPrestige(state)) return;
    sheet = "prestige";
    rebuild();
  },
  onPrestigeConfirm() {
    const gain = prestige(state);
    sheet = null;
    taps = newTapSession();
    if (gain > 0) {
      view = { screen: "outside", selected: defaultSelected(state, buyMode) };
      persist(state);
      rebuild();
      showToast(pickFlavor("prestige", { gain: gain.toFixed(2) }));
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
    rebuild();
  },
  onSelect(index) {
    view = { ...view, selected: index };
    rebuild();
  },
  onEnter(index) {
    if (view.selected !== index) {
      view = { screen: "outside", selected: index };
      rebuild();
      return;
    }
    view = { screen: "inside", selected: index };
    rebuild();
  },
  onFarm() {
    view = { screen: "outside", selected: view.selected };
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
    view = homeView(state, buyMode);
    sheet = null;
    taps = newTapSession();
    resetFlavorSession();
    rebuild();
    showToast("Fresh account. Post your first cursed short.");
  },
};

function rebuild(): void {
  renderApp(root, state, buyMode, view, sheet, handlers);
}

rebuild();
showAway(away.earned, away.offlineMs);

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  tick(state, dt, taps);
  patchMeters(root, state, buyMode, view);
  if (now - saveAt > 2000) {
    persist(state);
    saveAt = now;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener("beforeunload", () => persist(state));

if (import.meta.env.DEV) {
  console.info("Slop Capitalist", { views: formatNum(state.views) });
}
