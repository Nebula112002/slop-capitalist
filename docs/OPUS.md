# Slop Capitalist — Opus overhaul

This is the **only** Opus brief. There is no competing guidelines file.

> **Status:** the overhaul pass shipped. What it did, what it measured, and what it left honestly
> undone is in [`docs/PLAYTEST.md`](PLAYTEST.md) under *Pass 2*. The brief below stays as written —
> read it as the spec, not as an open queue.

---

## Prompt to give Opus

Copy everything inside the fence into a new Opus chat.

```
Read this whole file first, then implement. Do not only re-plan.

  D:\AI\slop-capitalist\docs\OPUS.md

Game
- Repo: D:\AI\slop-capitalist (own git). Work only there.
- Port: 8896 on this PC. Play at http://127.0.0.1:8896
- Start:  cd D:\AI\slop-capitalist ; .\scripts\start.ps1
- Dev:    .\scripts\start.ps1 -Dev
- Stop:   .\scripts\stop.ps1
- Tests:  npm test ; npm run build
- Playwright (phone 390×844): node scripts/playtest-browser.mjs
  (needs the server up)

Job
Do the UI/UX overhaul described in that file. Implement it in the live toy.
You own landing, farm chrome, inside cards, sheets, phone layout, information
architecture, motion, accessibility, copy, visual hierarchy, and farm-row
density. Be ambitious. Redesign how things look and flow. A first cleanup
already shipped; this pass should feel like a product, not a tidy debug UI.

Do not
- Do not touch monetization (no IAP, ads, paid passes, Stripe; do not write MONETIZATION.md)
- Game lives on PC :8896, never bind :3000
- Do not fold into d-ai; work in D:\AI\slop-capitalist
- Do not lie about BEST math (formula can stay; presentation can change)
- Do not ship a second competing save format that wipes users

After you ship, play it — browser at http://127.0.0.1:8896 and/or Playwright.
```

---

## Mission

Make Slop Capitalist feel like a game people want to tap, not a spreadsheet wearing a farm costume.

You are free to overhaul UI, UX, information architecture, motion, accessibility, the landing page, farm chrome, inside cards, sheets, phone layout, copy, and visual hierarchy. Compress, merge, move, restyle, rewrite labels, invent better navigation, grow hit targets, add motion, kill dead chrome, put the farm list on a phone-sized fold.

A first cleanup already shipped (landing route, thin prestige chip, sheets-over-farm, BEST as a mode chip, selected-row mint). Treat that as **starting clay**, not a museum. If a layout, label, or flow is still ugly, replace it.

**Implement. Do not produce another plan.**

---

## Where it lives

| | |
|---|---|
| Repo | `D:\AI\slop-capitalist` — own git. Not d-ai. |
| Host | This PC only. Never the warehouse. |
| Port | **`8896`**. Never `:3000` (warehouse homepage). |
| Play | http://127.0.0.1:8896 |
| Tailnet | https://calebscomputer.tailfdadcb.ts.net:8896 |
| Start | `.\scripts\start.ps1` (`-Dev` for hot reload, `-Open` to launch a browser) |
| Stop | `.\scripts\stop.ps1` |
| Health | `GET /api/health` → `{ ok, service: "slop-capitalist", port: 8896 }` |
| Stack | Vite + TypeScript. No React. No backend. |

Save today: `localStorage` key `slop-capitalist.v1` plus per-username keys `slop-capitalist.v1.<slug>`. UI route (`landing` | `farm`) is a separate key `slop-capitalist.ui`. Hydrate; do not orphan live saves.

The live toy is a **content-farm / algorithm idle** (YouTube → TikTok → The Simulation). That is the product identity. Redesign the chrome around it.

---

## Live systems (context — do not silently delete)

These already work. You may redesign how they look, where they live, and how the player reaches them. Do not rip the systems out, and do not invent a second save that wipes people.

### Selected-row buy

Mint / primary buy follows the **highlighted farm row**. Tap a row to select it; the dock names that farm and the quoted cost. Default selection prefers something they can actually buy (owned starter when nothing is affordable).

You can change selection chrome, row density, how “this is the one I’m buying” reads. Keep a way to buy a specific farm without going through an advisor.

### BEST as a mode chip

BEST is a **dock chip**, not the only primary. Turning it on switches the mint button to the advisor winner (`adviseFarm` / `buyBest`). Turning it off returns mint to the selected row.

Row **BEST** badges still mark the winner. An old header “Best: N” line was removed on purpose (three BEST labels felt like a lie). You can restyle, relocate, or rewrite the presentation. **Do not invent a different winner.**

Scoring (keep honest):

```
count  = resolveBuyCount(state, index, buyMode)
cost   = buyCost(..., count)
ΔVPS   = potentialVPS after the quoted buy − potentialVPS before
score  = ΔVPS / cost
BEST   = argmax(score); ties keep the lower index
```

Only rows the player can actually buy under the current chip (1 / 10 / 100 / MAX / RANK). Locked / unaffordable rows never win. No BEST if nothing is affordable. Tests in `src/game.test.ts` own this. UI must not pick a prettier farm.

RANK changes what BEST means (best step toward a rank, not “buy the selected row”). A one-liner already exists on the dock. You can make that clearer.

Early BEST is often Cursed Short. The math is right. Optional why-BEST copy (inside the mint label, a toast, a row hint) is fair game. Never a second header BEST line that disagrees with the badge.

### Username sign-in

Local names, no password, no email, no cloud. Per-save keys. Legacy `slop-capitalist.v1` is claimed by the **first** username only, then removed so Alice does not inherit Caleb.

Landing: username, Continue / New run. Continue names the signed-in save (`Continue · {name} · {views}`) and never wipes. New run confirms before wipe. Farm does not tick on the pitch; away toasts wait until Continue. Returning players who last left on **farm** skip landing. Tapping **Slop** in the wordmark returns to landing without touching the save.

You can make this feel like a product page instead of a debug form.

### Hype prestige

This-run gate (not lifetime spam). Prestige banks **Hype** into a shop in the prestige sheet. First bar 1M this-run, then 1B, then The Simulation. Viral multiplier does not jump for free on prestige. Toasts say Hype, not fake `+Nx`.

Live chrome: compact chip → confirm sheet (shop lives there). Algo is hidden until it can fire or they already have a layer. Ready state is a gold edge. Easy to miss next to huge Views — make “ready to prestige” glanceable on a 390px phone.

You can restyle the chip, the sheet, the shop, the progress copy. Payout / re-lock formulas already work.

### Idle chest

Comeback chest: **25% bonus** on top of away earnings, claimed once. Needs ~60s away + earnings. Duration / rate upgrades live on the chest sheet and in settings. Playwright on a live tab never sees it; noticing the chest after a real away is still on you. Make it findable without eating the farm list.

### Hire all

On the farm when a manager is waiting, and still in the managers sheet. Hire owned, affordable managers cheapest first. Managers / Drop / Pass currently open as **sheets over the farm** (list stays mounted). You may invent a better hire flow — play it and keep the farm reachable.

### The Simulation

Second prestige unlocks it with a starter. Copy costs are 1e12+. Poster-planet note is already on the farm. Economy / 1e12 stays until a real hour of play. Chrome will not fix a poster planet, but the SIM chip, empty-planet copy, and “you cannot usefully buy this yet” treatment are yours.

### Other live bits worth knowing

| Thing | Today |
|---|---|
| Planets | YT / TT / SIM switcher on the farm title row |
| Qty | Dock chips `1 10 100 MAX RANK`. RANK buys up to the next milestone (partial OK) |
| Mint | Primary. Gold = views. Pink is not an active qty state |
| Open | Quiet chevron into inside; louder on the selected row. Fat-finger is the failure |
| Farm tip | Dismissed after Continue from landing |
| SLOW badge | Muted, not hot pink |
| Cycle speed | Halves at 25 / 100 / 400 / 1000, floor 0.25s. Cursed Short strobes at 100 |
| Event / pass | Sheets, not permanent header tickers. First drop is a snack; pass titles are flavor |
| Juice | Tiny beep. Mute works |
| Export / import | JSON in settings. Local only |

---

## What failed (screenshot + playtest)

Ground truth was a phone screenshot (~390×844) plus `docs/PLAYTEST.md`. A first cleanup landed. These problems are **still the brief**.

### Screenshot — farm buried under a menu pile

Vertical space went to chrome, not the list. ~3 farm rows visible.

| Zone | What was wrong |
|---|---|
| Top | Wordmark + title + 4-stat wallet. Homework card. |
| Prestige | Fat card + yellow Prestige + grey Algo ate the fold. |
| Planets | Tiny chips fighting prestige. |
| Tickers | Event / pass as permanent pips. Rare jobs in prime space. |
| Body | ~3 farm rows squeezed. |
| Bottom | Three stacked dock rows. Buy BEST giant. |
| BEST ×3 | Header line + row badge + dock button. Felt like a lie even when math was right. |
| Color | Mint, pink, gold, yellow all “active.” No hierarchy. |

### Playtest pile (same story, still yours)

1. **Top chrome is a pile on a phone.** Wallet, prestige, planets, leftover pips, tip — homework before the farm.
2. **Algo looked broken** when grey-and-dead on the farm. (Now hidden until live — keep that honesty, or find a better “not yet” treatment that does not look unfinished.)
3. **Managers as a scene change.** Hire-all helps; a nicer farm-native hire is still fair game.
4. **Open fat-fingers off the farm.** Chevron is a first cut. Swipe, long-press, selected-only — yours if it is clearer.
5. **Early BEST is always Cursed Short.** Math is right. Optional why-BEST copy without changing the winner.
6. **RANK changes what BEST means.** One sentence is enough. A new player still may not get it.
7. **Event drop is a free snack.** Second open is titles. Fine as flavor; do not fake a live-ops ticker.
8. **Pass first reward is a title.** Later view packs are so far they read as flavor text.
9. **The Simulation is a poster.** 1e12+ copies. Copy can stay dry; do not apologize with a paragraph.
10. **Comeback chest is easy to miss** after 60s away. Sheet is fine; noticing it is on you.
11. **Juice is a tiny beep.** Make a buy feel like a buy. Mute already works.
12. **0.25s strobe at rank 100.** Flavor / economy — chrome cannot fake a retune. Motion / “Live” treatment on the bar is yours.

---

## Player jobs

Order is the loop. Rare jobs should not occupy prime space unless you have a better idea and prove it.

| Job | Frequency | Needs |
|---|---|---|
| Look at money | Every glance | Big **Views** + **VPS**, not a 2×2 exam |
| Pick a farm | When a planet unlocks | YT / TT / SIM next to the list, not fighting prestige for the fold |
| Buy the right thing | Every session | Selected-row buy **or** BEST mode + a **BEST** badge — not three competing BEST labels |
| Prestige when ready | Rare | Glanceable ready state → confirm sheet |
| Hire | Occasional | Farm hire-all + a list that does not steal the camera |
| Event / pass | Rare | Reachable; not a permanent ticker row |
| Settings / save | Rare | Overflow. Chest upgrades, recap, export / import, mute, reset |

Inside (per-card tap / flavor) is optional spice. Outside farm is home unless you invent a clearly better home and play it.

---

## Surfaces (current tree — you may redesign)

What shipped:

```
Landing  →  Farm (outside)  →  optional Inside
                 │
                 ├─ sheet: Prestige (Hype shop + Algo when live)
                 ├─ sheet: Managers
                 ├─ sheet: Drop
                 ├─ sheet: Pass
                 └─ sheet: Settings (chest / recap / export / import / mute / reset)
```

- **Landing** is a route, not a wipe. Persist last route in `slop-capitalist.ui`. Never write that into the game save. Never clear `slop-capitalist.v1` unless the player confirms **New run** / Reset.
- **Farm** is the game. Sheets overlay; closing returns to the same list.
- **Inside** is a drill-in. Back is “← Farm”. Open should not be the default verb.

You may collapse, rename, restyle, or re-flow these. The farm is the game — keep buying fast. Hype shop already lives in prestige; one buy brain is enough.

### Dock

Sticky bottom today: qty + BEST chip + primary buy. Make it work on a 320px phone. Room for an event/pass icon without a third always-on stack is a plus.

Mint button copy today:

- Default: names the **selected** farm and the quoted cost.
- BEST mode: names the advisor winner and the quoted cost. If nothing is affordable: `Nothing to buy`.

You can make that better. Keep it honest.

---

## Landing (marketing polish)

One screen. No farm chrome. No wallet. No dock.

Already there: wordmark, one-line pitch, three bullets, username, Continue / New run, local-only footer.

Take it further:

- Continue still reads `Continue · {name} · {views}` when a save exists so they know nothing was wiped.
- New run stays quiet and confirms before wipe.
- Product page, not a debug form. Hierarchy, type, spacing, a real primary. Not a 4.6rem poster title that fights the farm.
- Footer can stay honest: local only, no ads, no checkout, lives on this PC.
- Returning players who last left on **farm** skip landing. **Slop** brings them back without touching the save.

---

## Visual hierarchy

Current tokens (you may evolve them if the system stays one accent):

| Role | Color | Use today |
|---|---|---|
| Primary action | **Mint** `#2ef2a8` | Buy (selected or BEST), selected row, Slop home, qty/BEST active outline |
| Money | **Gold** `#ffd166` | Views. Prestige-ready may use a gold edge, not a second page-width button |
| Everything else | Mute | Viral / Hype chips, tools, Open, locked rows, body text |
| Pink | Almost gone | Never an active qty state. SLOW is boring on purpose |

One accent. If two things glow, the player does not know what to tap.

---

## Still ugly / your queue

Work these. Each one should leave the farm list bigger or clearer — unless you have a better composition that you actually play and it wins.

1. **Farm-row density** — more of the 844px should be rows. Compress brand + wallet + dock. Phone wrap: prestige chip must not hide under huge Views; wallet chips should travel as a group.
2. **Inside-card chrome** — inside still grows a Hire button in the dock. Keep inside optional. Tap juice on the card, not by bloating the outside list.
3. **Open** — quieter still, or swipe / long-press into inside. Fat-finger is the failure.
4. **Qty discoverability** — chips are labeled `Qty`. A new player should understand 10 / 100 / MAX / RANK without a tutorial card.
5. **Why-BEST** — optional one-liner *inside* the Buy BEST label or a toast. Never a header duplicate. Only if it reduces “Cursed Short is a liar” **without changing the winner.**
6. **Prestige chip** — ready state is a gold edge. Make “ready to prestige” glanceable on a 390px phone.
7. **Event / pass** — second open should be worth it, or accept they are chrome and keep them out of the farm header.
8. **Comeback chest** — easier to notice after 60s away.
9. **Managers** — hire-all is on the farm when someone is hireable. The sheet is still a tall list. Make it nicer.
10. **The Simulation** — poster copy is on the farm. Economy stays.
11. **Motion** — buy should feel like a buy. Respect `prefers-reduced-motion`.
12. **A11y** — sheet focus trap, backdrop close, wordmark name, hit targets, reduced-motion. Keyboard through qty chips + selected row. Labels that a screen reader can use.
13. **Landing polish** — type, spacing, Continue as a real primary, username field that does not look bolted on.

---

## Copy

- Dry, observational, a little mean about the algorithm. Not a dialogue tree.
- Landing does not say “wipe” unless they tap New run.
- Simulation poster note can stay dry. Do not apologize with a paragraph.
- Algo does not exist in the UI until it can do something or they already have a layer — or you replace that with a treatment that does not look broken.
- Prestige banks Hype. The old “Permanent +Nx viral” toast was a lie after the Hype retune.

---

## Files you will likely touch

| File | Why |
|---|---|
| `src/ui.ts` | Landing, chrome, sheets, dock, rows |
| `src/styles.css` | Hierarchy, landing, sheets, phone wrap, motion |
| `src/main.ts` | Sheet / route / qty / selection interaction |
| `src/ui.test.ts` | Landing, routes, sheets, selected vs BEST presentation |
| `scripts/playtest-browser.mjs` | Landing → sign-in → Continue → farm (update selectors if you change them) |
| `src/game.ts` | Only if a flow truly needs it. **Do not retouch BEST scoring.** |

`npm test && npm run build`. Restart `:8896` via `.\scripts\start.ps1`.

---

## Play it after

1. `.\scripts\start.ps1` (or `-Dev`).
2. Browser: http://127.0.0.1:8896 — landing, sign-in, Continue, buy, BEST chip on/off, qty including RANK, Open into inside and back, prestige sheet, managers / hire-all, settings, a phone-width viewport (~390×844).
3. Playwright: `node scripts/playtest-browser.mjs` (server must be up). Screenshots land in `docs/playtest-landing.png` and `docs/playtest-home.png`.
4. Confirm saves still load (username keys, Continue does not wipe). Confirm BEST badge still matches `adviseFarm`.

---

## Do not

Only these:

- **Do not touch monetization** — no IAP, ads, paid passes, Stripe, checkout, or a paid shop. Do not write `docs/MONETIZATION.md`.
- Game lives on PC **`:8896`**. Never bind `:3000`.
- Do not fold into d-ai. Work in `D:\AI\slop-capitalist`.
- Do not lie about BEST math. The formula can stay; presentation can change.
- Do not ship a second competing save format that wipes users.
