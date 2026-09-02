import { SAVE_KEY } from "./data";
import { formatNum } from "./format";
import {
  applyOffline,
  buy,
  hireManager,
  persist,
  prestige,
  readStorage,
  setPlanet,
  startCycle,
  tick,
  type BuyMode,
  type GameState,
} from "./game";
import { patchList, patchMeters, renderApp, showAway, showToast, type UiHandlers } from "./ui";
import "./styles.css";

const mount = document.querySelector<HTMLElement>("#app");
if (!mount) throw new Error("#app missing");
const root = mount;

let state: GameState = readStorage();
let buyMode: BuyMode = 1;
let last = performance.now();
let saveAt = 0;

const away = applyOffline(state);
persist(state);

const handlers: UiHandlers = {
  onBuy(index) {
    const n = buy(state, index, buyMode);
    if (n > 0) {
      dirty();
      if (n >= 10) showToast(`Bought ${n}. The slop thickens.`);
    }
  },
  onRun(index) {
    if (startCycle(state, index)) dirty();
  },
  onManager(index) {
    if (hireManager(state, index)) {
      dirty();
      showToast("Manager hired. You can look away now.");
    }
  },
  onPlanet(planet) {
    if (setPlanet(state, planet)) rebuild();
  },
  onPrestige() {
    const gain = prestige(state);
    if (gain > 0) {
      rebuild();
      showToast(`TikTok unlocked. Permanent +${gain.toFixed(2)}x`);
    }
  },
  onBuyMode(mode) {
    buyMode = mode;
    rebuild();
  },
  onReset() {
    if (!window.confirm("Wipe this save? The algorithm forgets you.")) return;
    localStorage.removeItem(SAVE_KEY);
    state = readStorage();
    rebuild();
    showToast("Fresh account. Post your first cursed short.");
  },
};

function rebuild(): void {
  renderApp(root, state, buyMode, handlers);
}

function dirty(): void {
  persist(state);
  patchList(root, state, buyMode, handlers);
}

rebuild();
showAway(away.earned, away.offlineMs);

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  tick(state, dt);
  patchMeters(root, state, buyMode);
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
