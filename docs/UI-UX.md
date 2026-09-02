# Slop Capitalist — UX brief (hand this to Opus)

**Repo:** `D:\AI\slop-capitalist` (own git). Not d-ai.  
**Port:** `8896`. PC only. Never `:3000`.  
**Save:** `localStorage` `slop-capitalist.v1`. Do not wipe it.  
**UI route:** `localStorage` `slop-capitalist.ui` (`landing` | `farm`). Separate key.  
**No IAP. No ads. No checkout. BEST math stays as-is.**

This file is the information-architecture brief. A first cleanup already shipped on `cursor/ux-cleanup-landing-9ab8`. Use **§8** for what is done and **§9** for what is still ugly. Do not re-decide BEST scoring. Do not restyle into a different game.

---

## 1. What’s wrong

Ground truth is a phone screenshot of the live farm (2026-09-02) plus `docs/PLAYTEST.md`.

### Screenshot (farm, Infinity Intern, late-game numbers)

The farm is playable underneath a menu pile. Vertical space goes to chrome, not the list.

| Zone | What’s on screen | Why it fails |
|---|---|---|
| Top | Wordmark + mint title “Infinity Intern” + 4-stat wallet (Views, /s, Viral, Algo) | Four numbers, four weights. Wallet is a homework card. |
| Prestige block | “Unlock The Simulation” card + fat yellow **Prestige** + grey **Algo** | Eats the fold. Prestige is a destination, not every-frame chrome. |
| Planets | Tiny YT / TT / SIM chips under Algo | Competes with prestige. Easy to miss. |
| Tickers | “Thumbnail Friday · 1h 33m · 1.5x” and “Pass 7/7 · maxed” | Rare jobs get permanent pips. |
| Body | ~3 farm rows. Cursed Short selected. Faceless Listicle has a **BEST** badge. | The actual game is squeezed. |
| Bottom | **Three stacked rows:** Buy / Mgrs / Drop / Pass → 1 / 10 / 100 / MAX / RANK (hot pink 1) → giant mint **Buy BEST · 1× Faceless Listicle · 7.1B** | Dock is a second app. |
| BEST ×3 | Farm header “Best: 1× Faceless Listicle · rank in 12m 34s”, row **BEST** badge, dock **Buy BEST** | Same fact three times. UI starts to look like it is lying even when the math is right. |
| Color | Mint selected row, pink qty chip, gold Views, yellow Prestige, mint Buy BEST | Four “active” colors. No hierarchy. |

### Playtest (`docs/PLAYTEST.md`) — same pile, named

1. **Top chrome is a pile.** Wallet (4 cells), prestige + disabled Algo, three planet chips, event pip, pass pip, then the tip. Phone = homework before the farm.
2. **Algo looks broken.** It sits next to Prestige, grey, until Viral ≥ 3×. First-session tap does nothing. Feels unfinished.
3. **Managers tab replaces the farm.** You lose BEST and the rows to hire. Hire-all helps. Still a scene change for a one-button job.
4. **Open** on every row nags you off the farm (correct that inside is optional; still easy to fat-finger).
5. Early BEST is always Cursed Short. Math is right. Feels like a liar because the next unlock is more interesting. Do **not** “fix” this by lying.
6. RANK + Buy BEST need a sentence. RANK BEST = best step toward a rank, not “buy the selected row.”
7–12. Event snack, pass titles, Simulation poster numbers, missed comeback chest, tiny juice, 0.25s strobe at rank 100. Economy / flavor — not this chrome pass.

**Constraint:** `SELECT` BEST by `(Δ potential VPS) / cost`. Ties keep the lower index. Locked / unaffordable rows never win. Tests in `src/game.test.ts` own this. **UI must not invent a different winner.**

---

## 2. Player jobs

Order is the loop. Rare jobs must not occupy prime space.

| Job | Frequency | Needs | Must not |
|---|---|---|---|
| Look at money | Every glance | Big **Views** + **VPS** | A 2×2 stat exam |
| Pick a farm | When a planet unlocks | Segmented YT / TT / SIM next to the list title | Fighting prestige for the fold |
| Buy the right thing | Every session | **Buy BEST** + a **BEST** badge on that row | Three BEST labels + a tab row |
| Prestige when ready | Rare | Compact progress chip → confirm sheet | A permanent card + two fat buttons |
| Hire | Occasional | Sheet over the farm, hire-all | Replacing the farm list |
| Event / pass | Rare | Icon with a hot pip → sheet | Permanent tickers + a camera tab |
| Settings / save | Rare | `…` overflow | A fourth dock row |

Inside (per-card tap / flavor) is **optional**. Outside farm is home.

---

## 3. Information architecture

```
Landing  →  Farm (outside)  →  optional Inside
                 │
                 ├─ sheet: Prestige (Algo lives here until / unless unlocked)
                 ├─ sheet: Managers
                 ├─ sheet: Drop
                 ├─ sheet: Pass
                 └─ sheet: Settings (recap / export / import / mute / reset)
```

- **Landing** is a route, not a wipe. First visit, and whenever the player taps **Slop** in the wordmark.
- **Farm (outside)** is the game. The list is always underneath sheets.
- **Inside** is a drill-in. Back is “← Farm”. Do not make Open the default verb.
- **Sheets** overlay. They do not swap the camera. Closing a sheet returns you to the same scroll position conceptually (same list still mounted).
- **Mgrs / Drop / Pass are not tabs.** They are icons or overflow that open sheets.
- Persist **last route** (`landing` | `farm`) in `slop-capitalist.ui`. Never write that into the game save. Never clear `slop-capitalist.v1` unless the player confirms **New run** / Reset.

---

## 4. Proposed layout (wireframe in prose)

### Landing (first visit + wordmark home)

One screen. No farm chrome. No wallet. No dock.

- Wordmark **Slop Capitalist**
- One line: idle tycoon, farm the algorithm, one cursed short at a time
- Three bullets, in this order:
  1. Tap **Buy BEST** — it already picked the right row
  2. The farm is the game — hire / drop / pass are sheets
  3. Prestige when the chip fills — reset farms, keep the multiplier
- **Continue** (mint, primary). If a save exists, label it `Continue · {views} views` so they know nothing was wiped.
- **New run** (quiet). Confirm before wipe. Do not wipe on Continue or on visiting landing.
- Footer note: local only, no ads, no checkout, lives on this PC

Returning players who last left on **farm** skip this and go straight to the list. Tapping **Slop** in the wordmark brings them back without touching the save.

### Top (thin)

One brand row + one meter row. That is the whole header.

- **Slop** (tappable home) + Capitalist + optional title + `…`
- **Views** large, gold
- **VPS** next to it, muted
- **Viral** as a small chip (number only)
- **Algo hidden** until `canAlgo` (Viral ≥ 3×) **or** they already have an algo layer (`algoCount > 0` or `algoMult > 1`). If they already algo’d, show the number. If they can algo now, the chip opens the Algo confirm. Do not show a disabled Algo button to a first-session player.
- **Prestige** is a compact progress chip (mini bar). Always tappable. Opens the prestige sheet. **Not** a card. **Not** a yellow page-width button on the farm.
- No event ticker. No pass ticker. No planet chips in the header.

### Body

The farm list **is** the game.

- Title: `{Planet} farm`
- Planet switcher as a simple segmented control **on that same title row** (YT / TT / SIM). Locked chips stay disabled with the unlock reason in `title`.
- Rows: icon, name, VPS / cycle / next rank, owned, **BEST** (or LOCK) badge, quiet Open
- **Do not** repeat BEST in the header (“Best: 1× Faceless…”). Badge + dock button is enough.
- Selected row: mint outline (one accent)

### Bottom (one action + one thin tool row)

Default (two rows, not three):

1. Compact tools: **qty** (shows current `1` / `10` / `100` / `MAX` / `RANK`) · **Mgrs** · **Drop** · **Pass**
2. Full-width mint **Buy BEST · {n}× {name} · {cost}**

Quantity chips (`1 10 100 MAX RANK`) are a **hidden secondary row**. They appear only when the qty tool is open. Do not stack tab row + chips + BEST as the always-on dock.

Mgrs / Drop / Pass open sheets over the list. The farm does not unmount.

Inside view: same top, same tools, dock action becomes Buy {selected} + Hire on that card.

### Prestige / Algo sheets

Prestige sheet owns the goal copy that used to live on the farm:

- Title (Unlock {next planet} / Go even more viral)
- Progress bar + `{this run} / {nextPrestigeAt}`
- Confirm **Prestige** (disabled until ready)
- If `canAlgo`, an Algo block on the **same sheet** (or its own sheet from the Algo chip). Never a grey farm button.

### Visual hierarchy

| Role | Color | Use |
|---|---|---|
| Primary action | **Mint** `#2ef2a8` | Buy BEST, selected row, Slop home, qty-open outline |
| Money | **Gold** `#ffd166` | Views only. Prestige-ready chip may use a gold edge, not a second primary button |
| Everything else | Mute | Viral chip, tools, Open, locked rows, body text |
| Pink | Almost gone | Optional SLOW badge only. **Not** an active qty state |

One accent. If two things glow, the player does not know what to tap.

---

## 5. Copy rules

- BEST means the advisor winner. The dock button must name that row and the quoted cost. If nothing is affordable: `Nothing to buy`.
- Do not put “BEST” in the farm header.
- RANK chip changes what BEST means. If you add copy later, one sentence is enough: “RANK BEST is the best step toward a rank.” Do not rename the button.
- Algo does not exist in the UI until it can do something or they already have a layer.
- Landing does not say “wipe” unless they tap New run.

---

## 6. What this pass implements (already in the live UI)

Shipped so the game is playable **now**. Do not revert these to get a prettier mock.

- [x] Landing page, local only. Continue / New run / three bullets.
- [x] Last route remembered in `slop-capitalist.ui`. Game save is not touched by Home / Continue.
- [x] New run confirms before wipe. Continue never wipes.
- [x] Prestige card + fat Prestige/Algo buttons removed from the farm. Chip → sheet.
- [x] Algo hidden until available (or already earned).
- [x] Managers / Drop / Pass are sheets over the farm, not camera tabs.
- [x] Header BEST line removed. Row badge + Buy BEST remain.
- [x] Top bar thinned to wordmark + Views/VPS + chips.
- [x] Planet switcher sits on the farm title row.
- [x] Quantity chips hide behind the qty tool. Buy BEST stays the primary action.
- [x] Mint = primary. Gold = views. Pink qty-active is gone.
- [x] Tests + Playwright landing → farm path. `npm test && npm run build`. Live `:8896` after `.\scripts\start.ps1`.

Playwright on a cleared save (390×844): first paint is landing (not YouTube farm). Continue → 5 farm rows, Buy BEST, no prestige card, no header BEST line, no Algo, qty chips hidden. Mgrs/Drop/Pass keep the list mounted. Slop wordmark returns to landing and keeps the save (`Continue · {views}`).

**Do not change:** `adviseFarm` / `buyBest` scoring, planet unlocks, prestige/algo formulas, save hydrate, port 8896, no-IAP.

---

## 7. What Opus should take further

Work these in order. Each one should leave the farm list bigger or clearer, not add a row.

1. **Open** — quieter or swipe/long-press into inside. Fat-finger Open is still on every row.
2. **RANK sentence** — one muted line when the qty tool is on RANK. Do not add a fourth dock row.
3. **Why-BEST** — optional one-liner *inside* the Buy BEST label or a toast, never a header duplicate. Only if it reduces the “Cursed Short is a liar” feeling without changing the winner.
4. **Event / pass** — second open should be worth it, or accept they are chrome and keep them in sheets. Do not put tickers back on the farm.
5. **Comeback chest** — easier to notice after 60s away. Sheet is fine; do not add a banner under the wallet.
6. **Inside** — keep it optional. If you polish tap juice, do it there, not on the outside list.
7. **The Simulation** — economy / poster costs. Out of scope for chrome. Play a real hour before retuning 1e12.
8. **Motion** — buy should feel like a buy. No cash-shop sound pack. Mute already works.
9. **A11y** — sheet focus trap, backdrop close, wordmark name.

If a change makes the farm list shorter, it is the wrong change.

---

## 8. Files to touch

| File | Why |
|---|---|
| `src/ui.ts` | Landing, thin chrome, sheets, dock |
| `src/main.ts` | Route persist, sheet open, qty toggle, New run |
| `src/styles.css` | Hierarchy, landing, tall sheets |
| `src/ui.test.ts` | Landing / hide Algo / farm stays mounted under sheets |
| `scripts/playtest-browser.mjs` | Landing → Continue → farm |
| `src/game.ts` | **Only** if you must. Do not retouch BEST math. |

---

## 9. Still ugly (after this pass)

Honest leftovers from the live landing → farm play and the screenshot. Fix these next; do not call the UI done.

- **Open** is still a real button on every row. Easy to tap when you meant to select.
- **Qty tool** is discoverable but quiet. A new player may never open 10 / 100 / MAX / RANK.
- **RANK** still has no sentence. The chip changes BEST and does not say so.
- **Event drop** is still a one-tap snack. Sheet is better than a tab; the shop is still titles.
- **Pass** first reward is still a title. Later view packs are still far away.
- **Managers sheet** is a tall list. Fine. Not as nice as hire-all sitting on the farm with no sheet at all.
- **Prestige chip** is small. On a 390px phone it wraps under Views. Ready state is a gold edge — easy to miss next to huge Views.
- **Inside** dock still grows a Hire button, so the bottom gets busier the moment you Open.
- **Tip** can still appear on the farm after landing already explained the loop (dismiss once).
- **Color** is quieter, not silent. Locked chips and SLOW badges still add noise on a late save.
- **The Simulation** and 1e12 copy costs are unchanged. Chrome will not fix a poster planet.
- **Juice** is still a tiny beep.

Play URL after start: http://127.0.0.1:8896  
Tailnet: https://calebscomputer.tailfdadcb.ts.net:8896
