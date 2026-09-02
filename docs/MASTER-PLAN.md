# Slop Capitalist — master plan

**Status:** shipped. This file is the **decision archive** (numbers, prestige re-lock, outside/inside, BEST math). Do not implement leftover chrome from here.

> **Stale names.** This archive describes the planets as YouTube and TikTok,
> which is what they were called while it was written. They shipped as **The
> Tube** and **The Feed** — no real brand appears in the game. The internal ids
> (`youtube`, `tiktok`) are unchanged because they are save data. See
> [`docs/LEGAL-NOTES.md`](LEGAL-NOTES.md).

**Leftovers**

1. **Opus pass** — [`docs/OPUS.md`](OPUS.md)
2. **Monetization** — do not touch / not this pass. No IAP, ads, Stripe, or a paid prestige shop.

Username sign-in, prestige → Hype, idle-chest ranks, and selected-row buy + BEST as a mode chip already shipped. Do not regress them.

**Date:** 2026-09-02  
**Repo:** `D:\AI\slop-capitalist` (own git). Do not fold into d-ai.  
**Host:** lives on the PC → runs on the PC. Port `8896`. Never `:3000`. Never the warehouse.

Two earlier passes raced and left overlapping scraps (`docs/BACK-BURNER.md`, `docs/PRESTIGE-GATE.md`). Those files are short pointers. What they decided still lives below, as history.

---

## 1. How to use this file

- **Archive.** Phases P0–5 and the leftover extras loop already shipped in the live toy. Do not re-litigate numbers from chat.
- Theme stays content-farm / algorithm idle. Do not reskin.
- **Future work is not in this file.** Opus: [`docs/OPUS.md`](OPUS.md). Monetization: do not touch / not this pass.

---

## 2. Raw idea log

Keep these verbatim so they are not lost. The rest of the file turns them into rules.

1. **Cycle times should shrink on upgrades.** "The times need to halve whenever it gets an upgrade or like 25% or something like that."
2. **Keep the theme.** Content-farm / algorithm idle. He likes it. Do not retheme.
3. **Toasts / pop-ups feel tacky.** More RNG / varied / less samey. Current examples include "Manager hired. You can look away now." and "Bought N. The slop thickens." The manager line was specifically called kinda cringe. Small flavor table, not a novel.
4. **Buy presets:** 1x, 10x, 100x, MAX, and **next rank** (buy up to the next milestone). Current UI only has 1 / 10 / Max.
5. **Tap mechanic to keep people engaged.** Idle already exists (managers + offline). Add an active tap layer that still matters after managers, without turning it into a pure clicker.
6. **Sticky chrome / camera.** Banner with currency / income should follow the player. User lean: **top** = progress goals + currency; **bottom** = upgrade / buy panels. Design for future events/passes. Current UI is a scrolling column with wallet in the header.
7. **Prestige spam (BUG, P0).** He can keep pressing prestige. `canPrestige` is `lifetimeViews >= 1M` and lifetime never drops. Must reset/lock and only unlock after **this-run** progression. Scaling next threshold. Don't pay the same gain for free. UI disabled + progress. Save hydrate so old prestiged saves re-lock.
8. **NEW — menus / two views.** He likes the current **inside** view (per-business detail, tap the bar, hire manager, flavor). He wants a full **outside** perspective so it is obvious **what to upgrade and what not to**. More menus, but a **unified upgrade flow** (not a pile of disconnected screens). Outside = farm overview / empire map. Inside = drill into one business. Switch by tapping a row, back with an overview button. Bottom chrome is the shared upgrade dock. Top chrome is currency + goals on both views. Future menus that fit: planets, prestige, managers, maybe settings. Do not invent a AAA menu tree.

---

## 3. Current state (grounded in code)

Toy v0. Vite + TypeScript. No React. No backend. No ads. Save is `localStorage` key `slop-capitalist.v1`. Currency is **Views**. Planet 1 is YouTube (5 businesses). Prestige at 1M lifetime views unlocks TikTok and keeps a multiplier.

### Loop that already exists

| Piece | Where | What it does today |
|---|---|---|
| Business defs | `src/data.ts` `BUSINESSES` | 5 YouTube + 5 TikTok. Each has fixed `cycleSec`, `income`, `baseCost`, `costMult`, `managerCost`, `managerName`, `blurb`. |
| Milestones | `src/data.ts` `MILESTONES` | `25, 50, 100, 200, …, 1000`. **Income only.** |
| Income x2 | `src/game.ts` `milestoneMult` | `2 ** n` where `n` is how many marks `owned` has crossed. |
| Cycle time | `src/game.ts` `tick`, `viewsPerSec` | Always `defs[i].cycleSec`. **Never shrinks.** |
| Cycle start | `src/game.ts` `startCycle` | Tap starts a bar if owned and not already running. |
| Managers | `src/game.ts` `hireManager` | One-time hire. Forces `running = true`. After that, tap does nothing useful. |
| Offline | `src/game.ts` `applyOffline` | Managers only, 8h cap (`OFFLINE_CAP_MS`). Uses `globalViewsPerSec`. |
| Buy modes | `src/game.ts` `BuyMode` | `1 \| 10 \| "max"`. `resolveBuyCount` / `buy`. 1 and 10 are all-or-nothing; max uses `maxAffordable`. |
| Next rank helper | `src/game.ts` `nextMilestone` | Already returns the next mark. **Not wired to buy.** |
| Prestige gate | `src/game.ts` `canPrestige` | `lifetimeViews >= PRESTIGE_AT` (`1_000_000`). Lifetime never drops. **This is the spam bug.** |
| Prestige payout | `src/game.ts` `prestigeGain` | `max(0.25, log10(lifetime) - 5)`. At 1M that is `+1.00x`. Same lifetime → same gain every click. |
| Prestige reset | `src/game.ts` `prestige` | Add multiplier, unlock TikTok, zero spendable `views`, reset both planets to one starter each. Does **not** zero lifetime. |
| Save | `GameState.v = 1`, `SAVE_KEY = "slop-capitalist.v1"` | `loadGame` hydrates missing fields from `newGame`. Buy mode is **session-only** (`let buyMode` in `src/main.ts`). |
| Layout | `src/ui.ts` `renderApp` | One scrolling column: title, tagline, wallet, planet nav, prestige card, buy chips, `#biz-list` (full cards), footer. |
| Wallet | `src/ui.ts` → `<header class="top">` | Views, VPS, viral multiplier. Scrolls away. Not sticky. |
| Buy chips | `src/ui.ts` toolbar | `1` / `10` / `Max` only. Parser treats anything that is not `"max"` or `"10"` as `1`. |
| Business card | `src/ui.ts` `renderBusinesses` | Icon, name, owned, blurb, tap bar, next x2, cycle seconds, Buy, Hire manager. This is the **inside** view he likes — it is also the only view. |
| Toasts | `src/ui.ts` `showToast`, fired from `src/main.ts` | Hardcoded lines. Each call appends a new `div.toast` at `bottom: 24px` (they overlap, they do not queue). |
| Chrome CSS | `src/styles.css` `.shell` | Narrow scrolling column, `max-width: 520px`. Nothing is sticky except the toast. |
| Tests | `src/game.test.ts` | First prestige unlock only. Never asserts `canPrestige` is false afterward. |

YouTube cycle bases (for the speed math later):

| Business | `cycleSec` |
|---|---|
| Cursed Short | **0.6** (already fast) |
| Faceless Listicle | 3 |
| AI Voiceover Essay | 6 |
| Reaction Farm | 12 |
| Agent Swarm | 24 |

TikTok mirrors 1 / 3 / 6 / 12 / 24.

### What prestige resets vs keeps (today)

| Field | After prestige |
|---|---|
| `views` | **Reset** to `0` |
| `planet` | Set to `"tiktok"` |
| `businesses.youtube` | **Reset** to empty + starter cursed short (`owned: 1`) |
| `businesses.tiktok` | **Reset** to empty + starter repost page (`owned: 1`) |
| `tiktokUnlocked` | Set `true` (stays true) |
| `prestigeMult` | **Kept** and **increased** by `prestigeGain(lifetimeViews)` |
| `lifetimeViews` | **Kept** (never drops) — this is the bug |
| `lastTs` | Untouched |
| `v` | Untouched (`1`) |

TikTok stays unlocked. The viral multiplier stacks. The board wipes. The gate does not.

### What the prestige UI does now

`src/ui.ts` prestige block:

- Title: `"Unlock TikTok"` until `tiktokUnlocked`, then `"Go even more viral"`.
- If `canPrestige`: copy shows `+{prestigeGain(lifetimeViews)}x` and the button is **enabled**.
- Else: copy shows `lifetimeViews / PRESTIGE_AT` and the button is **disabled**.
- After the first prestige, `rebuild()` re-renders with `canPrestige` still true, so the button stays live.

`patchMeters` updates wallet + business bars only. It does **not** refresh prestige disabled-state or progress. Prestige chrome only updates on a full `renderApp` (`rebuild`: buy, manager, planet, prestige, buy-mode, reset).

Related: the **first** unlock can also lag until a rebuild (a buy, etc.), because ticks only call `patchMeters`. Fix both when implementing: live progress **and** live disable.

`src/main.ts` `onPrestige` calls `prestige()`, rebuilds if `gain > 0`, toasts the multiplier. No second check.

### Hardcoded toasts today

| Event | Line |
|---|---|
| Buy ≥ 10 | `Bought ${n}. The slop thickens.` |
| Manager | `Manager hired. You can look away now.` |
| Prestige | `TikTok unlocked. Permanent +${gain.toFixed(2)}x` |
| Reset | `Fresh account. Post your first cursed short.` |
| Offline | `While you were gone (${time}): +${views} views` (`showAway`) |

### Unlock / dim rules today

A business is `is-dim` when `owned <= 0` and the previous business is also unowned. You can still see it. Buy is disabled until the previous one is owned (implicit: you cannot usefully start it). Managers require `owned > 0`.

There is **no outside view**. There is **no recommendation**. Comparing five full cards is the only way to decide what to buy. After managers, tapping a bar is a no-op.

---

## 4. Goals / non-goals

### Goals (when someone later implements)

- Fix prestige spam so one click pays once, then the button locks until this run earns a **new** bar.
- Make it obvious **what to upgrade and what not to** without reading five blurbs.
- Keep the current per-business card as a real **inside** place (tap, manager, flavor, milestones).
- Share one upgrade brain across views (buy presets + one dock).
- Sticky top/bottom chrome that can later hold events/passes without a rewrite.
- Cycle times shrink on rank-up, with a floor, without going instant.
- Tapping still matters after managers.
- Flavor is dryer and a little random. Not a dialogue tree.

### Non-goals

- **No IAP. No ads this pass.** Monetization: do not touch. Do not write a plan into the repo.
- **No theme change.** Do not reskin as lemonade, pizza, or a generic tycoon. Do not copy Hyper Hippo / ComputerLunch art, names, or cash-shop passes (`AGENTS.md`).
- **No folding into d-ai.** Commit here only.
- **No move off the PC.** Port `8896`. If it lives on the PC, it runs on the PC.
- **No Loopwright posts** from this folder.
- **No AAA menu tree.** No inventory, friends, collections, lore codex, achievement gallery, or cash-shop ladder.
- **Do not refund** an already-spam-inflated `prestigeMult` on old saves. Just stop further free clicks.

---

## 5. Player loop (outside vs inside)

The game is still AdCap: buy copies, hit ranks, hire a manager, walk away, prestige. The new split is **where you look**, not a second economy.

### Two places, one farm

| View | Job | What you see |
|---|---|---|
| **Outside** | Decide. Empire / farm map. | Every business on this planet as a compact row. Best next buy. Bottleneck. Time to next rank (or ROI). Planet + prestige status in the chrome. |
| **Inside** | Act on one business. | The current card he likes: tap the bar, hire manager, blurb, owned, milestone, cycle. |

They are not two games. Same `GameState`. Same `BuyMode`. Same wallet. Same prestige bar.

### Default home

**Recommend: outside is the home screen** once the player owns 2+ businesses on the current planet.

- First session, only Cursed Short owned → land **inside** that card (the current toy). No empty map lesson.
- After a second business is owned, or after a prestige, land **outside**.
- Session remembers last view (`outside` | `inside` + `focusIndex`). Do **not** persist view in the save unless resume-on-inside becomes a real request.

This matches "I want to see what to upgrade" without throwing away the first-clip tutorial.

### How you switch

1. **Outside → inside:** tap the row's name / chevron / icon. Not the row's buy affordance (that buys).
2. **Inside → outside:** a **Farm** / overview control in the camera header (back chevron + planet name). Also reachable by tapping the current planet chip in the top bar.
3. **Planet switch:** top chips. Always returns you to **outside** for that planet (do not dump the player into a random inside card on TikTok).
4. **Prestige:** top goal row. If not ready, it is just progress. If ready, a small confirm sheet — not a new screen with its own shop.

Do not use a hamburger that hides the farm. Do not make inside a modal that blocks the chrome. Top and bottom chrome **stay** on both views.

### What you do in a typical minute

1. Glance top: views, VPS, prestige bar.
2. Outside: one row says **BEST**, one may say **LOCK** / **SLOW**.
3. Either buy from the dock (targets the selected row) or tap into a row to babysit / hire / tap the bar.
4. Inside: tap to upload or refresh, hire if it is time, buy more of *this* one.
5. Farm back out. Repeat until the prestige bar fills.

Idle still works if they never open inside again after managers. Tap is optional spice, not a job.

---

## 6. Information architecture + wireframe-in-prose

### Surfaces (this is the whole menu tree)

Keep it to four kinds of surface. If a later idea does not fit one of these, it does not ship yet.

| Surface | Kind | Examples |
|---|---|---|
| **Outside** | Camera body | Compact farm list for the current planet |
| **Inside** | Camera body | One business card |
| **Dock** | Sticky bottom | Buy presets + primary upgrade action. Later tabs: Buy, Managers, Event, Pass |
| **Sheet** | Overlay, not a route | Prestige confirm, settings / reset, later event shop |

That is the unified upgrade flow: **you always buy through the same dock brain**. Views only change *what is selected* and *how much detail you see*.

### Do not build

- A separate Upgrades screen with a different buy language.
- A Managers HQ that is a second shop with its own currency.
- Nested planet → region → lot → building.
- Tab bars that replace the farm (the farm *is* the game).
- Settings as a first-class home tab. Settings is a `…` / `?` overflow that opens a sheet.

Future menus that **do** fit:

| Later thing | Where it lives |
|---|---|
| More planets | Top chips + outside list for that planet |
| Prestige | Top goal row + confirm sheet |
| Managers | Dock tab: list of unhired managers, one-tap hire, still Views |
| Settings | Overflow sheet (reset save, later sound) |
| Timed event | Top: countdown / goal. Dock tab: event shop |
| Season pass | Top: XP pip. Dock tab: claim |

### Chrome frame (both views)

```
┌ sticky TOP ──────────────────────────────────────────┐
│ Views          Per second         Viral x            │
│ Goal: 0 / 1.0M prestige   ·  YT · TT(lock) ·  …     │
├ camera (scroll) ─────────────────────────────────────┤
│                                                      │
│  OUTSIDE: compact rows + BEST / bottleneck           │
│     or                                               │
│  INSIDE:  [ ← Farm ]  Cursed Short                   │
│           current card (bar, blurb, manager)         │
│                                                      │
├ sticky BOTTOM (upgrade dock) ────────────────────────┤
│ 1 · 10 · 100 · MAX · RANK                            │
│ [ Buy selected · 12K ]   or   [ Hire gremlin · 1K ]  │
└──────────────────────────────────────────────────────┘
```

- **Top = where am I.** Currency, income, prestige / event / pass progress, which planet. Glanceables.
- **Bottom = what do I do.** Buy mode, primary buy, later hire / event / pass. Thumbs reach actions on a phone.
- **Middle = the camera.** Outside list or inside card. Later an event stage. Cards stay in the world.

Wallet does **not** go to the bottom. Currency is status, not an action.

Title + tagline (the 4.6rem `h1`) do **not** stick. First session or a `?` overflow. The sticky top is wallet + goal, not a poster.

Reset save stays in the quiet overflow / footer, not the sticky bar.

Toasts sit **just above the dock**, one slot, never over the buy chips.

CSS sketch for the implementer (do not apply now): a full-height column, `100dvh`; top and bottom `flex: 0 0 auto`; middle `flex: 1; overflow-y: auto`. Keep the 520px max width. `z-index` the chromes over the list. Safe-area padding for phones.

### Outside — farm overview (empire map)

One planet at a time. After TikTok unlocks, the other planet is a chip, not a second scrolling novel. A stacked "both planets" map is a later nicety, not v1.

Each row is **one line of decision**, not a card:

```
[icon] Cursed Short    x24     0.60s
       40/s · next rank 25 (1)      BEST
```

Required columns / pips (keep it to what fits a phone):

| Pip | Meaning |
|---|---|
| Name + icon | Identity |
| `xN` | Owned |
| Cycle | Effective cycle (base today; effective after speed ships) |
| Income / s | This row's contribution, or `—` if idle and unmanaged |
| Next rank | `25 (1)` = mark 25, 1 copy away. Or `maxed` |
| Badge | At most one of **BEST** / **LOCK** / **SLOW** |

**BEST** — the recommended spend. See §7 for the metric.

**LOCK** — the next unowned business whose previous neighbor is owned, or the first still-dim row. "This is the unlock you are saving for," not a buy-now if they cannot afford it.

**SLOW** — bottleneck among *owned* businesses: longest time-to-next-rank, or the unmanaged bar they still have to tap. One bottleneck, not three.

Do **not** badge every row. Most rows are quiet. The point is contrast: upgrade *this*, maybe unlock *that*, ignore the rest.

A **selected** row (tap the row background) gets a mint outline. Default selection on landing:

1. The BEST row if one exists (affordable recommended buy).
2. Else the LOCK row.
3. Else the first owned business.

Tapping a selected row's chevron / name opens inside. Tapping another row changes selection. Double-tap-to-enter is fine as extra; do not require it.

Optional one-line advisor under the list, not a paragraph:

`Best: 1× Cursed Short · rank in 8s`  
or `Save for Faceless Listicle · 60`

If they cannot afford anything, say that. Do not invent a fake BEST.

### Inside — keep the current card

The existing `<article class="biz">` is the inside body:

- Tap header + bar to run (and later to refresh).
- Blurb (flavor stays here, not on the outside row).
- Next x2 + cycle time.
- Per-card Buy and Manager can **move into the dock** once the dock exists, or stay on the card for v1 of chrome and move when outside lands.

Recommend: **once the dock exists, inside buy + hire live in the dock.** The card is the toy (bar, owned, blurb, milestone). Duplicate buy buttons on the card *and* the dock will fight. Outside never shows a manager novel — hire is an inside action or a later Managers dock tab.

Hint line today (`On autopilot` / `Tap to upload`) stays on the card.

### Bottom dock — the shared buy brain

Always visible on outside and inside.

**Row 1 — presets (session-only, same as today):**

`1` `10` `100` `MAX` `RANK`

Chip labels stay that short. Wrap on narrow widths. Do not hide RANK behind overflow.

**Row 2 — primary action (changes by view, same math):**

| View | Primary | Secondary (if room) |
|---|---|---|
| Outside, something selected and affordable | `Buy {n} {name} · {cost}` | — |
| Outside, selected unaffordable | Disabled, still show cost | — |
| Outside, LOCK selected and previous unowned | Disabled `Unlock previous first` | — |
| Inside, not managed | `Buy {n} · {cost}` | `Hire {manager} · {cost}` |
| Inside, managed | `Buy {n} · {cost}` | `Managed` (dead) |

`n` and `cost` always come from `resolveBuyCount` + `buyCost` using the **same** `BuyMode`. There is one buy function. The dock is a target picker (`selectedIndex` or `focusIndex`), not a second shop.

A later Managers tab is the same hire action in a list. Do not invent `managerBucks`.

### Top chrome — same on both views

| Slot | Content |
|---|---|
| Wallet | Views, VPS, viral x |
| Goal | Prestige `{viewsThisRun} / {nextPrestigeAt}` (after P0). Before P0 it is the broken lifetime / 1M bar — do not restyle prestige until P0 lands. |
| Planets | Compact chips. Locked TikTok shows the unlock line. |
| Overflow | `…` → settings sheet (reset). Later: sound, maybe credits. |

After P0, tapping a **ready** prestige goal opens a confirm sheet: "Reset both planets. Keep +X.xx." Cancel / Prestige. After confirm, land **outside** on TikTok.

### Parser trap (must not survive the dock)

`src/ui.ts` today:

```
handlers.onBuyMode(raw === "max" ? "max" : raw === "10" ? 10 : 1)
```

Anything new (`100`, `rank`) silently becomes `1`. Replace that ternary with a real parse when the five chips land.

---

## 7. Economy: cycle speed, milestones, buy modes, tap layer

### 7.1 Milestones (unchanged)

`MILESTONES = 25, 50, 100, 200, …, 1000`.

`milestoneMult(owned) = 2 ** ranks` where `ranks` is how many marks `owned` has crossed.

`cycleIncome = def.income * owned * milestoneMult(owned) * prestigeMult`.

Leave this math alone. Speed is a **second** bonus at the same marks, not a replacement.

### 7.2 Cycle speed — recommended rule

**25% faster per milestone. Floor 0.25s.**

```
MIN_CYCLE_SEC = 0.25
SPEED_PER_RANK = 0.75          // 25% faster
ranks = count of MILESTONES where owned >= mark
effectiveCycleSec(base, owned) = max(MIN_CYCLE_SEC, base * SPEED_PER_RANK ** ranks)
```

- **Trigger:** crossing a mark in `MILESTONES`. Same moments that already double income.
- **Not on every copy bought.** 1→2 must not shrink the bar.
- **Not on manager hire.** Hiring already converts tap-to-run into autopilot.
- **Derived from `owned`.** No extra save field. Prestige resets owned → tempo resets for free.

A later agent introduces `effectiveCycleSec` next to `milestoneMult` and uses it in **all three** of: `tick`, `viewsPerSec`, and the card / row meta line. Today those divide by `defs[i].cycleSec` and the card hardcodes `${def.cycleSec}s cycle`. If they drift, displayed VPS, live payout, and offline payout disagree.

#### Why 25%, not halve

Income **already** doubles at the same marks. Stacking a 2× time cut on a 2× income bump is a **4× VPS cliff** every rank.

Cursed Short starts at **0.6s**. One halving puts it at 0.3s; two puts it at 0.15s (under the floor). The first business would feel done by the second rank.

25% + 2× income = **~2.67× VPS** at each mark. Still a punchy rank-up. The long businesses stay readable.

#### Worked numbers

Cursed Short `0.6s`:

| Owned | Effective cycle |
|---|---|
| 1–24 | 0.60s (unchanged — this is the early game) |
| 25 | 0.45s |
| 50 | 0.34s |
| 100 | 0.25s (hits the floor) |
| 200+ | 0.25s |

Agent Swarm `24s`:

| Owned | Effective cycle |
|---|---|
| 1–24 | 24s |
| 25 | 18s |
| 100 | 10.1s |
| 500 | 3.2s |
| 1000 | **0.76s** (never hits the floor) |

Starter clip becomes "live" around 100 owned. End-planet farm still has a visible bar at max rank.

#### Floor / "live" behavior

When `effectiveCycleSec === MIN_CYCLE_SEC`, keep paying through `tick` as today. Optional later polish: show the bar as **Live** instead of a filling pulse so 0.25s does not strobe. Do **not** special-case payout math.

`tick` already folds leftover progress (`cycles = floor(progress)`). A 0.25s cycle at 4 Hz is fine. Do not drop below 0.25s.

#### Interaction with x2 income

`cycleIncome` stays as it is.  
`viewsPerSec` becomes `cycleIncome / effectiveCycleSec(...)`.

UI: show the **effective** time. After speed ships, a rank line can read `Next rank at 50 · 0.45s` — still one line.

#### Alternate (only if Caleb wants punchier)

**Halve, but only at 25 / 100 / 400 / 1000** (four cuts), same 0.25s floor. Income x2 stays on every mark.

This separates "got faster" from "got richer" so they do not stack into a 4× every 25 copies.

Agent Swarm would go 24 → 12 → 6 → 3 → 1.5. Cursed Short would hit the floor at 100.

Do **not** halve on every milestone. `24 * 0.5^12 = 0.006s`. Everything becomes instant by mid-game.

**Default stays 25% per mark.**

#### Early-game protection

- No speed until owned ≥ 25.
- Cursed Short stays 0.6s for the whole opening (first manager is 1,000 views; 25 shorts is a real first goal).
- Floor 0.25s.
- Prestige resets owned → first TikTok clip is 1.0s again.
- Tests: `effectiveCycleSec` at owned 1, 24, 25, 50, 100, 1000 for both the 0.6s and 24s defs; `tick` / `viewsPerSec` / offline all use the helper.

### 7.3 Buy modes

```
BuyMode = 1 | 10 | 100 | "max" | "rank"
```

| Mode | `resolveBuyCount` | Afford rule |
|---|---|---|
| `1` / `10` / `100` | that number | All-or-nothing. Button disables if `views < buyCost(..., count)`. Same as today's 1 and 10. |
| `max` | `maxAffordable(...)` | Spend down. Unchanged. |
| `rank` | `min(maxAffordable, remaining)` | **Never buy past the next mark.** |

`remaining = nextMilestone(owned) - owned`. If `nextMilestone` is `null` (maxed at 1000), RANK behaves like MAX so the chip is never dead.

This is the whole point of RANK vs MAX: if you can afford 47 and the next x2 is 3 copies away, **RANK buys 3**. MAX would buy 47 and dump cash into post-rank copies that are not the exciting breakpoint.

**Partial toward the rank is allowed.** If you can only afford 3 of 7, buy 3. Late marks (200→300) would feel broken if the button waited for the full gap.

Labels:

- Can afford the full gap: `Rank 7 · 12K`
- Can afford some: `Rank 3/7 · 4K`
- Can afford none: disabled, still show `Rank 7 · 12K`

Buy mode stays **session-only**. No save bump.

### 7.4 What to upgrade — BEST / LOCK / SLOW

Outside has to answer this without a spreadsheet.

**BEST (recommended spend)**  
Among businesses the player **can currently buy at least one of** under the active `BuyMode`:

```
count  = resolveBuyCount(state, index, buyMode)
cost   = buyCost(..., count)
ΔVPS   = vpsAfter(owned + count) - vpsBefore(owned)
score  = ΔVPS / cost
BEST   = argmax(score)
```

`vpsAfter` must use the same helpers as live VPS (`cycleIncome` / `effectiveCycleSec` once speed exists, and manager/running state as it is). If two scores tie, pick the **lower index** (cheaper / earlier farm). If nothing is affordable, there is no BEST.

Why ROI (`ΔVPS / cost`) for the badge: it answers "what should I buy **right now** with this cash and this preset." RANK mode then naturally prefers the cheap last copies into a multiplier.

**Visible number on the row is time-to-next-rank**, not the raw ROI score:

```
remaining   = nextMilestone(owned) - owned   // or null if maxed
costToRank  = buyCost(..., remaining)
timeToRank  = costToRank / max(globalViewsPerSec, ε)
```

Show `next rank 25 (1)` plus a short clock when useful (`~8s`). Players understand "almost a rank." They do not understand `0.00041 VPS/$`.

**LOCK**  
The first business with `owned === 0` whose previous is owned (or index 0 if somehow unowned). If they cannot afford it, the advisor says save. If they can, BEST may *be* the unlock — then show BEST, not both.

**SLOW (bottleneck)**  
Among owned businesses, the one with the largest `timeToRank`. If all maxed, the unmanaged owned bar (they still have to tap). If everything is managed and maxed, no SLOW — prestige is the goal.

Do not score unowned-and-locked businesses as BEST. Do not recommend dumping MAX into Agent Swarm when one Cursed Short copy is the rank.

### 7.5 Tap engagement

Idle stays the core. Tap has to matter **after** a manager without turning the game into Cookie Clicker.

#### System A — Refresh nudge (ship this)

Theme: you are pushing a post back toward the For You page. The farm still runs.

- **Unmanaged:** unchanged. Tap starts the cycle (`startCycle`). Bar is the existing tap target (`.run` + `.bar`).
- **Managed:** tap the bar to **add +0.15 progress** (15% of a cycle).
- Cap **4 nudges per cycle** (max +0.60 from tapping).
- Per-business cooldown **200ms** so mash does not skip a 24s cycle in one frame.
- Offline **ignores** nudges. You were not there.
- Session-only. Do not persist boost state. Prestige / reload just lose in-flight nudges (progress itself already saves).

A 24s Agent Swarm can be hurried to ~10s if you sit there. A 0.6s Cursed Short barely notices. Once it is "live" at 0.25s, nudges are almost cosmetic — that is fine; the long bars are the toy.

UI: keep the existing bar as the hit target. Tiny feedback (`+refresh`, a flash). No second big button.

Hint: `On autopilot · tap to refresh` when managed.

Outside rows are **not** tap-to-run targets in v1 (too easy to mis-tap while selecting). Run / refresh lives **inside**. If that feels thin later, a small play pip on unmanaged outside rows can be added without a new system.

#### System B — Session notice (only if A feels thin)

A small combo pip in the **top** chrome.

- Any bar tap increments a combo. Combo dies after ~2s without a tap.
- At 8 taps: **Algo notice** — +25% global income for 20s.
- Then a 60s cooldown. Session snack, not a job.
- Offline ignores it. Do not save it.

Do **not** ship A and B in the same phase. A first. B only if tapping a managed 24s bar still feels empty.

#### Rejected

- Big-cookie income (taps as the real wallet).
- Energy / stamina that managers wait on. That is not idle.
- Golden-cookie chase popups. We are already killing tacky toasts.
- "Managers pause if you do not tap." That punishes the loop we already shipped.

---

## 8. Prestige re-lock (P0)

**Priority:** first real bug after the loop works. Not flavor. Do it before chrome, outside, speed, tap, or more planets.

### Why spam works now

The gate is lifetime, and prestige never spends that lifetime.

```
canPrestige(state) = state.lifetimeViews >= PRESTIGE_AT   // 1_000_000
```

`credit()` only **adds** to `lifetimeViews`. `prestige()` never zeros it, never records a last-prestige snapshot, and never raises a next threshold.

After the first qualifying prestige:

1. `lifetimeViews` is still `>= 1_000_000`.
2. `canPrestige` stays `true` forever.
3. The UI button stays enabled.
4. Each click runs `prestige()` again.

At exactly 1M: `log10(1e6) - 5 = 1`. Every free click adds **+1.00x** to `prestigeMult` and resets the board again. No extra views required.

There is no `viewsThisRun`, no `nextPrestigeAt`, no last-prestige lifetime, and no cooldown.

### Recommended gate

Button only after **this run** progression. Disable **immediately** after prestige.

1. **`viewsThisRun`** — increment in `credit()` next to `lifetimeViews`. Reset to `0` inside `prestige()`.
2. **`nextPrestigeAt`** — start at `PRESTIGE_AT`. After each success, scale it up (`*= 10` is the suggested tune).

```
canPrestige = viewsThisRun >= nextPrestigeAt
```

Do **not** gate on `lifetimeViews >= PRESTIGE_AT`. That is the current bug.

Immediately after prestige: `viewsThisRun = 0`, `nextPrestigeAt` already raised → button disabled.

`views` (spendable cash) is the wrong meter. Buys spend `views` but should not delay prestige.

First bar stays 1M so the existing first-TikTok beat is unchanged. Suggested alternatives if `*= 10` feels mean in play: `nextPrestigeAt = 10 ** (5 + prestigeCount)` (same neighborhood as the log gain formula). Tune in play, not by inventing a new gate.

### Repeat prestige must not pay the same gain for free

Two layers. The gate stops the click. The gain formula must not mint the same payout from the same lifetime snapshot if the gate is ever bypassed.

**Do not** keep `prestigeGain(state.lifetimeViews)` as the only input. After a re-lock, a second prestige at the same lifetime would still pay `log10(lifetime) - 5` again.

**Recommend:** pay for **this run only**:

```
gain = prestigeGain(viewsThisRun)   // same log formula, this-run total
```

- First run, 1M this-run: `+1.00x` (same as today).
- Spam with `viewsThisRun === 0`: gain `0`, `prestige()` no-ops.
- Second run, earn the new bar: paid for **that** run, not a replay of the first 1M.

Optional belt-and-suspenders: store `lifetimeAtLastPrestige`. Even if someone calls `prestige()` with a stale gate, gain is `f(lifetime) - f(last)` (or `0` if lifetime did not grow). Not required if `prestige()` zeros `viewsThisRun` and gain reads this-run only.

Do **not** refund or nerf an already-spam-inflated `prestigeMult` on old saves. Just stop further free clicks.

### UI

- Button **disabled** when `!canPrestige`. Enabled only when this-run views hit `nextPrestigeAt`.
- Progress copy: `{viewsThisRun} / {nextPrestigeAt}` (not lifetime / 1M after the first prestige).
- When ready: show the **this-run** gain (`prestigeGain(viewsThisRun)`), not a lifetime replay.
- After prestige: immediately disabled, progress at `0 / next`.
- Update prestige chrome from `patchMeters` (or a small `patchPrestige`) every tick so progress and disable stay live without a buy/rebuild.
- Keep `"Unlock TikTok"` / `"Go even more viral"`.
- After chrome lands, this is the top **goal** row. Confirm stays a small sheet.

### Save hydrate (old prestiged saves re-lock)

Keep `SAVE_KEY` (`slop-capitalist.v1`). Bump `GameState.v` to `2`. Hydrate in `loadGame`:

| Incoming save | `viewsThisRun` | `nextPrestigeAt` |
|---|---|---|
| Missing fields, never prestiged (`!tiktokUnlocked` and `prestigeMult === 1`) | `lifetimeViews` (keep first-bar progress) | `PRESTIGE_AT` |
| Missing fields, already prestiged | `0` (re-lock **now**) | `PRESTIGE_AT` or one scale step if you want a slightly longer second grind |
| `v >= 2` | use stored values | use stored values |

Leave an inflated `prestigeMult` as-is. Do not rename the storage key (that orphans the live local save).

### Tests the implementer must add

- After prestige, `canPrestige === false` and a second `prestige()` returns `0` / does not bump `prestigeMult`.
- Earning this-run to the next bar unlocks once.
- Old prestiged saves (`tiktokUnlocked` or `prestigeMult > 1`, no new fields) hydrate locked with `viewsThisRun = 0`.
- Never-prestiged v1 saves keep progress (`viewsThisRun = lifetimeViews`).
- Existing first-unlock test still passes (TikTok starter, views 0, multiplier up).

---

## 9. Flavor / RNG

### What is wrong now

The manager line is the one called out as cringe. The buy line is the same every bulk purchase. `showToast` **stacks DOM nodes** at the same screen position.

### Structure (small table, not a novel)

Put ~24 lines in `src/data.ts` (or `src/flavor.ts` if it gets noisy). Not 200.

```
type FlavorKind = "buy-bulk" | "manager" | "milestone" | "prestige" | "offline";
type FlavorRarity = "common" | "uncommon" | "rare";

type FlavorLine = {
  kind: FlavorKind;
  rarity: FlavorRarity;
  text: string;   // tokens: {n} {name} {views} {time} {mark} {gain}
};
```

Weights: **common 70 / uncommon 25 / rare 5**.

Picker rules:

- Never return the same line twice in a row for that `kind`.
- Rare: at most once per kind per session (or per prestige). After that, fall back to common/uncommon.
- **One toast slot.** Replacing the current node is enough; do not stack.
- Sit the slot **just above the bottom dock**.
- No toast on 1x buys. Bulk only (`n >= 10`), plus manager, milestone, prestige, offline, reset.

Factual lines that carry numbers (offline payout, prestige +x, reset confirm) stay mostly factual. Flavor is a suffix or a rare alternate, not a replacement for the number.

### When they fire

| Event | Fire? |
|---|---|
| Buy 1–9 | No |
| Buy 10+ or a rank buy that lands ≥ 10 | Yes, `buy-bulk` |
| Buy that **crosses** a milestone | Yes, `milestone` **instead of** buy-bulk (do not double-toast) |
| First manager on a business | Yes, `manager` |
| Prestige | Yes, one `prestige` (keep the +x number) |
| Offline ≥ 5s with earnings | Yes, keep `showAway` numbers; optional rare suffix |
| Reset | Keep the existing factual line |
| Tick / VPS / tap nudge / view switch | No (too noisy) |

### Example lines (not cringe)

Tone: dry, observational, a little mean about the algorithm. No "you can look away now." No repeating "the slop thickens."

**Manager — common**

- `Autopilot on {name}.`
- `{name} is posting without you.`
- `Queued. This bar runs itself.`

**Manager — uncommon**

- `One less upload to babysit.`
- `They will keep posting. That is the job.`

**Manager — rare**

- `The intern found the scheduler.`

**Buy-bulk — common**

- `+{n} {name}.`
- `Bought {n}.`
- `{n} more in the pipeline.`

**Buy-bulk — uncommon**

- `{n}. The catalog got longer.`
- `Farm grew by {n}.`

**Buy-bulk — rare**

- `Quantity is the strategy.`

**Milestone — common**

- `{name} ×2 at {mark}.`
- `Rank {mark}. {name} pays double.`

**Milestone — uncommon**

- `{name} just sped up.` (only after speed-on-rank ships; until then skip this line)

**Prestige**

- Keep `TikTok unlocked. Permanent +{gain}x` as the common factual line.
- Uncommon: `Both farms reset. The multiplier stayed.`

**Offline**

- Keep `While you were gone ({time}): +{views} views`.
- Rare suffix only: `The bots did not clock out.`

If a later agent wants more lines, add them in twos (one common, one uncommon). Do not grow this into a dialogue tree. Blurbs on the inside card stay as they are.

---

## 10. Save / versioning

Today: `GameState.v: 1` and `SAVE_KEY = "slop-capitalist.v1"`. `loadGame` already fills gaps from `newGame`.

| Change | Persist? | Bump? |
|---|---|---|
| Buy modes (session) | No | No |
| Selected row / outside vs inside | Session only | No |
| Flavor table / last toast | No (in-memory last-line is enough) | No |
| Speed derived from owned | Derived | No |
| Chrome CSS | No | No |
| Nudge (session) | No | No |
| Prestige re-lock (`viewsThisRun`, `nextPrestigeAt`) | **Yes** | **`v: 2`**, same `SAVE_KEY`. Hydrate as in §8. |
| Other new persisted fields later | Yes | Bump `v` and hydrate defaults. **Do not rename `SAVE_KEY`** unless the JSON is incompatible. |

If a migrator is ever needed, switch on `parsed.v` inside `loadGame`. Do not invent a second storage key for a soft change.

Hydrate rule for already-prestiged v1 saves is the important one: **re-lock immediately** (`viewsThisRun = 0`). Do not leave the spam button on because the save is old.

---

## 11. Phased build order

A later agent implements **one phase per pass** unless Caleb says to batch. Each phase should ship with tests where the math changed, and should be playable on its own.

This order **supersedes** the older BACK-BURNER order (buy bar → flavor → speed → chrome → tap). Chrome and the outside view are now the IA foundation. Buy presets live in the dock, so they travel with chrome / outside — not as a lonely chip row in the scrolling column.

### Phase 0 — this file

Plan only. Done when this document is the source of truth and the old scraps point here.

### Phase P0 — Prestige re-lock (do first)

Bug, not flavor. Before chrome, outside, speed, tap, or more planets.

- `viewsThisRun` + `nextPrestigeAt`; `canPrestige` this-run only.
- `prestige()` pays this-run gain, zeros the run meter, raises the next bar, then does the existing board reset.
- Button disabled immediately; live progress in `patchMeters`.
- Save `v: 2`, same `SAVE_KEY`. Tests in §8.
- Touched: `src/game.ts` (`GameState`, `credit`, `canPrestige`, `prestige`, `loadGame`), `src/ui.ts` prestige chrome + `patchMeters`, `src/game.test.ts`.

### Phase 1 — Sticky chrome

No new economy. Make the frame.

- Top / camera / bottom. Wallet + goal + planet chips stick. Buy chips move to the dock (can still be 1 / 10 / MAX in this phase).
- Title / tagline leave the sticky region.
- Toast slot above the dock.
- Per-card buy / manager can stay on the card until Phase 2.
- Check a phone width and a desktop width. This is the first phase that needs a real browser pass.
- Touched: `src/ui.ts` `renderApp`, `src/styles.css`.

### Phase 2 — Outside view + unified dock

The new idea. Depends on chrome existing so both views share a frame.

- `view: "outside" | "inside"` + `focusIndex` / `selectedIndex` (session).
- Outside compact rows + BEST / LOCK / SLOW as specified.
- Switch: row → inside; Farm → outside; planet chip → outside of that planet.
- First-clip exception: one owned business → land inside.
- Extend `BuyMode` with `100` and `rank`; fix the `onBuyMode` parser.
- Dock primary buy targets the selected / focused business. Move inside buy + hire into the dock.
- Tests: rank never crosses a mark; rank with leftover cash buys only the gap; 100 is all-or-nothing; maxed RANK == MAX; BEST picks an affordable row; locked rows are not BEST.
- No save bump.
- Touched: `src/game.ts` (`BuyMode`, `resolveBuyCount`, recommendation helpers), `src/ui.ts`, `src/styles.css`, `src/main.ts`, `src/game.test.ts`.
- Browser pass: outside → inside → buy from dock → farm back → planet chip → prestige goal still visible.

### Phase 3 — Cycle speed on milestones

- `effectiveCycleSec` + floor.
- Wire `tick`, `viewsPerSec`, outside cycle pip, inside meta.
- Tests in §7.2.
- Play-feel: Cursed Short still 0.6s until 25; Agent Swarm still has a bar at 200.
- Derived from `owned` — **no new save field.**

### Phase 4 — Refresh nudge

- Managed-bar tap = +0.15 progress, 4/cycle, 200ms cooldown.
- Hint copy update. Inside only.
- Offline ignores nudges.
- Session-only — no save bump.
- Tests: unmanaged `startCycle` unchanged; managed tap does not call `startCycle`; nudge cap; offline path untouched.

### Phase 5 — Flavor toasts

- Table + picker + one-slot `showToast`.
- Replace the two tacky lines.
- Coalesce buy-bulk vs milestone (one toast).
- No save bump.

### Phase 6 — later, not this file's job

**Opus** owns the next visual / IA pass: [`docs/OPUS.md`](OPUS.md).

**Monetization:** do not touch / not this pass.

Events, passes, extra planets, and a later prestige-currency shop slot into existing sheets. Do not invent them from this archive.

---

## 12. Risks

### Prestige spam (already broken)

`canPrestige` is lifetime-based, so the button never re-locks. Fix that in Phase P0 before stacking more systems on the prestige chrome.

### Instant cycles

Cursed Short is already 0.6s. Aggressive speed (halve-every-rank, or no floor) turns the first business into a strobe and makes the tap layer pointless.

Mitigation: milestone-only trigger, 25% not 50%, `MIN_CYCLE_SEC = 0.25`, no speed before 25 owned.

### Softlock after prestige

The **board reset** is safe today: `prestige()` zeros spendable `views`, moves you to TikTok, and resets both planets via `emptyBusinesses(..., true)` so each planet has **one starter, no managers**. First TikTok clip pays `200_000 * prestigeMult` per 1s cycle (first prestige lands around +1.00x → 2.0x total). Next copy costs `1.15M`. A few taps buy it. YouTube still has one unmanaged Cursed Short.

Ways a later change could break *that* (separate from the spam bug):

- Speed or tap rules that require a manager, or a spend-sink, before the starter can run.
- Resetting `prestigeMult`.
- Not giving the TikTok starter `owned: 1`.
- Persisting a late-game cycle floor onto the post-prestige starter (will not happen if speed is derived from `owned`).
- RANK/100 as the only remembered buy mode with no way to tap `1` — keep the chips.
- Scaling `nextPrestigeAt` so hard that a fresh board cannot earn the next bar in a reasonable session (keep the first bar at 1M; `*= 10` per prestige is the suggested cap on how mean the second bar gets until someone playtests).
- Landing **inside** a locked TikTok card after prestige with no Farm button.

**Rule:** cycle speed is a function of current `owned`. Prestige naturally restarts the tempo. Do not persist a `cycleMult` on the save. After prestige, land **outside** on TikTok.

### Two-view confusion

If outside and inside each grow their own buy buttons, presets, and hire flows, the "unified upgrade" request fails.

Mitigation: one `BuyMode`, one `resolveBuyCount`, one dock primary. Views only change the target index.

If BEST is wrong (always picks the last business, or picks an unaffordable LOCK), players will ignore the advisor and the outside view was wasted. Tests on the score function matter more than the CSS of the badge.

### VPS / offline drift

`applyOffline` uses `globalViewsPerSec`. If `tick` uses effective cycle and `viewsPerSec` still uses `def.cycleSec`, away-earnings will be wrong (usually too low). One helper, three call sites.

Recommendation math must use the same helper or BEST will disagree with the wallet VPS.

### Toast spam

A RANK buy of 25 that also crosses a milestone must not fire buy-bulk + milestone + "sped up." One toast.

### Five chips on a 320px phone

Wrap the dock. Do not hide RANK. Do not shrink type below readable.

### First-unlock prestige lag

Even after P0, if prestige chrome only updates on `rebuild`, the button can enable late (or stay enabled a frame too long). Live-update in `patchMeters`.

### Hosting / scope

This game stays on the PC at `8896`. Do not stand up a warehouse copy. Do not bind `:3000`. Do not commit this file, or any game code, into d-ai.

---

## 13. Open questions / leftovers

Answered in play, or moved:

- Speed curve shipped as **halve at 25 / 100 / 400 / 1000**, floor 0.25s (not the 25%-per-mark default below). Do not flip it from this file.
- Outside-first once 2+ businesses are owned. Keep it.
- BEST badge is ROI (`ΔVPS / cost`). Keep it honest.

**Still open, and not for a drive-by:**

- Visual / IA overhaul → [`docs/OPUS.md`](OPUS.md)
- **Monetization: do not touch / not this pass.**

---

## Implementer notes

Touched files for the **Opus** pass are listed in [`docs/OPUS.md`](OPUS.md). Do not start from the phase table above unless you are debugging history.

Do not publish. Do not edit d-ai maps for this.

---

## Pointers

| File | Role now |
|---|---|
| `docs/BACK-BURNER.md` | Leftover pointer: Opus + monetization-left-alone |
| `docs/PRESTIGE-GATE.md` | Historical P0 prestige write-up (also §8 here). Shipped. |
| `docs/UI-UX.md` | Stub → `docs/OPUS.md` |
| `docs/OPUS-GUIDELINES.md` | Stub → `docs/OPUS.md` |
| `docs/OPUS.md` | The only Opus brief (visual / IA overhaul) |
| `docs/PLAYTEST.md` | Honest playtest notes from 2026-09-02 |
