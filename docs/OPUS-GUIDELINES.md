# Opus guidelines — Slop Capitalist

Hand this to Opus (or any stronger design/frontend model). The live game already had a **first cleanup**. This file is the **next** visual / IA pass.

**Repo:** `D:\AI\slop-capitalist` (own git). Not d-ai.  
**Host:** PC only. Port **`8896`**. Never `:3000`. Never the warehouse.  
**Save:** `localStorage` `slop-capitalist.v1` plus per-username keys. Do not wipe saves.  
**UI route:** `slop-capitalist.ui` (`landing` | `farm`). Separate key.

Theme stays **content-farm / algorithm idle**. Do not reskin as lemonade, pizza, or a generic tycoon. Do not copy Hyper Hippo / ComputerLunch art, names, or cash-shop passes.

---

## What you own

A visual and information-architecture overhaul. Make the farm list bigger, quieter, and more obvious. Motion, a11y, hierarchy, phone wrap, inside-card chrome, marketing landing polish.

You do **not** own a new economy. You do **not** own monetization.

---

## Constraints that matter

| Keep | Why |
|---|---|
| PC `:8896`, never `:3000` | Homepage `:3000` is the warehouse. This toy lives on the PC. |
| Selected-row buy + **BEST as a mode chip** | Mint button follows the highlighted farm. BEST is a dock chip that switches the mint button to the advisor winner. Do not revert to Buy BEST as the only primary. |
| BEST math stays honest | `adviseFarm` / `buyBest` score `(Δ potential VPS) / cost`. Ties keep the lower index. Locked / unaffordable rows never win. Tests in `src/game.test.ts` own this. **UI must not invent a different winner.** |
| RANK is a buy preset | RANK buys up to the next milestone (partial OK). A one-liner already explains it. Do not rename the button. |
| Username sign-in | Local names, no password, per-save keys. Do not add accounts, email, or cloud. |
| Prestige → Hype shop | This-run gate, Hype bank, prestige shop. Retune copy/layout, not the formulas, unless Caleb asks. |
| Idle chest ranks | Duration / rate upgrades on the chest + settings. Do not rip them out. |
| Content-farm theme | YouTube → TikTok → The Simulation. Keep the joke dry. |
| F2P-later compass | Ads optional someday; prestige currency is the sink. **Do not implement money.** Do not block a later prestige-currency shop with a layout that cannot grow a shop sheet. |
| Tests | `npm test && npm run build`. Restart `:8896` via `.\scripts\start.ps1`. |

---

## What NOT to do

- **No monetization this pass.** No IAP, ads, subscriptions, paid passes, Stripe, checkout, or a prestige-currency **paid** shop. Do not create or edit `docs/MONETIZATION.md`.
- **Do not rewrite the economy from scratch** unless Caleb asks. Cycle speed, milestones, BEST scoring, prestige re-lock, Hype payout — leave the math.
- Do not fold this repo into d-ai.
- Do not bind `:3000`.
- Do not add a cash-shop sound pack.
- Do not add cloud save / accounts.
- Do not hide RANK. Do not lie about BEST to make early Cursed Short feel less “always BEST.”
- Do not put event/pass tickers back on the farm header.
- Do not turn Managers / Drop / Pass into camera tabs that unmount the list.
- If a change makes the farm list shorter, it is the wrong change.

---

## Live game — first cleanup already shipped

Do not revert these to get a prettier mock.

- **Landing page (local only).** Username, Continue / New run, three bullets. Last route in `slop-capitalist.ui`. Continue never wipes. The farm does not tick on the pitch; away toasts wait until Continue.
- Prestige is a compact chip → confirm sheet (Hype shop lives there). No fat Prestige/Algo pair on the farm. Toasts bank Hype — do not restore Permanent +Nx viral copy.
- Algo hidden until it can fire or they already have a layer.
- Managers / Drop / Pass are **sheets over the farm**, not tabs that replace it.
- Header BEST line removed. Row **BEST** badge + optional BEST *mode* remain.
- Planet switcher on the farm title row (YT / TT / SIM).
- Qty chips (`1 10 100 MAX RANK`) + BEST mode chip on the dock. Mint button follows the **selected row** unless BEST mode is on.
- Mint = primary. Gold = views. Pink is not an active qty state.
- Hire-all on the farm when a manager is waiting, and still in the managers sheet.
- RANK one-liner when RANK is selected.
- Open is a quiet chevron, louder only on the selected row.
- Farm tip is dismissed after Continue from landing.
- The Simulation shows a poster-planet note (1T+ copy costs). Do not retune 1e12 this pass unless Caleb plays an hour and says so.
- SLOW badge is muted, not hot pink.

**Do not change:** `adviseFarm` / `buyBest` scoring, planet unlocks, prestige/algo formulas, save hydrate, port 8896, no-IAP.

---

## Screenshot problems (still the brief)

Ground truth was a phone screenshot of the live farm plus `docs/PLAYTEST.md` / the old `docs/UI-UX.md`. A first cleanup landed. These problems are **your** next pass.

### What failed on the screenshot

The farm was playable underneath a menu pile. Vertical space went to chrome, not the list.

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

### Playtest pile (same story)

1. Top chrome is a pile on a phone.
2. Algo looked broken when grey-and-dead on the farm. (Now hidden — keep it that way until live.)
3. Managers as a scene change. Hire-all helps; a nicer farm-native hire is still fair game.
4. Open used to fat-finger off the farm. Chevron is a first cut — swipe / long-press / selected-only is yours if it is clearer.
5. Early BEST is always Cursed Short. Math is right. Optional why-BEST copy **inside** the mint label or a toast, never a header duplicate.
6. RANK changes what BEST means. One sentence is enough (already on the dock). Keep it.
7–12. Event snack, pass titles, Simulation poster numbers, missed comeback chest, tiny juice, 0.25s strobe at rank 100. Flavor / economy — chrome cannot fake a retune. Chest upgrades exist; noticing the chest after 60s away is still on you.

**Constraint:** UI must not invent a different BEST winner.

---

## Player jobs

Order is the loop. Rare jobs must not occupy prime space.

| Job | Frequency | Needs | Must not |
|---|---|---|---|
| Look at money | Every glance | Big **Views** + **VPS** | A 2×2 stat exam |
| Pick a farm | When a planet unlocks | Segmented YT / TT / SIM next to the list title | Fighting prestige for the fold |
| Buy the right thing | Every session | Selected-row buy **or** BEST mode + a **BEST** badge | Three BEST labels + a tab row |
| Prestige when ready | Rare | Compact progress chip → confirm sheet | A permanent card + two fat buttons |
| Hire | Occasional | Farm hire-all + sheet | Replacing the farm list |
| Event / pass | Rare | Icon with a hot pip → sheet | Permanent tickers + a camera tab |
| Settings / save | Rare | `…` overflow | A fourth dock row |

Inside (per-card tap / flavor) is **optional**. Outside farm is home.

---

## Information architecture (keep this tree)

```
Landing  →  Farm (outside)  →  optional Inside
                 │
                 ├─ sheet: Prestige (Hype shop + Algo when live)
                 ├─ sheet: Managers
                 ├─ sheet: Drop
                 ├─ sheet: Pass
                 └─ sheet: Settings (chest upgrades / recap / export / import / mute / reset)
```

- **Landing** is a route, not a wipe. First visit, and whenever the player taps **Slop** in the wordmark.
- **Farm (outside)** is the game. The list stays mounted under sheets.
- **Inside** is a drill-in. Back is “← Farm”. Do not make Open the default verb.
- **Sheets** overlay. Closing a sheet returns you to the same list.
- Persist **last route** (`landing` | `farm`) in `slop-capitalist.ui`. Never write that into the game save. Never clear `slop-capitalist.v1` unless the player confirms **New run** / Reset.

### Surfaces

| Surface | Kind | Examples |
|---|---|---|
| Outside | Camera body | Compact farm list for the current planet |
| Inside | Camera body | One business card (bar, blurb, tap) |
| Dock | Sticky bottom | Qty + BEST chip + primary buy. Later: room for an event/pass icon row without a third always-on stack |
| Sheet | Overlay, not a route | Prestige, managers, drop, pass, settings, chest |

Do not build a separate Upgrades screen with a different buy language. Do not build a Managers HQ with its own currency. Do not hamburger-hide the farm.

---

## Landing (marketing polish is yours)

One screen. No farm chrome. No wallet. No dock.

Already there: wordmark, one-line pitch, three bullets, username, Continue / New run, local-only footer.

Take it further:

- Continue should still read `Continue · {name} · {views}` when a save exists so they know nothing was wiped.
- New run stays quiet and confirms before wipe.
- Make it feel like a product page, not a debug form. Hierarchy, type, spacing, a real primary. Not a 4.6rem poster title that fights the farm.
- Footer can stay honest: local only, no ads, no checkout, lives on this PC.
- Returning players who last left on **farm** skip landing. Tapping **Slop** brings them back without touching the save.

---

## Visual hierarchy

| Role | Color | Use |
|---|---|---|
| Primary action | **Mint** `#2ef2a8` | Buy (selected or BEST), selected row, Slop home, qty/BEST active outline |
| Money | **Gold** `#ffd166` | Views only. Prestige-ready chip may use a gold edge, not a second page-width button |
| Everything else | Mute | Viral / Hype chips, tools, Open chevron, locked rows, body text |
| Pink | Almost gone | Optional, never an active qty state. SLOW is already muted — keep it boring |

One accent. If two things glow, the player does not know what to tap.

---

## Still ugly / your queue

Work these in order. Each one should leave the farm list bigger or clearer, not add a row.

1. **Farm-row density** — more of the 844px should be rows. Compress brand + wallet + dock. Phone wrap: prestige chip must not hide under huge Views; wallet chips should travel as a group.
2. **Inside-card chrome** — inside still grows a Hire button in the dock. Keep inside optional. If you polish tap juice, do it on the card, not the outside list.
3. **Open** — quieter still, or swipe / long-press into inside. Fat-finger is the failure.
4. **Qty discoverability** — chips are labeled `Qty` now. A new player should still understand 10 / 100 / MAX / RANK without a tutorial card.
5. **Why-BEST** — optional one-liner *inside* the Buy BEST label or a toast. Never a header duplicate. Only if it reduces the “Cursed Short is a liar” feeling **without changing the winner.**
6. **Prestige chip** — ready state is a gold edge. Easy to miss next to huge Views. Make “ready to prestige” glanceable on a 390px phone.
7. **Event / pass** — second open should be worth it, or accept they are chrome and keep them in sheets. No tickers on the farm.
8. **Comeback chest** — easier to notice after 60s away. Sheet is fine; do not add a banner under the wallet. Upgrades already live in settings + the chest sheet.
9. **Managers** — hire-all is on the farm when someone is hireable. The sheet is still a tall list. Make it nicer; do not unmount the farm.
10. **The Simulation** — poster copy is on the farm. Economy / 1e12 costs stay until a real hour of play. Chrome will not fix a poster planet.
11. **Motion** — buy should feel like a buy. Tiny beep exists. Mute already works. No cash-shop sound pack.
12. **A11y** — sheet focus trap, backdrop close, wordmark name, hit targets, reduced-motion. Keyboard through qty chips + selected row.
13. **Landing polish** — type, spacing, Continue as a real primary, username field that does not look bolted on.

If a change makes the farm list shorter, it is the wrong change.

---

## Copy rules

- Default mint button names the **selected** farm and the quoted cost.
- BEST mode mint button names the advisor winner and the quoted cost. If nothing is affordable: `Nothing to buy`.
- Do not put “BEST” in the farm header.
- RANK chip changes what BEST means. One sentence is enough. Do not rename the button.
- Algo does not exist in the UI until it can do something or they already have a layer.
- Landing does not say “wipe” unless they tap New run.
- Simulation poster note can stay dry. Do not apologize with a paragraph.

---

## Files to touch

| File | Why |
|---|---|
| `src/ui.ts` | Landing, thin chrome, sheets, dock, rows |
| `src/styles.css` | Hierarchy, landing, sheets, phone wrap, motion |
| `src/main.ts` | Only if a sheet / route / qty interaction needs it |
| `src/ui.test.ts` | Landing / hide Algo / farm stays mounted / selected vs BEST |
| `scripts/playtest-browser.mjs` | Landing → sign-in → Continue → farm |
| `src/game.ts` | **Only** if you must. Do not retouch BEST math. |

---

## F2P-later (compass only)

This should be a free-to-play money-maker later. Ads optional. Prestige currency (Hype) is the sink.

- Leave room in IA for a shop sheet that spends Hype (already started).
- Do not paint into a corner where the only upgrade language is “watch an ad.”
- **Do not implement ads, IAP, or a paid shop this pass.**
- **Do not write a monetization plan into the repo this pass.**

---

## Play URLs

Local: http://127.0.0.1:8896  
Tailnet: https://calebscomputer.tailfdadcb.ts.net:8896  

Start: `.\scripts\start.ps1`  
Stop: `.\scripts\stop.ps1`
