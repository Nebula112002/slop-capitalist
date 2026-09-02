# Playtest log

**Port:** `8896` (preview after `.\scripts\start.ps1`)

Leftovers: [`docs/OPUS.md`](OPUS.md). **Monetization: do not touch / not this pass.**

---

# Pass 2 — Opus UI/UX overhaul

**Date:** 2026-09-02 · `npm test` (101) + `npm run build` green · `node scripts/playtest-browser.mjs`

## What changed

**Landing is a product page.** Wordmark, one-line pitch, an animated mock of the farm (HUD, three
rows with live bars, a mint buy bar), three labelled points (AIM / STAY / RESET), then a real
`Player name` field and one primary. A brand-new name goes **straight to the farm** — there is no
save to reassure anyone about. A name with progress still stops on the pitch so
`Continue · {name} · {views}` can prove nothing was wiped. `New run` is a quiet text button and
still confirms. Nobody signed in means no dead disabled Continue at all.

**One HUD replaced the chrome pile.** Wordmark row (home + menu) over a single card: big gold
Views, `/s` on the right, a thin `Viral / Hype / Algo` meta line, and a **prestige meter pill**
whose sub-label is the bar the run has to clear (`1B`) instead of a rounded percent. Ready state is
a gold border, gold text, `Ready`, and a slow glow — visible in a glance at 390px. Algo is still
absent until it can fire.

**Farm rows became the game.** Rows now carry a **live cycle bar**, `/s`, `×2 at 200 · 82 to go ·
~1m 36s`, and the cycle. Rows you do not own show the business blurb plus what it costs, so the
empty half of the list sells the next unlock instead of repeating "locked". The list stretches to
fill whatever the chrome leaves. Measured on a 390×844 phone: **122px of top chrome, 128px of dock,
five rows at 101px, all five fully visible, list owns 60% of the screen** (was ~3 squeezed rows).

**Under 0.4s a cycle bar is a strobe, not information.** Those rows switch to a steady running
shimmer and label the floor as `0.25s min`. The economy is untouched — only the read changes.

**Open only exists on the selected row.** One 36px column on the row you already picked, so there
is nothing to fat-finger on the other four. Enter on an already-selected row does the same thing.

**Dock is two lines.** `×1 ×10 ×100 MAX RANK` in a scrollable rail plus a filled `BEST` toggle,
one muted teaching line, then the primary. The old `Qty` label is gone; the line explains the chips
instead (`MAX spends it all. RANK stops at the next ×2.`). `Mgrs / Drop / Pass` left the dock
entirely — the third always-on stack is dead.

**Quantity and BEST are now orthogonal.** Tapping a quantity chip used to silently cancel BEST,
which made the documented `RANK BEST` combination unreachable by tapping RANK first. The chip now
stays lit in BEST mode because BEST really does buy that many.

**One menu holds every rare job.** Managers, Drop, Pass, Stats, Settings, and a waiting chest, each
with a one-line summary and a gold flag when something is ready (`1 READY`, `FREE`, `CLAIM`). The
menu button carries a gold dot when anything inside is live.

**Chest is hard to miss.** A gold strip above the farm list whenever one is pending, plus the menu
row. It only exists when there is a chest.

**Inside is a real drill-in.** Hire moved off the dock and onto the card. The upload slab takes the
leftover height, with a stats trio (per second / cycle / next rank) under it.

**Juice.** Buys punch the button, thump the row, pop the Views counter, and float a `+N` off the
row. Milestones get a three-note arpeggio. All layered oscillators, still muted by the same toggle.

**A11y.** Sheets are `role="dialog" aria-modal`, take focus on open, trap Tab, close on Escape or a
backdrop tap, and mark the chrome behind them `inert`. Rows are a `listbox` of `option`s with a
roving tab stop and arrow / Home / End / Enter keys. Chips and planets report `aria-pressed`. The
wordmark says what it does. Everything animated collapses under `prefers-reduced-motion`.

## Honest leftovers

1. **BEST math is unchanged and still picks Cursed Short early.** The dock now explains *why*
   ("most views per second per view spent") without naming a second winner. It is still not
   the exciting answer.
2. **The Simulation is still a poster.** Copy is one dry line on the farm. 1e12 costs stay.
3. **Drop and Pass are still chrome.** Second open is titles. They are out of prime space now,
   which is the honest treatment, not a fix.
4. **Empty-fold at minute zero.** One owned row plus four blurbs fills the screen, but it is
   blurbs, not gameplay. That is an economy shape, not a layout bug.
5. **Playwright on a live tab never sees the chest.** Verified with a seeded save instead.

---

# Pass 1 — emptied burner redo

**Date:** 2026-09-02

The suck list below is historical (pre-landing cleanup). Do not re-implement chrome from it.

## What I actually did (redo, after sign-in / Hype / idle chest)

- Built on the live tree: username sign-in, Hype shop, idle-chest ranks, selected-row buy + BEST chip, hire-all.
- Sign-in vs landing: farm no longer ticks on the pitch. Continue names the signed-in save, not the text box. Away toast waits until Continue. Invalid username can toast on landing.
- Legacy `slop-capitalist.v1` moves onto the **first** username only, then the old key is removed so Alice does not inherit Caleb.
- Prestige pays **10 Hype** at 1M this-run, viral stays 1.00x, next bar is 1B. Toasts say Hype, not a fake `+10.0x`.
- Chest is a **25% bonus** on top of away earnings, claimed once. Not a second copy of the wallet.
- Mint still follows the selected row unless the BEST chip is on.
- Restarted `:8896`. `npm test && npm run build`. HTTP + sim playtests.

## How BEST is scored

`score = (potentialVPS after the quoted buy − potentialVPS before) / cost`

- Uses the same helpers as live VPS (`cycleIncome` / `effectiveCycleSec` / `totalMult`).
- Only rows you can actually buy under the current chip (1 / 10 / 100 / MAX / RANK).
- Ties keep the **lower index**.
- No BEST if nothing is affordable. Locked rows are never scored.
- `Buy BEST` calls `buyBest()`, which purchases `adviseFarm().bestIndex`. Tests fail if another affordable row has a higher score, or if `buyBest` spends on a different row.

That is payback time, inverted. Time-to-double is the same ranking.

## Objective bugs I found and fixed

- **Fresh farm did not earn until you opened a card and tapped.** Outside-as-home made that a softlock. Owned bars now auto-start while the page is open. Managers still own offline. Tap is optional juice.
- **BEST had no proof.** Added tests that the badged row is the max `ΔVPS/cost`, that locked/unaffordable rows cannot win, and that `buyBest` spends only on that row.
- **Landing ran the farm.** Sitting on the pitch accrued views and `playMs`, so Continue looked like a save. Frozen until Continue.
- **Every new username cloned the legacy save.** First claim consumes `slop-capitalist.v1`.
- **Prestige toast still said `+Nx` after Hype.** Flavor now banks Hype. Viral does not jump for free.
- **Away toast died on landing** (no toast slot). Slot on the pitch; farm toast waits for Continue.

Prestige spam stayed locked. Hire-all hired owned, affordable managers cheapest first. Chest claim is bonus-once.

## Honest suck list

1. **The top of the screen is a pile.** Wallet (now 4 cells), prestige + disabled Algo, three planet chips, event pip, pass pip, then the tip. On a phone this is homework before the farm.
2. **Algo looks broken.** It sits next to Prestige, grey, until viral ≥ 3x. A first-session player will tap it, get nothing, and assume the game is unfinished.
3. **Managers tab replaces the farm.** You lose BEST and the rows while you hire. Hire-all helps. Still a scene change for a one-button job. A dock list on the farm would be less tedious.
4. **Open is still on every row.** Correct (inside is optional). It also nags you to leave the farm. Easy to tap Open by mistake on a narrow row.
5. **Early BEST is always Cursed Short.** The math is right and the tests agree. It still *feels* like a liar because the next unlock is the interesting one. The advisor does not say why Short wins.
6. **RANK + Buy BEST need a sentence.** The chips change what BEST means. RANK BEST is “best step toward a rank,” not “buy the selected row.” I know that. A new player does not.
7. **Event drop is a free snack.** First visit, claim 2.5k views, done. The shop is titles. Fine for “no IAP.” Not a reason to open the tab twice.
8. **Pass first reward is a title.** Intern Badge at 10k lifetime views. No juice. The later view packs are so far away they might as well be flavor text.
9. **The Simulation is a poster.** Second prestige unlocks it with a starter. Copy costs are 1e12+. You will not buy a second Prompt Farm in a normal sitting.
10. **Comeback chest is real and easy to miss.** Needs 60s away + earnings. Playwright on a live tab never sees it. The sheet is clear when it does fire.
11. **Juice is a tiny beep.** Mute works. It does not make a buy feel like a buy. Fine. Do not add a cash-shop sound pack.
12. **Half-cycle at 25/100/400/1000 is punchy.** Cursed Short hits the 0.25s floor at 100. Combined with income x2 at every mark, rank 25 is a 4× VPS cliff. That was the requested curve. It will make late Shorts feel like a strobe.

Items 1–12 are Opus chrome / optional economy feel. Do not re-litigate them from this file.

## What is not suck (so I do not sound like I only hate it)

- Outside-as-home + selected-row buy + BEST as a mode chip is the right loop.
- Hire-all + auto-run means I can leave the farm posting.
- Prestige pays Hype once, re-locks, second prestige opens Simulation. Algo stays hidden until it can fire.
- Username saves stay on their own keys. Export/import JSON works. Local only. No checkout.
- Live page is `:8896`, not `:3000`.

## What’s left for Caleb

- **Opus pass** — [`docs/OPUS.md`](OPUS.md)
- **Monetization: do not touch / not this pass.**
