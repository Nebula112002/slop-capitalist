# Playtest — anti-tedium extras

**Date:** 2026-09-02  
**Port:** `8896` (preview after `.\scripts\start.ps1`)  
**How:** unit tests, a multi-minute sim (`npx tsx scripts/playtest-sim.ts`), live `GET /` + bundle checks, and a headless Playwright pass on a cleared save.

## What I actually did

- Restarted `scripts/start.ps1` on `:8896`. Health: `{ ok, service: "slop-capitalist", port: 8896 }`.
- Fresh localStorage in Chromium. Landed on **YouTube farm** (outside). Tip present. SIM chip locked.
- Dismissed **Got it**. Dock said `Buy BEST · 1× Cursed Short · 4.3`. One tap bought it. No card hop.
- Mgrs tab: **Hire all affordable** is there. Drop tab: claim drop. Pass tab: Infinity Intern track. Settings: mute, recap, export.
- Sim: ~minutes of ticks, Buy BEST, hire-all, 5-minute away chest, prestige (pays once then locks), second prestige → The Simulation starter, algo layer, event/pass claims, export/import round-trip.

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

Prestige spam stayed locked. Hire-all hired owned, affordable managers cheapest first.

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

## What is not suck (so I do not sound like I only hate it)

- Outside-as-home + Buy BEST is the right loop. I progressed without opening a card.
- Hire-all + auto-run means I can leave the farm posting.
- Prestige pays once, re-locks, second prestige opens Simulation, third layer (Algo) resets viral and keeps a second multiplier.
- Export/import JSON works. Local only. No checkout.
- Live page is `:8896`, not `:3000`.

## What’s left for Caleb

- Decide if **Algo** should hide until it is live, or share the prestige sheet.
- Decide if **Managers** should stay a full camera tab or become a dock list so the farm never disappears.
- Tune **event/pass** so the second open is worth it (or accept they are chrome).
- Play a real hour on The Simulation numbers. I did not earn 1e12 views.
- Optional: quieter top chrome. I did not restyle it; the leftover-loop frame is already crowded.
- I did not add real-money anything. Do not.
