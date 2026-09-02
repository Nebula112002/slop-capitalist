/**
 * Render the SVG marks in public/ into the PNGs the web manifest and iOS want.
 *
 *   node scripts/make-icons.mjs
 *
 * Playwright is already a dev dependency, so it does the rasterising and there
 * is no image toolchain to install. Re-run this after editing either SVG.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");

const JOBS = [
  { from: "favicon.svg", to: "icon-192.png", size: 192, transparent: true },
  { from: "favicon.svg", to: "icon-512.png", size: 512, transparent: true },
  { from: "icon-maskable.svg", to: "icon-maskable-512.png", size: 512, transparent: false },
  { from: "icon-maskable.svg", to: "apple-touch-icon.png", size: 180, transparent: false },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const job of JOBS) {
  const svg = await readFile(join(pub, job.from), "utf8");
  await page.setViewportSize({ width: job.size, height: job.size });
  await page.setContent(
    `<!doctype html><style>
       html,body{margin:0;padding:0;background:transparent}
       svg{display:block;width:${job.size}px;height:${job.size}px}
     </style>${svg}`,
    { waitUntil: "load" },
  );
  const png = await page.locator("svg").screenshot({ omitBackground: job.transparent });
  await writeFile(join(pub, job.to), png);
  console.log(`- ${job.to} (${job.size}px from ${job.from})`);
}

await browser.close();
