# Slop Capitalist — back-burner plan

**Status:** plan only. Do not implement from this file until Caleb says go.  
**Repo:** this folder (`D:\AI\slop-capitalist`). Own git. Do not fold into d-ai.  
**Host:** lives on the PC → runs on the PC. Port `8896`. Never `:3000`. Never the warehouse.

This pass writes the plan. It does not change gameplay, start servers, or publish anything.

---

## Back burner (raw user ideas)

Keep these verbatim so they are not lost. The rest of the file turns them into rules.

1. **Cycle times should shrink on upgrades.** "The times need to halve whenever it gets an upgrade or like 25% or something like that."
2. **Keep the theme.** Content-farm / algorithm idle. Do not retheme.
3. **Toasts / pop-ups feel tacky.** Make them more RNG / varied / less samey. Current examples include "Manager hired. You can look away now." and "Bought N. The slop thickens." The manager line was specifically called kinda cringe.
4. **Buy presets:** 1x, 10x, 100x, MAX, and **next rank** (buy up to the next milestone). Current UI only has 1 / 10 / Max.
5. **Tap mechanic to keep people engaged.** Idle already exists (managers + offline). Add an active tap layer that still matters after managers, without turning it into a pure clicker.
6. **Sticky chrome / camera.** Banner with currency / income should follow the player. User lean: **top** = progress goals + currency; **bottom** = upgrade / buy panels. Plan this as the future layout so later planets/events/passes can slot in. Current UI is a scrolling column with wallet in the header.

---

## Goal

Write a buildable design for the six ideas above, grounded in the v0 loop that already ships.

A later agent should be able to implement phase-by-phase **without re-deciding numbers, triggers, or layout**.

## Non-goals (this pass and this plan)

- **No implementation this pass.** No gameplay code, no CSS restyle, no toast table in `src/`.
- **No IAP. No ads.** The README already says "No backend. No ads." Keep it that way.
- **No theme change.** Content-farm / algorithm idle stays. Do not reskin as lemonade, lemons, pizza, or a generic tycoon. Do not copy Hyper Hippo / ComputerLunch art, names, or cash-shop passes (`AGENTS.md`).
- **No folding into d-ai.** Commit here only.
- **No move off the PC.** Port `8896`, Tailscale Serve via `scripts/start.ps1`. If it lives on the PC, it runs on the PC.
- **No Loopwright posts** from this folder.
- **No events / battle pass / extra planets in this work.** Only leave chrome slots so those can land later.
- **No cash-upgrade shop yet.** Cycle speed in this plan is derived from milestones, not a separate spend sink. A shop can come later without rewriting the speed rule.
- **Do not implement the prestige re-lock in this planning pass** either. It is already specified; it is just first when someone *does* implement.

---

## Prestige spam / re-lock

**Priority:** first real bug after the loop works. Not flavor. Do it before more planets, more businesses, cosmetics, or the feature phases below.

**Canonical write-up:** `docs/PRESTIGE-GATE.md`. Keep this heading. Do not delete.

Caleb can spam the Prestige button. After one prestige it stays available and pays again. It should reset and only unlock after **this-run** progression.

### Why spam works now

The gate is lifetime, and prestige never spends that lifetime.

`canPrestige` in `src/game.ts` is `lifetimeViews >= PRESTIGE_AT` (`1_000_000` in `src/data.ts`). `credit()` only **adds** to `lifetimeViews`. `prestige()` never zeros it, never records a last-prestige snapshot, and never raises a next threshold.

After the first qualifying prestige:

1. `lifetimeViews` is still `>= 1_000_000`.
2. `canPrestige` stays `true` forever.
3. The UI button stays enabled (`src/ui.ts` uses `canPrestige` for `disabled`).
4. Each click runs `prestige()` again.

`prestigeGain` is also a function of that same unchanged lifetime. At exactly 1M: `log10(1e6) - 5 = 1`. Every free click adds **+1.00x** to `prestigeMult` and resets the board again.

There is no `viewsThisRun`, no `nextPrestigeAt`, no last-prestige lifetime, and no cooldown.

### What prestige resets vs keeps (today)

| Field | After prestige |
|---|---|
| `views` | **Reset** to `0` |
| `planet` | Set to `"tiktok"` |
| `businesses.*` | **Reset** to empty + one starter each |
| `tiktokUnlocked` | Set `true` (stays true) |
| `prestigeMult` | **Kept** and **increased** by `prestigeGain(lifetimeViews)` |
| `lifetimeViews` | **Kept** (never drops) — this is the bug |

TikTok stays unlocked. The viral multiplier stacks. The board wipes. The gate does not.

### Recommended gate

Button only after **this run** progression. Disable **immediately** after prestige.

1. **`viewsThisRun`** — increment in `credit()` next to `lifetimeViews`. Reset to `0` inside `prestige()`.
2. **`nextPrestigeAt`** — start at `PRESTIGE_AT`. After each success, scale it up (`*= 10` is the suggested tune).

```
canPrestige = viewsThisRun >= nextPrestigeAt
```

Do **not** gate on `lifetimeViews >= PRESTIGE_AT`. Pay `prestigeGain(viewsThisRun)`, not lifetime. Spam with `viewsThisRun === 0` must no-op.

Do **not** refund an already-spam-inflated `prestigeMult` on old saves. Just stop further free clicks.

UI: progress is `{viewsThisRun} / {nextPrestigeAt}`; live-update disable from `patchMeters` (today prestige chrome only refreshes on `rebuild`). Keep `"Unlock TikTok"` / `"Go even more viral"`.

Save: keep `SAVE_KEY`. Bump `GameState.v` to `2`. Hydrate missing fields: never-prestiged → `viewsThisRun = lifetimeViews`; already prestiged → `viewsThisRun = 0` (re-lock now). Details and tests live in `docs/PRESTIGE-GATE.md`.

---

## Current state vs desired

### Loop that already exists

| Piece | Where | What it does today |
|---|---|---|
| Business defs | `src/data.ts` `BUSINESSES` | 5 YouTube + 5 TikTok. Each has fixed `cycleSec`, `income`, `baseCost`, `costMult`, `managerCost`. |
| Milestones | `src/data.ts` `MILESTONES` | `25, 50, 100, 200, …, 1000`. **Income only.** |
| Income x2 | `src/game.ts` `milestoneMult` | `2 ** n` where `n` is how many marks `owned` has crossed. |
| Cycle time | `src/game.ts` `tick`, `viewsPerSec` | Always `defs[i].cycleSec`. **Never shrinks.** |
| Cycle start | `src/game.ts` `startCycle` | Tap starts a bar if owned and not already running. |
| Managers | `src/game.ts` `hireManager` | One-time hire. Forces `running = true`. After that, tap does nothing useful. |
| Offline | `src/game.ts` `applyOffline` | Managers only, 8h cap (`OFFLINE_CAP_MS`). Uses `globalViewsPerSec`. |
| Buy modes | `src/game.ts` `BuyMode` | `1 \| 10 \| "max"`. `resolveBuyCount` / `buy`. 1 and 10 are all-or-nothing; max uses `maxAffordable`. |
| Next rank helper | `src/game.ts` `nextMilestone` | Already returns the next mark. **Not wired to buy.** |
| Prestige | `src/game.ts` `prestige` | At 1M lifetime views: add multiplier, unlock TikTok, zero views, reset both planets to one starter each. |
| Save | `GameState.v = 1`, `SAVE_KEY = "slop-capitalist.v1"` | `loadGame` hydrates missing fields from `newGame`. Buy mode is **session-only** (`let buyMode` in `src/main.ts`). |
| Wallet | `src/ui.ts` `renderApp` → `<header class="top">` | Views, VPS, viral multiplier. Scrolls away with the page. |
| Buy chips | `src/ui.ts` toolbar | `1` / `10` / `Max` only. Parser in `onBuyMode` treats anything that is not `"max"` or `"10"` as `1`. |
| Toasts | `src/ui.ts` `showToast`, fired from `src/main.ts` | Hardcoded lines. Each call appends a new `div.toast` at `bottom: 24px` (they overlap, they do not queue). |
| Layout | `src/styles.css` `.shell` | Narrow scrolling column, `max-width: 520px`. Nothing is sticky except the toast. |

YouTube cycle bases (for the speed math later):

| Business | `cycleSec` |
|---|---|
| Cursed Short | **0.6** (already fast) |
| Faceless Listicle | 3 |
| AI Voiceover Essay | 6 |
| Reaction Farm | 12 |
| Agent Swarm | 24 |

TikTok mirrors 1 / 3 / 6 / 12 / 24.

### Desired (after later implementation)

- Hitting a **rank** (milestone) also makes that business **faster**, with a floor so Cursed Short never becomes a strobe.
- Same theme, dryer flavor, RNG toasts from a small table.
- Buy bar: `1` / `10` / `100` / `MAX` / `RANK`.
- Tapping a managed bar still does *something*, without replacing idle.
- Top chrome sticks with goals + wallet. Bottom chrome sticks with buy / upgrade actions. Middle list is the camera.

---

## 1. Cycle-speed upgrades

### Recommendation (default)

**25% faster per milestone. `effectiveCycle = max(0.25, baseCycle * 0.75^ranks)`.**

- **Trigger:** crossing a mark in `MILESTONES` (25, 50, 100, …). Same moments that already double income.
- **Not on every copy bought.** Buying 1→2 must not shrink the bar. Early game is "tap the 0.6s short, buy a few, hire the gremlin."
- **Not on manager hire.** Hiring already converts tap-to-run into autopilot. Do not also gift speed, or "hire" and "rank up" blur together.
- **Derived from `owned`.** No extra save field. Prestige resets owned → tempo resets for free.

`ranks` = `MILESTONES.filter(m => owned >= m).length` — the same count `milestoneMult` already walks.

```
MIN_CYCLE_SEC = 0.25
SPEED_PER_RANK = 0.75          // 25% faster
effectiveCycleSec(base, owned) = max(MIN_CYCLE_SEC, base * SPEED_PER_RANK ** ranks)
```

A later agent should introduce `effectiveCycleSec` next to `milestoneMult` and use it in **all three** of: `tick`, `viewsPerSec`, and the card meta line. Today `tick` and `viewsPerSec` divide by `defs[i].cycleSec`, and the card hardcodes `${def.cycleSec}s cycle` in `renderBusinesses`. If those three drift, displayed VPS, live payout, and offline payout disagree.

### Why 25%, not halve

Income **already** doubles at the same marks. Stacking a 2× time cut on a 2× income bump is a **4× VPS cliff** every rank.

Cursed Short starts at **0.6s**. One halving puts it at 0.3s; two puts it at 0.15s (under the floor). The first business would feel done by the second rank.

25% + 2× income = **~2.67× VPS** at each mark. Still a punchy rank-up. The long businesses stay readable for a long time.

### Worked numbers (default)

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

That is the curve we want: the starter clip becomes "live" around 100 owned; the end-planet farm still has a visible bar at max rank.

### Floor / "live" behavior

When `effectiveCycleSec === MIN_CYCLE_SEC`, keep paying through `tick` as today (progress still advances). Optional later polish: show the bar as **Live** instead of a filling pulse so 0.25s does not strobe. Do **not** special-case payout math — `viewsPerSec` already does `income / cycleSec`.

`tick` already folds leftover progress (`cycles = floor(progress)`). A 0.25s cycle at 4 Hz is fine. Do not drop below 0.25s.

### Interaction with existing x2 income

Leave `milestoneMult` and `MILESTONES` alone. Speed is a second bonus at the same marks, not a replacement.

`cycleIncome` stays `def.income * owned * milestoneMult(owned) * prestigeMult`.  
`viewsPerSec` becomes `cycleIncome / effectiveCycleSec(...)`.

UI meta line today: `Next x2 at ${milestone}` + `${def.cycleSec}s cycle`. After this lands, show the **effective** time, and when a rank also speeds the bar, the copy can read `Next rank at 50 · 0.45s` — still one line, not a speech.

### Alternate (if Caleb wants punchier)

**Halve, but only at 25 / 100 / 400 / 1000** (four cuts), same 0.25s floor. Income x2 stays on every mark.

This separates "got faster" from "got richer" so they do not stack into a 4× every 25 copies.

Agent Swarm would go 24 → 12 → 6 → 3 → 1.5. Cursed Short would hit the floor at 100 (`0.6 → 0.3 → 0.15` clamped).

Do **not** halve on every milestone. `24 * 0.5^12 = 0.006s`. Everything becomes instant by mid-game.

**Default stays 25% per mark.** Use the alternate only if Caleb answers Open Question 1 that way.

### Early-game protection (checklist for the implementer)

- No speed until owned ≥ 25.
- Cursed Short stays 0.6s for the whole opening (first manager is 1,000 views; 25 shorts is a real first goal).
- Floor 0.25s.
- Prestige resets owned → first TikTok clip is 1.0s again, not whatever late-YouTube tempo the player had.
- Tests to lock this: `effectiveCycleSec` at owned 1, 24, 25, 50, 100, 1000 for both the 0.6s and 24s defs; `tick` / `viewsPerSec` / offline all use the helper.

---

## 2. Theme

Content-farm / algorithm idle. Views, planets (YouTube → TikTok), cursed shorts, managers with job titles, prestige as "go viral."

Do not rename businesses, do not swap the joke, do not generic-tycoon the copy. Flavor lines below stay in that voice — dryer, not goofier.

---

## 3. Flavor / RNG toasts

### What is wrong now

Fired from `src/main.ts`:

| Event | Line |
|---|---|
| Buy ≥ 10 | `Bought ${n}. The slop thickens.` |
| Manager | `Manager hired. You can look away now.` |
| Prestige | `TikTok unlocked. Permanent +${gain.toFixed(2)}x` |
| Reset | `Fresh account. Post your first cursed short.` |
| Offline | `While you were gone (${time}): +${views} views` (`showAway`) |

The manager line is the one called out as cringe. The buy line is the same every bulk purchase. `showToast` also **stacks DOM nodes** at the same screen position.

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
- Sit the slot **just above the bottom chrome**, not over the buy chips and not as a second wallet.
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
| Tick / VPS / tap nudge | No (too noisy) |

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

If a later agent wants more lines, add them in twos (one common, one uncommon). Do not grow this into a dialogue tree.

---

## 4. Buy-bar UX, including next rank

### Modes

```
BuyMode = 1 | 10 | 100 | "max" | "rank"
```

Chip labels (short — five chips have to fit a phone): `1` `10` `100` `MAX` `RANK`.

### Math

| Mode | `resolveBuyCount` | Afford rule |
|---|---|---|
| `1` / `10` / `100` | that number | All-or-nothing. Button disables if `views < buyCost(..., count)`. Same as today's 1 and 10. |
| `max` | `maxAffordable(...)` | Spend down. Unchanged. |
| `rank` | `min(maxAffordable, remaining)` | **Never buy past the next mark.** |

`remaining = nextMilestone(owned) - owned`. If `nextMilestone` is `null` (maxed at 1000), RANK behaves like MAX (or disables — implementer pick: **behave like MAX** so the chip is never dead).

This is the whole point of RANK vs MAX: if you can afford 47 and the next x2 is 3 copies away, **RANK buys 3**. MAX would buy 47 and dump cash into post-rank copies that are not the exciting breakpoint.

Partial toward the rank is allowed. If you can only afford 3 of 7, buy 3. Button label shows the actual purchase:

- Can afford the full gap: `Rank 7 · 12K`
- Can afford some: `Rank 3/7 · 4K`
- Can afford none: disabled, still show `Rank 7 · 12K`

Do **not** require the full gap in wallet before the button works. Late marks (200→300) would feel broken.

### Parser trap

`src/ui.ts` today:

```
handlers.onBuyMode(raw === "max" ? "max" : raw === "10" ? 10 : 1)
```

Anything new (`100`, `rank`) would silently become `1`. The later agent must replace that ternary with a real parse.

`patchMeters` / `renderBusinesses` buy-button text also special-cases only `"max"`. RANK needs the `3/7` form above.

Buy mode stays **session-only** (already `let buyMode` in `main.ts`). No save bump.

### Toolbar home

After chrome work: these five chips live in the **sticky bottom bar**, not in the scrolling column. Until then they can stay where `.toolbar` is, just with two more chips. Wrap on narrow widths (`flex-wrap`). Do not shrink type below readable.

---

## 5. Tap engagement loop

Idle stays the core: managers run, offline pays, you can look away. Tap has to matter **after** a manager without turning the game into Cookie Clicker.

### System A — Refresh nudge (ship this)

Theme: you are pushing a post back toward the For You page. The farm still runs.

- **Unmanaged:** unchanged. Tap starts the cycle (`startCycle`). Bar is the existing tap target (`.run` + `.bar`).
- **Managed:** tap the bar to **add +0.15 progress** (15% of a cycle).
- Cap **4 nudges per cycle** (max +0.60 from tapping).
- Per-business cooldown **200ms** so mash does not skip a 24s cycle in one frame.
- Offline **ignores** nudges. You were not there.
- Session-only. Do not persist boost state. Prestige / reload just lose the in-flight nudges (progress itself already saves).

A 24s Agent Swarm can be hurried to ~10s if you sit there and refresh. A 0.6s Cursed Short barely notices (and once it is "live" at 0.25s, nudges are almost cosmetic — that is fine; the long bars are the toy).

UI: keep using the existing bar as the hit target. Tiny feedback on nudge (`+refresh`, a flash). Do not add a second big button.

Hint line today (`On autopilot` / `Tap to upload`) can become `On autopilot · tap to refresh` when managed.

### System B — Session notice (only if A feels thin)

A small combo pip in the **top** chrome.

- Any bar tap increments a combo. Combo dies after ~2s without a tap.
- At 8 taps: **Algo notice** — +25% global income for 20s.
- Then a 60s cooldown. It is a session snack, not a job.
- Offline ignores it. Do not save it.

Do **not** ship A and B in the same phase. A first. B only if tapping a managed 24s bar still feels empty.

### Rejected

- Big-cookie income (taps as the real wallet).
- Energy / stamina that managers wait on. That is not idle.
- Golden-cookie chase popups. We are already killing tacky toasts.
- "Managers pause if you do not tap." That punishes the loop we already shipped.

---

## 6. Top / bottom chrome (future layout)

### Now

`renderApp` paints one scrolling `.shell`: title, tagline, `.wallet`, planet nav, prestige card, buy toolbar, `#biz-list`, footer. `.wallet` is not `position: sticky`. The toast is the only fixed thing, and it sits on top of where a bottom bar wants to live.

### Target frame

```
┌ sticky TOP ──────────────────────────────────┐
│ Views · VPS · Viral x                        │
│ Goal: prestige 1.0M / 1.0M  ·  planet chips  │
├ camera (scroll) ─────────────────────────────┤
│ business cards — bars, names, per-card buy   │
│ (later: extra planets, event stage)          │
├ sticky BOTTOM ───────────────────────────────┤
│ 1 · 10 · 100 · MAX · RANK                    │
│ (later tabs: Buy | Upgrades | Event | Pass)  │
└──────────────────────────────────────────────┘
```

- **Top = where am I.** Currency, income, prestige / event / pass progress, which planet. Glanceables. User already leaned this way.
- **Bottom = what do I do.** Buy mode, later cash upgrades, event shop, pass claim. Thumbs reach actions on a phone.
- **Middle = the camera.** The list (and later a planet map) scrolls. Cards stay in the world.

### Why this split for later systems

| Later thing | Slot |
|---|---|
| More planets | Top chips + camera world |
| Timed event | Top: countdown / goal. Bottom: event shop tab |
| Season pass | Top: XP pip. Bottom: pass tab / claim |
| Cash upgrades | Bottom tab, not a second scrolling novel |
| Daily goal | Top goal slot (the prestige row already is this) |

Wallet does **not** go to the bottom. Currency is status, not an action. AdCap-style money stays high.

### What moves

- Title + tagline: first session or a `?` overflow. Do not stick a 4.6rem `h1` forever.
- Prestige card: collapse into the top **goal** row. After the re-lock ships, that row is `{viewsThisRun} / {nextPrestigeAt}` — not lifetime / 1M forever. Confirm can be a small sheet.
- Planet buttons: compact chips in the top chrome.
- Buy chips: bottom bar.
- Reset save: stay in a quiet overflow / footer, not the sticky bar.
- Toasts: immediately above the bottom bar.

CSS sketch for the implementer (do not apply now): a full-height column, `100dvh`; top and bottom `flex: 0 0 auto`; middle `flex: 1; overflow-y: auto`. Keep the 520px max width. `z-index` the chromes over the list. Safe-area padding for phones.

Per-card Buy + Manager buttons stay on the card in v1 of this layout. The bottom bar is **mode + future tabs**, not a second inspector. A selected-card inspector can wait.

---

## Suggested build order

A later agent implements **one phase per pass** unless Caleb says to batch. Each phase should ship with tests where the math changed, and should be playable on its own.

### Phase 0 — this file

Plan only. Done when this document is committed in this repo.

### Phase P0 — Prestige re-lock (do first when implementing)

Already specified in `docs/PRESTIGE-GATE.md` and the section above. Bug, not flavor. Before buy-bar, toasts, speed, chrome, or tap.

- `viewsThisRun` + `nextPrestigeAt`; `canPrestige` this-run only.
- `prestige()` pays this-run gain, zeros the run meter, raises the next bar, then does the existing board reset.
- Button disabled immediately; live progress in `patchMeters`.
- Save `v: 2`, same `SAVE_KEY`. Tests: second click is a no-op; old prestiged saves hydrate locked.

### Phase 1 — Buy bar + RANK

Lowest risk economy-wise. No cycle-time change.

- Extend `BuyMode`; fix the `onBuyMode` parser.
- `resolveBuyCount` for `100` and `rank` as specified.
- Five chips; wrap on narrow widths.
- Tests: rank never crosses a mark; rank with leftover cash buys only the gap; 100 is all-or-nothing; maxed RANK == MAX.
- No save bump.

### Phase 2 — Flavor toasts

- Table + picker + one-slot `showToast`.
- Replace the two tacky lines.
- Coalesce buy-bulk vs milestone (one toast).
- No save bump.

### Phase 3 — Cycle speed on milestones

- `effectiveCycleSec` + floor.
- Wire `tick`, `viewsPerSec`, card meta.
- Tests listed in §1.
- Play-feel: Cursed Short still 0.6s until 25; Agent Swarm still has a bar at 200.
- Derived from `owned` — **no new save field.** Do not bump `SAVE_KEY`.

### Phase 4 — Sticky chrome

- Top / camera / bottom frame.
- Move wallet + goal up; buy chips down; toast above the bottom bar.
- No game-logic change.
- Check a phone width and a desktop width. This is the one phase that needs a real browser pass.

### Phase 5 — Refresh nudge

- Managed-bar tap = +0.15 progress, 4/cycle, 200ms cooldown.
- Hint copy update.
- Offline ignores nudges.
- Session-only — no save bump.
- Tests: unmanaged `startCycle` unchanged; managed tap does not call `startCycle`; nudge cap; offline path untouched.

### Phase 6 — later, not this plan's job

Events, passes, extra planets, optional System B combo, optional "Live" bar polish, optional cash-upgrade shop. They slot into the chrome from Phase 4.

---

## Risks

### Instant cycles

Cursed Short is already 0.6s. Aggressive speed (halve-every-rank, or no floor) turns the first business into a strobe and makes the tap layer pointless.

Mitigation: milestone-only trigger, 25% not 50%, `MIN_CYCLE_SEC = 0.25`, no speed before 25 owned.

### Prestige spam (already broken)

`canPrestige` is lifetime-based, so the button never re-locks. See § Prestige spam / re-lock. Fix that in Phase P0 before stacking more systems on the prestige chrome.

### Softlock after prestige

The **board reset** is safe today: `prestige()` zeros spendable `views`, moves you to TikTok, and resets both planets via `emptyBusinesses(..., true)` so each planet has **one starter, no managers**. First TikTok clip pays `200_000 * prestigeMult` per 1s cycle (first prestige lands around +1.00x → 2.0x total). Next copy costs `1.15M`. A few taps buy it. YouTube still has one unmanaged Cursed Short.

Ways a later change could break *that* (separate from the spam bug):

- Speed or tap rules that require a manager, or a spend-sink, before the starter can run.
- Resetting `prestigeMult`.
- Not giving the TikTok starter `owned: 1`.
- Persisting a late-game cycle floor onto the post-prestige starter (will not happen if speed is derived from `owned`).
- RANK/100 as the only remembered buy mode with no way to tap `1` — keep the chips.
- Scaling `nextPrestigeAt` so hard that a fresh board cannot earn the next bar in a reasonable session (keep the first bar at 1M; `*= 10` per prestige is the suggested cap on how mean the second bar gets until someone playtests).

**Rule:** cycle speed is a function of current `owned`. Prestige naturally restarts the tempo. Do not persist a `cycleMult` on the save.

### Save version bump

Today: `GameState.v: 1` and `SAVE_KEY = "slop-capitalist.v1"`. `loadGame` already fills gaps from `newGame`.

| Change | Bump? |
|---|---|
| Buy modes (session) | No |
| Flavor table | No |
| Speed derived from owned | No |
| Chrome CSS | No |
| Nudge (session) | No |
| Prestige re-lock (`viewsThisRun`, `nextPrestigeAt`) | **Yes — `v: 2`**, same `SAVE_KEY`. Hydrate as in `docs/PRESTIGE-GATE.md`. |
| Other new persisted fields (toast history, layout prefs, boost stats) | Bump `v` and hydrate defaults. **Do not rename `SAVE_KEY`** unless the JSON is incompatible — renaming orphans the live local save. |

If a migrator is ever needed, switch on `parsed.v` inside `loadGame`. Do not invent a second storage key for a soft change.

### VPS / offline drift

`applyOffline` uses `globalViewsPerSec`. If `tick` uses effective cycle and `viewsPerSec` still uses `def.cycleSec`, away-earnings will be wrong (usually too low). One helper, three call sites.

### Toast spam

A RANK buy of 25 that also crosses a milestone must not fire buy-bulk + milestone + "sped up." One toast. Phase 2 rule.

### Five chips on a 320px phone

Wrap the bottom bar. Do not hide RANK behind a overflow if we can help it — it is the new mode.

### Hosting / scope

This game stays on the PC at `8896`. Do not stand up a warehouse copy. Do not bind `:3000`. Do not commit this file, or any game code, into d-ai.

---

## Open questions for Caleb

Only the calls a human has to make. Everything else is decided above.

1. **Speed curve.** Default is **25% faster at every milestone, floor 0.25s**. Alternate is **halve at 25 / 100 / 400 / 1000 only**, same floor. Which one?
2. **RANK afford.** Default is **buy toward the mark, never past it** (partial OK). The stricter AdCap read is "button off until you can afford the whole gap." Partial is less punishing at 200→300. Confirm partial.
3. **Tap.** Default is **System A, refresh nudge** (+0.15 progress, 4/cycle). The other simple option is a small instant cream (10% of one cycle's income, cooldown). Not both. Confirm nudge.
4. **Anything else on the back burner** that is not in the raw list — cash-upgrade shop, sound, a third planet — so it can be appended here instead of living in chat?

If these sit unanswered, a later agent should implement the defaults in this file (25% / partial RANK / nudge A) and not block.

---

## Implementer notes (do not do them now)

Touched files when someone actually builds this, in phase order:

- Phase P0: `src/game.ts` (`GameState`, `credit`, `canPrestige`, `prestige`, `loadGame`), `src/ui.ts` prestige chrome + `patchMeters`, `src/game.test.ts`. Follow `docs/PRESTIGE-GATE.md`.
- Phase 1: `src/game.ts` (`BuyMode`, `resolveBuyCount`), `src/ui.ts` (chips, parser, labels), `src/game.test.ts`
- Phase 2: `src/data.ts` or new `src/flavor.ts`, `src/ui.ts` `showToast`, `src/main.ts` call sites
- Phase 3: `src/game.ts` (`effectiveCycleSec`, `tick`, `viewsPerSec`), `src/ui.ts` meta line, `src/game.test.ts`
- Phase 4: `src/ui.ts` `renderApp`, `src/styles.css`
- Phase 5: `src/game.ts` (nudge helper), `src/ui.ts` hints / bar handler, `src/main.ts`, tests

Do not start servers to write a markdown file. Do not publish. Do not edit d-ai maps for this.
