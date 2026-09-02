import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8896/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.clear();
});
await page.reload({ waitUntil: "networkidle" });

const notes = [];
/** innerText applies text-transform, so compare case-insensitively. */
const has = (text, needle) => text.toLowerCase().includes(needle.toLowerCase());
const closeSheet = async () => {
  await page.locator("[data-sheet-close]").last().click();
  await page.waitForSelector("[data-sheet]", { state: "detached" });
};

try {
  const land = await page.locator("body").innerText();
  notes.push(`first paint: ${has(land, "Start posting") ? "landing pitch" : "NOT landing"}`);
  notes.push(
    `pitch points: aim=${has(land, "Tap a farm")} farm=${has(land, "farm is the game")} prestige=${has(land, "Prestige when the chip fills")}`,
  );
  notes.push(`dumped into farm: ${has(land, "YouTube farm")}`);
  notes.push(`dead Continue on a fresh browser: ${(await page.locator("[data-continue]").count()) > 0}`);
  notes.push(`player field: ${has(land, "Player name")}`);
  await page.screenshot({ path: "docs/playtest-landing.png", fullPage: true });

  // A brand-new name has no save to reassure anyone about, so it goes straight in.
  await page.locator("[data-username]").fill("Caleb");
  await page.getByRole("button", { name: "Start posting" }).click();
  await page.waitForSelector("[data-dock-buy]");
  const farm = await page.locator("body").innerText();
  notes.push(`after Start posting: ${has(farm, "YouTube farm") ? "straight to the farm" : "NOT farm"}`);
  notes.push(`default mint is the selected row: ${has(farm, "Cursed Short") && !has(farm, "Buy BEST")}`);
  notes.push(`prestige card eating the fold: ${has(farm, "Unlock TikTok")}`);
  notes.push(`header BEST repeat: ${/Best:\s+\d/.test(farm)}`);
  notes.push(`Algo on a fresh farm: ${has(farm, "Algo 1.00")}`);
  notes.push(`chip teaching line: ${(await page.locator("[data-dock-hint]").innerText()).trim()}`);
  notes.push(
    `rare-job buttons in the dock: ${await page.evaluate(() => document.querySelectorAll(".dock [data-sheet-open]").length)}`,
  );
  notes.push(`drop income attributed: ${(await page.locator("#drop").innerText()).trim()}`);
  notes.push(
    `farm hire-all: ${await page.evaluate(() => {
      const btn = document.querySelector(".pill-hire");
      if (!btn) return "not rendered";
      return btn.hidden ? "held back until a manager is affordable" : "offered";
    })}`,
  );
  notes.push(`first-run tip: ${has(farm, "Got it")}`);

  if (has(farm, "Got it")) {
    await page.getByRole("button", { name: "Got it" }).click();
    notes.push("dismissed the first-run tip");
  }
  await page.screenshot({ path: "docs/playtest-home.png", fullPage: true });

  // How much of a 390x844 phone is actually farm?
  const fold = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect() : null;
    };
    const hud = box(".hud");
    const dock = box(".dock");
    const rows = Array.from(document.querySelectorAll("[data-row]"));
    const inFold = rows.filter((row) => {
      const r = row.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    }).length;
    const rowH = rows.length ? Math.round(rows[0].getBoundingClientRect().height) : 0;
    const listH = rows.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0);
    return {
      viewport: window.innerHeight,
      hud: Math.round(hud?.height ?? 0),
      dock: Math.round(dock?.height ?? 0),
      rowH,
      rows: rows.length,
      inFold,
      listShare: Math.round((listH / window.innerHeight) * 100),
    };
  });
  notes.push(
    `fold: ${fold.viewport}px tall, chrome ${fold.hud}px top + ${fold.dock}px dock, ${fold.rows} rows at ${fold.rowH}px, ${fold.inFold} fully visible, list owns ${fold.listShare}% of the screen`,
  );

  // Nothing runs itself before a manager. The icon is the whole early game.
  const views = () => page.evaluate(() => document.querySelector("#views")?.textContent);
  const run = page.locator("[data-row='0'] [data-row-run]");
  notes.push(`run button state on a fresh farm: ${await run.getAttribute("class")}`);
  notes.push(`run button label: ${await run.getAttribute("aria-label")}`);
  await page.waitForTimeout(2000);
  notes.push(`views after 2s of not touching anything: ${await views()}`);
  for (let i = 0; i < 8; i++) {
    await run.click();
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);
  notes.push(`views after 8 taps: ${await views()}`);

  const rowBuy = page.locator("[data-dock-buy]");
  notes.push(`dock: ${(await rowBuy.innerText()).replace(/\s+/g, " ").trim()}`);
  if (!(await rowBuy.isDisabled())) {
    await rowBuy.click();
    notes.push("bought the selected row");
  } else {
    notes.push("SELECTED BUY STILL DISABLED after taps");
  }

  // Selecting a second row must move the mint button with it.
  await page.locator("[data-row='1'] [data-select]").click();
  notes.push(`select row 2 -> dock: ${(await rowBuy.innerText()).replace(/\s+/g, " ").trim()}`);
  notes.push(`open button count (selected-only): ${await page.locator("[data-enter]").count()}`);

  // Keyboard: arrows walk the list of native row buttons.
  await page.locator("[data-row='1'] [data-select]").focus();
  await page.keyboard.press("ArrowDown");
  const kb = await page.locator("[data-row='2'] [data-select]").getAttribute("aria-pressed");
  notes.push(`ArrowDown selects the next farm: ${kb === "true"}`);

  await page.locator("[data-row='0'] [data-select]").click();
  await page.locator("[data-best-mode]").click();
  const best = page.locator("[data-buy-best]");
  notes.push(`BEST mode dock: ${(await best.innerText()).replace(/\s+/g, " ").trim()}`);
  notes.push(`BEST why-line: ${(await page.locator("[data-dock-hint]").innerText()).trim()}`);
  await page.locator("[data-best-mode]").click();

  await page.locator('[data-buymode="rank"]').click();
  notes.push(`RANK dock: ${(await rowBuy.innerText()).replace(/\s+/g, " ").trim()}`);
  notes.push(`RANK hint: ${(await page.locator("[data-dock-hint]").innerText()).trim()}`);
  await page.locator('[data-buymode="1"]').click();

  // Inside is a drill-in from the selected row only, and back is one tap.
  await page.locator("[data-enter]").click();
  await page.waitForSelector("[data-card-mgr]");
  const insideText = await page.locator("body").innerText();
  notes.push(`inside card: hire on the card=${has(insideText, "Hire a thumbnail gremlin")}`);
  notes.push(`inside keeps the buy dock: ${(await page.locator("[data-dock-buy]").count()) > 0}`);
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-row]");
  notes.push("Escape returned to the farm");

  // One menu holds every rare job.
  const rowsBefore = await page.locator("[data-row]").count();
  await page.locator("[data-overflow]").click();
  await page.waitForSelector("[data-sheet-card]");
  const menu = await page.locator("[data-sheet-card]").innerText();
  notes.push(
    `menu: managers=${has(menu, "Managers")} drop=${has(menu, "Drop")} pass=${has(menu, "Pass")} stats=${has(menu, "Stats")} settings=${has(menu, "Settings")}`,
  );
  notes.push(`farm still mounted under the menu: ${(await page.locator("[data-row]").count()) >= rowsBefore}`);
  notes.push(`sheet takes focus: ${await page.evaluate(() => Boolean(document.activeElement?.closest("[data-sheet-card]")))}`);
  for (let i = 0; i < 9; i++) await page.keyboard.press("Tab");
  notes.push(
    `focus trapped after 9 tabs: ${await page.evaluate(() => Boolean(document.activeElement?.closest("[data-sheet-card]")))}`,
  );
  notes.push(`chrome behind the sheet inert: ${await page.evaluate(() => document.querySelector(".camera")?.hasAttribute("inert"))}`);
  await page.locator(".sheet-back").click({ position: { x: 20, y: 20 } });
  await page.waitForSelector("[data-sheet]", { state: "detached" });
  notes.push("backdrop tap closed the sheet");

  await page.locator("[data-overflow]").click();
  await page.locator('[data-sheet-card] [data-sheet-open="managers"]').click();
  await page.waitForSelector("[data-hire-all]");
  notes.push(
    `managers sheet: ${has(await page.locator("[data-sheet-card]").innerText(), "Hire all affordable") ? "hire-all present" : "MISSING hire-all"}`,
  );
  await closeSheet();

  await page.locator("[data-overflow]").click();
  await page.locator('[data-sheet-card] [data-sheet-open="event"]').click();
  await page.waitForSelector("[data-claim-drop]");
  notes.push(`drop sheet: ${(await page.locator("[data-claim-drop]").innerText()).trim()}`);
  await page.locator("[data-claim-drop]").click();
  notes.push(`after claim: ${(await page.locator("[data-claim-drop]").innerText()).trim()}`);
  await closeSheet();

  await page.locator("[data-overflow]").click();
  await page.locator('[data-sheet-card] [data-sheet-open="pass"]').click();
  await page.waitForSelector("[data-claim-pass]");
  notes.push(
    `pass sheet: ${has(await page.locator("[data-sheet-card]").innerText(), "Infinity Intern") ? "pass track" : "MISSING"}`,
  );
  await closeSheet();

  await page.locator("[data-overflow]").click();
  await page.locator('[data-sheet-card] [data-sheet-open="settings"]').click();
  await page.waitForSelector("[data-mute]");
  const settings = await page.locator("[data-sheet-card]").innerText();
  notes.push(
    `settings: chest=${has(settings, "Idle chest")} mute=${has(settings, "Mute")} export=${has(settings, "Copy export")}`,
  );
  await closeSheet();

  // Prestige is a meter, not a page-wide button.
  await page.locator("[data-prestige]").click();
  await page.waitForSelector("[data-prestige-go]");
  const prestige = await page.locator("[data-sheet-card]").innerText();
  notes.push(`prestige sheet: ${/\/ 1M/.test(prestige) ? "progress + Hype shop" : "MISSING progress"}`);
  notes.push(`prestige gated: ${await page.locator("[data-prestige-go]").isDisabled()}`);
  await closeSheet();

  // Home must not wipe anything.
  await page.getByRole("button", { name: /Slop Capitalist/ }).click();
  await page.waitForSelector("[data-continue]");
  const home = await page.locator("body").innerText();
  notes.push(`wordmark home: ${has(home, "Continue") ? "landing" : "NOT landing"}`);
  notes.push(`save survived home: ${/Continue \u00b7 Caleb/.test(home) ? "named + kept" : "LOST"}`);

  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.waitForSelector("[data-dock-buy]");
  notes.push(`continue again: ${(await page.locator("[data-row]").count()) > 0 ? "farm" : "MISSING farm"}`);

  // A second player must not inherit the first save.
  await page.getByRole("button", { name: /Slop Capitalist/ }).click();
  await page.locator("[data-username]").fill("Alice");
  await page.getByRole("button", { name: "Switch or create a player" }).click();
  await page.waitForSelector("[data-dock-buy]");
  const alice = await page.evaluate(() => document.querySelector("#views")?.textContent);
  notes.push(`fresh player starts clean: views=${alice}`);
  await page.getByRole("button", { name: /Slop Capitalist/ }).click();
  await page.waitForSelector("[data-user-pick]");
  notes.push(`other saves listed: ${await page.locator("[data-user-pick]").count()}`);
} catch (err) {
  notes.push(`ERROR: ${err.message}`);
  await page.screenshot({ path: "docs/playtest-fail.png", fullPage: true }).catch(() => {});
  console.log(notes.map((n) => `- ${n}`).join("\n"));
  await browser.close();
  throw err;
}
await browser.close();
console.log(notes.map((n) => `- ${n}`).join("\n"));
