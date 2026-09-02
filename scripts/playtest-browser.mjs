import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8896/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.clear();
});
await page.reload({ waitUntil: "networkidle" });

const notes = [];
try {
  const land = await page.locator("body").innerText();
  notes.push(`first paint: ${land.includes("Continue") && land.includes("New run") ? "landing" : "NOT landing"}`);
  notes.push(`landing bullets: buy=${land.includes("Tap a farm")} farm=${land.includes("farm is the game")} prestige=${land.includes("Prestige when the chip fills")}`);
  notes.push(`dumped into farm: ${land.includes("YouTube farm")}`);
  notes.push(`username field: ${land.includes("Username")}`);
  await page.screenshot({ path: "docs/playtest-landing.png", fullPage: true });

  await page.locator("[data-username]").fill("Caleb");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("[data-continue]:not([disabled])");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.waitForSelector("[data-dock-buy], [data-buy-best], [data-dismiss-tip]");
  const farm = await page.locator("body").innerText();
  notes.push(`after Continue: ${farm.includes("YouTube farm") ? "YouTube farm" : "NOT farm"}`);
  notes.push(`default mint is selected row: ${farm.includes("Cursed Short") && !farm.includes("Buy BEST")}`);
  notes.push(`BEST chip present: ${farm.includes("BEST")}`);
  notes.push(`prestige card on farm: ${farm.includes("Unlock The Simulation")}`);
  notes.push(`header BEST repeat: ${/Best:\s+\d/.test(farm)}`);
  notes.push(`Algo on fresh farm: ${/\bAlgo\b/.test(farm) && farm.includes("Algo 1.00")}`);
  notes.push(`qty chips visible: ${farm.includes("RANK") && farm.includes("MAX") ? "yes" : "hidden"}`);
  notes.push(`qty label: ${farm.includes("Qty")}`);
  notes.push(`farm hire-all: ${farm.includes("Hire all")}`);
  notes.push(`farm tip after landing: ${farm.includes("Got it")}`);
  notes.push(`SIM chip: ${farm.includes("SIM")}`);

  if (farm.includes("Got it")) {
    await page.getByRole("button", { name: "Got it" }).click();
    notes.push("dismissed first-run tip");
  }
  await page.screenshot({ path: "docs/playtest-home.png", fullPage: true });

  const rows = await page.locator("[data-row]").count();
  notes.push(`farm rows visible: ${rows}`);

  const rowBuy = page.locator("[data-dock-buy]");
  if (await rowBuy.count()) {
    const label = await rowBuy.innerText();
    notes.push(`dock: ${label.replace(/\s+/g, " ").trim()}`);
    if (!(await rowBuy.isDisabled())) {
      await rowBuy.click();
      notes.push("clicked selected-row buy");
    } else {
      notes.push("selected buy disabled at fresh start (waiting for first views)");
      await page.waitForTimeout(1500);
      const later = await rowBuy.innerText();
      notes.push(`after 1.5s: ${later.replace(/\s+/g, " ").trim()} disabled=${await rowBuy.isDisabled()}`);
      if (!(await rowBuy.isDisabled())) {
        await rowBuy.click();
        notes.push("clicked selected-row buy after wait");
      }
    }
  }
  await page.locator("[data-best-mode]").click();
  const best = page.locator("[data-buy-best]");
  if (await best.count()) {
    notes.push(`BEST mode dock: ${(await best.innerText()).replace(/\s+/g, " ").trim()}`);
  }

  const stillFarm = await page.locator("[data-row]").count();
  await page.getByRole("button", { name: "Mgrs" }).click();
  const mgrText = await page.locator("body").innerText();
  const farmUnderMgrs = await page.locator("[data-row]").count();
  notes.push(`Mgrs sheet: ${mgrText.includes("Hire all affordable") ? "hire-all present" : "MISSING hire-all"}`);
  notes.push(`farm still mounted under Mgrs: ${farmUnderMgrs >= stillFarm}`);
  await page.getByRole("button", { name: "← Farm" }).click();

  await page.getByRole("button", { name: "Drop" }).click();
  const dropText = await page.locator("body").innerText();
  notes.push(`Drop sheet: ${dropText.includes("Claim drop") ? "claim present" : "no claim"}`);
  await page.getByRole("button", { name: "← Farm" }).first().click();

  await page.getByRole("button", { name: "Pass" }).click();
  const passText = await page.locator("body").innerText();
  notes.push(`Pass sheet: ${passText.includes("Infinity Intern") ? "pass track" : "MISSING"}`);
  await page.getByRole("button", { name: "← Farm" }).first().click();

  await page.getByRole("button", { name: "Prestige" }).click();
  const prestige = await page.locator("body").innerText();
  notes.push(`prestige sheet: ${prestige.includes("0 / 1M") || prestige.includes("/ 1M") ? "progress" : "MISSING progress"}`);
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Home" }).click();
  const home = await page.locator("body").innerText();
  notes.push(`wordmark home: ${home.includes("Continue") ? "landing" : "NOT landing"}`);
  notes.push(`save wiped on home: ${home.includes("Continue ·") ? "kept views" : "fresh or no views yet"}`);

  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.waitForSelector("[data-dock-buy], [data-buy-best]");
  notes.push(`continue again: ${(await page.locator("[data-row]").count()) > 0 ? "farm" : "MISSING farm"}`);

  await page.locator("[data-overflow]").click();
  const settings = await page.locator("body").innerText();
  notes.push(`settings: mute=${settings.includes("Mute")} export=${settings.includes("Copy export")} recap=${settings.includes("recap")}`);
} catch (err) {
  notes.push(`ERROR: ${err.message}`);
  await page.screenshot({ path: "docs/playtest-fail.png", fullPage: true }).catch(() => {});
  console.log(notes.map((n) => `- ${n}`).join("\n"));
  await browser.close();
  throw err;
}
await browser.close();
console.log(notes.map((n) => `- ${n}`).join("\n"));
