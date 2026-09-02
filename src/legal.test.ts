/**
 * Compliance regressions, not gameplay.
 *
 * These lock in three things that are easy to undo by accident:
 *  - no real platform's trademark ships in a player-visible string,
 *  - the save-critical ids stay frozen even though the display names changed,
 *  - the page makes no third-party request.
 *
 * Reasoning and the residual risks are in docs/LEGAL-NOTES.md.
 *
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
// Read as text through Vite so the check needs no node typings.
import indexHtml from "../index.html?raw";
import oflBebas from "../public/fonts/OFL-Bebas-Neue.txt?raw";
import oflPlex from "../public/fonts/OFL-IBM-Plex.txt?raw";
import gameSource from "./game.ts?raw";
import mainSource from "./main.ts?raw";
import stylesSource from "./styles.css?raw";
import uiSource from "./ui.ts?raw";
import {
  BUSINESSES,
  EVENTS,
  EVENT_SHOP,
  HYPE_SHOP,
  PASS_TIERS,
  PLANETS,
  PLANET_IDS,
  SAVE_KEY,
  UI_ROUTE_KEY,
  USER_INDEX_KEY,
} from "./data";
import { newGame, prestige } from "./game";
import { renderApp, type UiHandlers, type UiView } from "./ui";

/**
 * Marks owned by other companies. Generic English ("short", "feed", "reaction")
 * is fine and is the point of the parody; these are the brand names.
 */
const MARKS = [
  "youtube",
  "tiktok",
  "bytedance",
  "instagram",
  "snapchat",
  "twitch",
  "facebook",
  "adventure capitalist",
  "hyper hippo",
  "computerlunch",
  "for you page",
  "fyp",
];

/** Every string a player can actually read, ids excluded on purpose. */
function playerFacingStrings(): string[] {
  const out: string[] = [];
  for (const planet of PLANETS) out.push(planet.name, planet.tag, planet.unlock);
  for (const list of Object.values(BUSINESSES)) {
    for (const def of list) out.push(def.name, def.blurb, def.managerName);
  }
  for (const ev of EVENTS) out.push(ev.name, ev.blurb, ev.extraName);
  for (const item of EVENT_SHOP) out.push(item.name, item.title ?? "");
  for (const tier of PASS_TIERS) out.push(tier.name, tier.title ?? "");
  for (const item of HYPE_SHOP) out.push(item.name, item.blurb);
  return out.filter(Boolean);
}

const noop = new Proxy({}, { get: () => () => {} }) as UiHandlers;
const farm: UiView = { screen: "outside", selected: 0, bestMode: false };
const landing: UiView = { screen: "landing", selected: 0, bestMode: false };

describe("trademarks", () => {
  it("ships no third-party brand name in any player-facing string", () => {
    const offenders: string[] = [];
    for (const text of playerFacingStrings()) {
      for (const mark of MARKS) {
        if (text.toLowerCase().includes(mark)) offenders.push(`${mark} in "${text}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("ships no third-party brand name in the rendered farm or landing", () => {
    const state = newGame();
    state.viewsThisRun = state.nextPrestigeAt;
    prestige(state);
    state.viewsThisRun = state.nextPrestigeAt;
    prestige(state);

    const offenders: string[] = [];
    for (const view of [farm, landing]) {
      for (const planet of PLANET_IDS) {
        state.planet = planet;
        const root = document.createElement("div");
        renderApp(root, state, 1, view, "menu", noop, 1);
        const text = (root.textContent ?? "").toLowerCase();
        for (const mark of MARKS) {
          if (text.includes(mark)) offenders.push(`${mark} on ${view.screen}/${planet}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("says the parody is unaffiliated where a player can read it", () => {
    const root = document.createElement("div");
    renderApp(root, newGame(), 1, farm, "legal", noop);
    expect(root.textContent).toContain("not affiliated");
  });
});

describe("frozen save identifiers", () => {
  it("keeps planet ids even though the display names changed", () => {
    // These are written into every save. Renaming them orphans real progress.
    expect(PLANET_IDS).toEqual(["youtube", "tiktok", "simulation"]);
    expect(PLANETS.map((planet) => planet.id)).toEqual(["youtube", "tiktok", "simulation"]);
    expect(PLANETS.map((planet) => planet.name)).toEqual(["The Tube", "The Feed", "The Simulation"]);
  });

  it("keeps the claim ids that live inside saves", () => {
    expect(PASS_TIERS.map((tier) => tier.id)).toEqual([
      "intern",
      "gremlin",
      "scheduler",
      "fyp",
      "swarm",
      "sim",
      "infinity",
    ]);
    expect(EVENT_SHOP.map((item) => item.id)).toEqual(["sticker", "nudge", "banner"]);
    expect(EVENTS.map((ev) => ev.id)).toEqual(["thumbnail-friday", "duet-storm", "agent-night"]);
  });

  it("keeps the storage keys", () => {
    expect(SAVE_KEY).toBe("slop-capitalist.v1");
    expect(UI_ROUTE_KEY).toBe("slop-capitalist.ui");
    expect(USER_INDEX_KEY).toBe("slop-capitalist.users");
  });
});

describe("no third-party requests", () => {
  it("self-hosts the fonts instead of calling a CDN", () => {
    expect(indexHtml).not.toContain("fonts.googleapis.com");
    expect(indexHtml).not.toContain("fonts.gstatic.com");
    expect(indexHtml).toContain("/fonts/fonts.css");
  });

  it("loads nothing over the network from the app source", () => {
    for (const source of [uiSource, mainSource, gameSource, stylesSource]) {
      expect(source).not.toMatch(/https?:\/\/(?!127\.0\.0\.1)/);
    }
  });

  it("bundles the font licenses next to the fonts", () => {
    expect(oflPlex).toContain("SIL Open Font License");
    expect(oflBebas).toContain("SIL Open Font License");
  });
});
