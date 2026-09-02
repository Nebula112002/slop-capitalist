# Prestige spam / re-lock

**Status:** back-burner addendum. Planning only — do not ship game logic from this note.  
**Also listed in:** `docs/BACK-BURNER.md` (same section). If that file later grows other items, keep this section; do not treat this file as obsolete.

**Priority:** first real bug after the loop works. Not flavor. Do it before more planets, more businesses, or cosmetics.

Caleb can spam the Prestige button. After one prestige it stays available and pays again. It should reset and only unlock after **this-run** progression.

---

## Why spam works now

The gate is lifetime, and prestige never spends that lifetime.

`canPrestige` in `src/game.ts`:

```ts
export function canPrestige(state: GameState): boolean {
  return state.lifetimeViews >= PRESTIGE_AT;
}
```

`PRESTIGE_AT` in `src/data.ts` is `1_000_000`.

`credit()` only ever **adds** to `lifetimeViews`. `prestige()` never zeros it, never records a last-prestige snapshot, and never raises a next threshold.

So after the first qualifying prestige:

1. `lifetimeViews` is still `>= 1_000_000`.
2. `canPrestige` stays `true` forever.
3. The UI button stays enabled (`src/ui.ts` uses `canPrestige` for `disabled`).
4. Each click runs `prestige()` again.

`prestigeGain` is also a function of the **same unchanged lifetime**:

```ts
export function prestigeGain(lifetimeViews: number): number {
  if (lifetimeViews < PRESTIGE_AT) return 0;
  return Math.max(0.25, Math.log10(lifetimeViews) - 5);
}
```

At exactly 1M: `log10(1e6) - 5 = 1`. Every free click adds **+1.00x** to `prestigeMult` and resets the board again. No extra views required.

There is no `viewsThisRun`, no `nextPrestigeAt`, no last-prestige lifetime, and no cooldown.

---

## What prestige resets vs keeps (today)

`prestige()` in `src/game.ts`:

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

---

## What the UI does now

`src/ui.ts` prestige block:

- Title: `"Unlock TikTok"` until `tiktokUnlocked`, then `"Go even more viral"`.
- If `canPrestige`: copy shows `+{prestigeGain(lifetimeViews)}x` and the button is **enabled**.
- Else: copy shows `lifetimeViews / PRESTIGE_AT` and the button is **disabled**.
- After the first prestige, `rebuild()` re-renders with `canPrestige` still true, so the button stays live.

`patchMeters` updates wallet + business bars only. It does **not** refresh prestige disabled-state or progress. Prestige chrome only updates on a full `renderApp` (`rebuild`: buy, manager, planet, prestige, buy-mode, reset).

Related: the **first** unlock can also lag until a rebuild (a buy, etc.), because ticks only call `patchMeters`. Fix both when implementing: live progress **and** live disable.

`src/main.ts` `onPrestige` calls `prestige()`, rebuilds if `gain > 0`, toasts the multiplier. No second check. Tests in `src/game.test.ts` assert first unlock only — they never assert `canPrestige` is false afterward.

---

## Recommended gate

Button only after **this run** progression. Disable **immediately** after prestige.

Use **both**:

1. **`viewsThisRun`** — earned this prestige cycle. Increment in `credit()` next to `lifetimeViews`. Reset to `0` inside `prestige()`.
2. **`nextPrestigeAt`** — threshold for this run. Start at `PRESTIGE_AT` (`1_000_000`). After each successful prestige, **scale it up** so later prestiges are a new grind, not the same 1M bar.

```
canPrestige = viewsThisRun >= nextPrestigeAt
```

Do **not** gate on `lifetimeViews >= PRESTIGE_AT`. That is the current bug.

Immediately after prestige: `viewsThisRun = 0`, `nextPrestigeAt` already raised → button disabled.

Suggested scale (tune in play, not here): `nextPrestigeAt *= 10`, or `nextPrestigeAt = 10 ** (5 + prestigeCount)` so it stays in the same log neighborhood as the current gain formula. First bar stays 1M so the existing first-TikTok beat is unchanged.

`views` (spendable cash) is the wrong meter. Buys spend `views` but should not delay prestige.

---

## Repeat prestige must not pay the same gain for free

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

---

## UI

- Button **disabled** when `!canPrestige`. Enabled only when this-run views hit `nextPrestigeAt`.
- Progress copy: `{viewsThisRun} / {nextPrestigeAt}` (not lifetime / 1M after the first prestige).
- When ready: still show the **this-run** gain (`prestigeGain(viewsThisRun)`), not a lifetime replay.
- After prestige: immediately disabled, progress at `0 / next`.
- Update prestige chrome from `patchMeters` (or a small `patchPrestige`) every tick so progress and disable stay live without a buy/rebuild.
- Keep the existing `"Unlock TikTok"` / `"Go even more viral"` titles.

---

## Save version

New fields are required. Current save:

- `GameState.v` is `1`
- `localStorage` key is `slop-capitalist.v1` (`SAVE_KEY` in `src/data.ts`)

**Recommend:** keep the same `SAVE_KEY` (do not wipe Caleb’s save). Bump `GameState.v` to `2`. Hydrate in `loadGame`:

| Incoming save | `viewsThisRun` | `nextPrestigeAt` |
|---|---|---|
| Missing fields, never prestiged (`!tiktokUnlocked` and `prestigeMult === 1`) | `lifetimeViews` (keep first-bar progress) | `PRESTIGE_AT` |
| Missing fields, already prestiged | `0` (re-lock immediately) | `PRESTIGE_AT` or one scale step if you want a slightly longer second grind |
| `v >= 2` | use stored values | use stored values |

Leave an inflated `prestigeMult` as-is. Do not change the storage key unless you intentionally want a wipe.

---

## Implementation order

**P0 bug.** Put it at the top of the next implementation pass, before flavor.

When implementing (not now):

1. Add `viewsThisRun` + `nextPrestigeAt` to `GameState` / `newGame` / `loadGame`.
2. Increment `viewsThisRun` in `credit()`.
3. Change `canPrestige` to this-run vs `nextPrestigeAt`.
4. Change `prestige()` to pay this-run gain, zero `viewsThisRun`, raise `nextPrestigeAt`, then do the existing board reset.
5. Prestige UI: disabled + this-run progress; live-update in `patchMeters`.
6. Tests: after prestige, `canPrestige === false` and a second `prestige()` returns `0` / does not bump `prestigeMult`; earning this-run to the next bar unlocks once; old prestiged saves hydrate locked.

Do not implement that in this planning pass.
