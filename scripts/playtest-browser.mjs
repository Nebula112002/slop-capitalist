import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:8896/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });

const notes = [];
try {
const text = await page.locator("body").innerText();
notes.push(`landed: ${text.includes("YouTube farm") ? "outside YouTube" : "NOT outside"}`);
notes.push(`Buy BEST visible: ${text.includes("Buy BEST")}`);
notes.push(`tip visible: ${text.includes("Farm is home")}`);
notes.push(`SIM chip visible: ${text.includes("SIM")}`);

if (text.includes("Got it")) {
  await page.getByRole("button", { name: "Got it" }).click();
  notes.push("dismissed first-run tip");
}

const best = page.locator("[data-buy-best]");
if (await best.count()) {
  const label = await best.innerText();
  notes.push(`dock: ${label}`);
  if (!(await best.isDisabled())) {
    await best.click();
    notes.push("clicked Buy BEST");
  } else {
    notes.push("Buy BEST disabled at fresh start (waiting for first views)");
    await page.waitForTimeout(1500);
    const later = await best.innerText();
    notes.push(`after 1.5s: ${later} disabled=${await best.isDisabled()}`);
    if (!(await best.isDisabled())) await best.click();
  }
}

await page.getByRole("button", { name: "Mgrs" }).click();
const mgrText = await page.locator("body").innerText();
notes.push(`Mgrs tab: ${mgrText.includes("Hire all affordable") ? "hire-all present" : "MISSING hire-all"}`);

await page.getByRole("button", { name: "Drop" }).click();
const dropText = await page.locator("body").innerText();
notes.push(`Drop tab: ${dropText.includes("Claim drop") ? "claim present" : "no claim"}`);

await page.getByRole("button", { name: "Pass" }).click();
const passText = await page.locator("body").innerText();
notes.push(`Pass tab: ${passText.includes("Infinity Intern") ? "pass track" : "MISSING"}`);

await page.locator("[data-overflow]").click();
const settings = await page.locator("body").innerText();
notes.push(`settings: mute=${settings.includes("Mute")} export=${settings.includes("Copy export")} recap=${settings.includes("recap")}`);

await page.screenshot({ path: "docs/playtest-home.png", fullPage: true });
} catch (err) {
  notes.push(`ERROR: ${err.message}`);
  await page.screenshot({ path: "docs/playtest-fail.png", fullPage: true }).catch(() => {});
  console.log(notes.map((n) => `- ${n}`).join("\n"));
  await browser.close();
  throw err;
}
await browser.close();
console.log(notes.map((n) => `- ${n}`).join("\n"));
