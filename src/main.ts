import { BUSINESSES } from "./data";
import { playJuice } from "./audio";
import { pickFlavor, resetFlavorSession } from "./flavor";
import { formatNum } from "./format";
import {
  algo,
  applyOffline,
  buy,
  buyBest,
  buyChestUpgrade,
  buyShop,
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
  newGame,
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
  flashBuy,
  flashNudge,
  hasSaveProgress,
  patchMeters,
  persistUiRoute,
  pulseRun,
  readUiRoute,
  renderApp,
  showAway,
  showToast,
  type MoreSheet,
  type UiHandlers,
  type UiSession,
  type UiSheet,
  type UiView,
} from "./ui";
import {
  claimLegacySave,
  clearUserSave,
  isValidUsername,
  normalizeUsername,
  readUserIndex,
  rememberUser,
  usernameSlug,
} from "./users";
import "./styles.css";

const mount = document.querySelector<HTMLElement>("#app");
if (!mount) throw new Error("#app missing");
const root = mount;
const store = localStorage;

let users = readUserIndex(store);
let currentUser = users.last;
if (currentUser) claimLegacySave(currentUser, store);

let state: GameState = currentUser ? readStorage(store, currentUser) : newGame();
let buyMode: BuyMode = 1;
let view: UiView = bootView(state, buyMode);
let sheet: UiSheet = view.screen === "landing" ? null : state.pendingChest ? "chest" : null;
let taps: TapSession = newTapSession();
let last = performance.now();
let saveAt = 0;

const away = applyOffline(state);
offerComebackChest(state, away.offlineMs);
if (view.screen !== "landing" && state.pendingChest) sheet = "chest";
persistState();
let pendingAway = away;

function session(): UiSession {
  return { username: currentUser, names: users.names };
}

function persistState(): void {
  if (!currentUser) return;
  persist(state, store, currentUser);
}

function persistRoute(screen: "landing" | "farm"): void {
  persistUiRoute(screen, undefined, currentUser || undefined);
}

function homeView(game: GameState, mode: BuyMode, bestMode = false): UiView {
  return { screen: "outside", selected: defaultSelected(game, mode), bestMode };
}

function landingView(game: GameState, mode: BuyMode): UiView {
  return { screen: "landing", selected: defaultSelected(game, mode), bestMode: false };
}

function bootView(game: GameState, mode: BuyMode): UiView {
  if (!currentUser) return landingView(game, mode);
  return readUiRoute(undefined, currentUser) === "farm" ? homeView(game, mode) : landingView(game, mode);
}

function signIn(raw: string): boolean {
  if (!isValidUsername(raw)) {
    showToast("Names are letters, numbers, spaces, - and _.");
    return false;
  }
  const next = normalizeUsername(raw);
  if (currentUser && usernameSlug(currentUser) !== usernameSlug(next)) {
    persistState();
  }
  users = rememberUser(next, store);
  currentUser = users.last;
  claimLegacySave(currentUser, store);
  state = readStorage(store, currentUser);
  const loadedAway = applyOffline(state);
  offerComebackChest(state, loadedAway.offlineMs);
  pendingAway = loadedAway;
  buyMode = 1;
  taps = newTapSession();
  resetFlavorSession();
  // A name with something to lose stops on the pitch so Continue can prove
  // nothing was wiped. A brand-new name has no save to reassure them about.
  const fresh = !hasSaveProgress(state);
  persistRoute(fresh ? "farm" : "landing");
  view = fresh ? homeView(state, buyMode) : landingView(state, buyMode);
  sheet = fresh && state.pendingChest ? "chest" : null;
  persistState();
  rebuild();
  if (fresh) showToast(`Welcome, ${currentUser}. Post the first cursed short.`);
  return true;
}

function wipeCurrentUser(): void {
  if (!currentUser) return;
  clearUserSave(currentUser, store);
  state = newGame();
  buyMode = 1;
  persistRoute("farm");
  view = homeView(state, buyMode);
  sheet = null;
  pendingAway = { earned: 0, offlineMs: 0 };
  taps = newTapSession();
  resetFlavorSession();
  persistState();
  rebuild();
  showToast("Fresh account. Post your first cursed short.");
}

function flushAwayToast(): void {
  showAway(pendingAway.earned, pendingAway.offlineMs);
  pendingAway = { earned: 0, offlineMs: 0 };
}

const handlers: UiHandlers = {
  onBuyBest() {
    const result = buyBest(state, buyMode);
    if (!result) return;
    const def = BUSINESSES[state.planet][result.index];
    const ownedNow = state.businesses[state.planet][result.index].owned;
    const mark = nextMilestone(ownedNow - result.count);
    persistState();
    view = { ...view, selected: result.index };
    rebuild();
    playJuice("buy", state.muted);
    flashBuy(root, result.index, result.count);
    if (mark !== null && ownedNow >= mark) {
      playJuice("rank", state.muted);
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
      persistState();
      rebuild();
      playJuice("buy", state.muted);
      flashBuy(root, index, n);
      if (mark !== null && row.owned >= mark) {
        playJuice("rank", state.muted);
        showToast(pickFlavor("milestone", { name: def.name, mark }));
      } else if (n >= 10) {
        showToast(pickFlavor("buy-bulk", { n, name: def.name }));
      }
    }
  },
  onRun(index) {
    const result = tapBar(state, index, taps);
    if (result === "none") return;
    persistState();
    playJuice("tap", state.muted);
    // Patch, never rebuild: a tap is the fastest thing in the game and a full
    // re-render would drop the button out from under the next one.
    patchMeters(root, state, buyMode, view, Date.now());
    if (result === "nudge") flashNudge(root);
    pulseRun(root, index);
  },
  onManager(index, planet) {
    const target = planet ?? state.planet;
    const def = BUSINESSES[target][index];
    if (hireManager(state, index, target)) {
      persistState();
      rebuild();
      playJuice("hire", state.muted);
      showToast(pickFlavor("manager", { name: def?.name ?? "this bar" }));
    }
  },
  onHireAll() {
    const n = hireAllAffordable(state);
    if (n <= 0) return;
    persistState();
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
      persistState();
      rebuild();
      playJuice("prestige", state.muted);
      showToast(pickFlavor("prestige", { gain: gain.toFixed(1), name: unlockedName }));
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
      persistState();
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
    sheet = "menu";
    rebuild();
  },
  onReset() {
    if (!currentUser) return;
    if (!window.confirm("Wipe this save? The algorithm forgets you.")) return;
    wipeCurrentUser();
  },
  onOpenSheet(next: MoreSheet) {
    sheet = next;
    rebuild();
  },
  onHome() {
    persistRoute("landing");
    view = landingView(state, buyMode);
    sheet = null;
    rebuild();
  },
  onContinue() {
    if (!currentUser) return;
    persistRoute("farm");
    dismissTooltip(state);
    view = homeView(state, buyMode, view.bestMode);
    sheet = state.pendingChest ? "chest" : null;
    persistState();
    rebuild();
    flushAwayToast();
  },
  onBuyChestUpgrade() {
    if (!buyChestUpgrade(state)) return;
    persistState();
    rebuild();
    playJuice("buy", state.muted);
    showToast("Chest lasts longer. Rate ticked up.");
  },
  onSignIn(username) {
    signIn(username);
  },
  onBuyShop(id) {
    if (!buyShop(state, id)) return;
    persistState();
    rebuild();
    playJuice("buy", state.muted);
    showToast("Hype spent. That upgrade stays.");
  },
  onNewRun() {
    if (!currentUser) return;
    if (hasSaveProgress(state) && !window.confirm("Wipe this save? The algorithm forgets you.")) return;
    wipeCurrentUser();
  },
  onClaimDrop() {
    const views = claimEventDrop(state, Date.now());
    if (views <= 0) return;
    persistState();
    rebuild();
    playJuice("claim", state.muted);
    showToast(`Event drop +${formatNum(views)}`);
  },
  onClaimEvent(id) {
    const item = claimEventShop(state, id);
    if (!item) return;
    persistState();
    rebuild();
    playJuice("claim", state.muted);
    showToast(`Claimed ${item.name}`);
  },
  onClaimPass(id) {
    const tier = claimPass(state, id);
    if (!tier) return;
    persistState();
    rebuild();
    playJuice("claim", state.muted);
    showToast(`Pass: ${tier.name}`);
  },
  onClaimChest() {
    const views = claimChest(state);
    sheet = null;
    if (views > 0) {
      persistState();
      rebuild();
      playJuice("chest", state.muted);
      showToast(`Comeback chest +${formatNum(views)}`);
      return;
    }
    rebuild();
  },
  onMute() {
    toggleMute(state);
    persistState();
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
    persistRoute("farm");
    view = homeView(state, buyMode, view.bestMode);
    sheet = state.pendingChest ? "chest" : null;
    persistState();
    rebuild();
    showToast("Save imported.");
  },
  onRecap() {
    sheet = "recap";
    rebuild();
  },
  onDismissTip() {
    dismissTooltip(state);
    persistState();
    rebuild();
  },
};

function rebuild(): void {
  renderApp(root, state, buyMode, view, sheet, handlers, Date.now(), session());
}

rebuild();
if (view.screen !== "landing") flushAwayToast();

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  const wall = Date.now();
  if (view.screen === "landing") {
    state.lastTs = wall;
    patchMeters(root, state, buyMode, view, wall);
    if (now - saveAt > 2000) {
      persistState();
      saveAt = now;
    }
    requestAnimationFrame(frame);
    return;
  }
  tick(state, dt, taps, wall);
  state.playMs += dt * 1000;
  patchMeters(root, state, buyMode, view, wall);
  if (now - saveAt > 2000) {
    persistState();
    saveAt = now;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener("beforeunload", () => persistState());

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
  if (sheet) {
    handlers.onSheetClose();
    return;
  }
  if (view.screen === "inside") handlers.onFarm();
});

if (import.meta.env.DEV) {
  Object.assign(window, {
    __slop: {
      getState: () => state,
      getUser: () => currentUser,
      buyBest: () => buyBest(state, buyMode),
      hireAll: () => hireAllAffordable(state),
      prestige: () => prestige(state),
      algo: () => algo(state),
      exportSave: () => exportSave(state),
    },
  });
  console.info("Slop Capitalist", { user: currentUser, views: formatNum(state.views) });
}
