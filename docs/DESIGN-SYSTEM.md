# Slop Capitalist — design system and build notes

Written so the next agent can extend the UI without re-deriving it. Brief:
[`docs/OPUS.md`](OPUS.md). What shipped and when: [`docs/PLAYTEST.md`](PLAYTEST.md).

Stack: Vite + TypeScript, no framework, no backend. `src/ui.ts` renders HTML
strings, `src/main.ts` owns state and handlers, `src/styles.css` owns every
pixel. `src/game.ts` is the simulation and **is not a UI file**.

---

## 1. The one rule: the list owns the fold

The farm list is the game. Everything else is a tax on it. Before shipping any
chrome, measure it:

```
node scripts/playtest-browser.mjs      # server must be up
```

It prints, on a 390×844 phone:

```
fold: 844px tall, chrome 127px top + 128px dock, 5 rows at 100px,
      5 fully visible, list owns 59% of the screen
```

**Budget:** top chrome ≤ ~130px, dock ≤ ~130px, all five rows fully visible,
list ≥ ~55% of the screen. If a change pushes chrome past that, it has to earn
it or go in the menu sheet. The measurement exists so this cannot rot quietly.

How the fold is enforced in CSS: `.camera` is a flex column and `.rows` is
`flex: 1 1 auto` with `grid-auto-rows: minmax(68px, 1fr)`. Rows stretch to fill
whatever is left and scroll when there is not enough. Anything added to the
camera must be `flex: 0 0 auto` (see `.tip`, `.strip`, `.farm-bar`).

---

## 2. Tokens

All in `:root` in `src/styles.css`. Use the variables, never raw hex.

| Role | Token | Rule |
|---|---|---|
| Primary action | `--mint` `#2ef2a8` | Buy, selected row, run button, active chip, `Slop` in the wordmark |
| Money | `--gold` `#ffd166` | Views, prestige meter, ready states, gold flags |
| Everything else | `--muted`, `--muted-2` | Chips, labels, locked rows, body copy |
| Surfaces | `--bg`, `--panel`, `--panel-2`, `--sunk` | `--sunk` is for insets (bars, inputs, icon wells) |
| Lines | `--line`, `--line-2` | `--line-2` is the stronger one, for controls |

**One accent.** If two things glow, the player does not know what to tap. Mint
is "you can act on this". Gold is "this is money or this is ready". Pink exists
in the tokens and is used only in the page background wash.

Radii: `--r-sm` 10 (chips, wells), `--r-md` 14 (rows, buttons, sheets bodies),
`--r-lg` 20 (HUD card, sheet card, inside card).

Type: `IBM Plex Sans` for UI, `IBM Plex Mono` (`--mono`) for every number the
player compares, `Bebas Neue` for the wordmark only. Numbers are always
`formatNum` / `formatTime` / `formatCycle` from `src/format.ts` — never raw.

---

## 3. Component anatomy

### HUD — `.hud`
Two parts. `.hud-brand` is the wordmark (home button), optional flavour title,
and the menu button. `.hud-body` is one card: `.hud-money` (big gold Views +
unit + `/s`), `.hud-goal` (prestige meter), and `.hud-meta` (a wrapping line of
`.hud-chip`s: Viral, Drop, Hype, Algo).

- `.hud-goal` sub-label is the **target**, not a percent. The meter carries
  progress. Ready adds `.is-ready` (gold edge + `readyGlow`).
- `.hud-meta` is `flex: 1 1 100%`, so it always takes its own line and wraps
  freely. This is where "where is my income coming from" gets answered.
- A gold corner dot (`.is-hot`) means "something inside is ready". Used on
  `.hud-menu` and `.hud-goal`.

### Farm row — `.frow`
Three columns, three **separate native buttons**. Never nest a control in a
control.

```
[ .frow-run 46px ] [ .frow-pick (flex) ] [ .frow-open 34px, selected only ]
      tap to post        tap to aim              drill in
```

`.frow-pick` is a `<button>` with an internal grid
(`"name tags" / "body body" / "foot foot"`) and `aria-pressed` for selection.
`body` is either the live pair (cycle bar + `/s`) when owned, or the business
blurb when not. `foot` is the rank countdown + cycle, or the price + cycle.

`.frow-run` has four states, from `runState()` in `ui.ts`:

| State | Means | Look |
|---|---|---|
| `is-ready` | owned, no manager, not running | mint edge + tint + `readyTap` pulse |
| `is-live` | running this cycle | mint edge, no pulse |
| `is-auto` | manager hired | plain edge + mint corner dot |
| `is-empty` | not owned | disabled, greyscale icon |

`aria-label` changes with the state (`Upload X` / `X is uploading` /
`Nudge X` / `X not owned yet`) — that label is the only thing a screen reader
gets, so keep it a verb.

**Open only renders on the selected row.** That is deliberate: it removes the
fat-finger target from the other four rows.

### Dock — `.dock`
Two lines, always. `.dock-modes` (a `.qty-rail` that scrolls horizontally plus
the `.chip-best` toggle), `.dock-hint` (one muted teaching line), then
`.dock-actions` with the single primary `.buy`.

- Quantity chip on-state is a mint **outline**. BEST on-state is a mint
  **fill**, because it takes over the primary. Same accent, different weight.
- Quantity and BEST are orthogonal. The chip stays lit in BEST mode because
  BEST really does buy that many. Do not re-couple them.
- `.dock-hint` is written by `dockHintText()`. It must never name a farm — that
  is how you end up with two BEST labels that disagree.
- Nothing else lives in the dock. Rare jobs go in the menu sheet.

### Sheet — `sheetShell()`
Every overlay goes through it, so they all behave the same:
`role="dialog" aria-modal`, `.sheet-head` (title + sub + `.sheet-x`), a
scrolling `.sheet-body`, and a full-bleed `.sheet-back` backdrop button.

`manageSheetFocus()` focuses the first control (or `[data-autofocus]`) when the
sheet **changes**, traps Tab, and closes on Escape. `renderApp` puts `inert` on
`.hud` and `.camera` while a sheet is open. The dock deliberately stays live so
`#toast-slot` can still announce.

Inside a sheet: `.list-block` (h3 + rows), `.list-row` (icon, `.list-copy`,
a `.pill` action), `.menu-row` (for the menu's destinations, with `.menu-flag`
when something is ready), `.card-stats` for number grids.

### Strips — `.strip`
A slim full-width button above the list, only when there is something to say.
`.strip-gold` is the comeback chest. Use a strip instead of a permanent header
row: it exists only while it is true.

### Landing — `.pitch`
Icon mark, wordmark, one-line pitch, `.mock` (an animated fake farm — pure CSS,
no game state), three `.pitch-points`, the `.field` + one `.buy-lg` primary,
other saves, footer. There is no farm chrome, no wallet, no dock.

---

## 4. Render architecture: two tiers

This is the part that bites people.

| | `renderApp()` | `patchMeters()` |
|---|---|---|
| When | state *shape* changes (buy, hire, sheet, route, planet) | every animation frame |
| Does | `root.innerHTML = ...` then rebinds every listener | writes text/classes into existing nodes |
| Cost | throws away focus and scroll | cheap, must stay cheap |

**Rules**

1. Anything that changes 60×/second (numbers, bar widths, button labels,
   enabled/disabled, run states) must be patched, never re-rendered.
2. Never call `renderApp` from a high-frequency handler. `onRun` patches and
   pulses on purpose — a rebuild would drop the button out from under the next
   tap.
3. Every patched node needs a stable `data-*` hook (`data-row-fill`,
   `data-inside-payout`, `data-dock-hint`, …). IDs are only for the handful of
   nodes tests already reference (`#views`, `#vps`, `#mult`, `#hype`, `#algo`,
   `#drop`, `#goal-bar`).
4. If you add a field to a row, add it in **both** `renderRows` and
   `patchOutsideRows`, or it will freeze at its first value.
5. Handlers are wired by attribute in `bindChrome`. Add the attribute, add one
   line there, done. `data-sheet-open="<MoreSheet>"` opens a sheet from
   anywhere, including inside another sheet.

---

## 5. Interaction and motion

- Minimum tap target 38px, primary 52px, row run button 46px. `button` has
  `touch-action: manipulation` globally (no double-tap zoom, no 300ms delay)
  and `body` has `overscroll-behavior: none` (no pull-to-refresh mid-tap).
- One control, one action. If a control needs a second action, add a sibling
  button, never a nested one.
- Motion is short and physical: `pop` (counter), `punch` (primary),
  `thump` (bought row), `gainFloat` (`+N` off the row), `sheetUp`, `readyTap`,
  `readyGlow`, `slide` (running bar). All defined at the bottom of the CSS.
- Every animation must survive `@media (prefers-reduced-motion: reduce)`, which
  collapses durations to ~0 globally. Never encode information in motion alone:
  the running bar also reads as full, the ready pulse also has a mint edge.
- **Bars under 0.4s do not animate per cycle.** `barRun()` swaps them to a
  steady `slide` shimmer and `cycleCopy()` labels the floor `0.25s min`. A
  4Hz strobe is not information.

---

## 6. Accessibility checklist

Copy this list when you touch the UI:

- [ ] New overlay goes through `sheetShell()` (dialog, focus, trap, Escape, backdrop)
- [ ] Background gets `inert` while modal (already handled by `renderApp`)
- [ ] Toggle reports `aria-pressed`; destination reports a real label
- [ ] Icon-only button has an `aria-label` that says the **verb**
- [ ] Decorative glyphs, bars and mock content are `aria-hidden="true"`
- [ ] Keyboard: arrows/Home/End walk the row list (`bindRowKeys`), Tab reaches
      every action, Escape backs out of a sheet and out of the inside card
- [ ] Focus is visible (`:focus-visible` ring is global — do not remove outlines)
- [ ] Nothing relies on colour alone

---

## 7. Copy voice

Dry, observational, a little mean about the algorithm. Never a dialogue tree,
never an apology, never a paragraph. Say the number.

- Good: `MAX spends it all. RANK stops at the next ×2.`
- Good: `Poster planet. The starter pays. The next copy is 1T+ views.`
- Bad: `Oops! Looks like you can't afford that yet 😅`

Honesty rules that are load-bearing:

- Do not claim income the player does not have. If something pays passively
  (the live drop), name it in `.hud-meta`.
- Never show a second BEST winner anywhere. The row badge is the truth and it
  comes from `adviseFarm(state, buyMode)` with the **live** chip.
- A disabled control says what it needs (`Needs 1B views this run`), not just
  a greyed label. Better still: hide it (see `farmHireAll`).
- The word "wipe" appears only when the player taps New run or Reset.

---

## 8. Recipes

**Add a sheet.** Add the key to `MoreSheet` in `ui.ts`, add a branch in
`renderSheet` returning `sheetShell({ key, title, sub, body, tall })`, then open
it from anywhere with `data-sheet-open="<key>"`. Nothing else to wire.

**Add a HUD chip.** Render a `.hud-chip` (a `<button>` if it goes somewhere)
inside `.hud-meta` with an `id`, and patch its text in `patchMeters`. See
`dropChip` / `#drop`.

**Add a row field.** Add the markup to the right grid area in `renderRows` with
a `data-row-*` hook, then patch it in `patchOutsideRows`.

**Add a quantity chip.** Extend `BUY_CHIPS`, `chipLabel`, `chipTitle`, and
`parseBuyMode` in `game.ts`. Add a case to `dockHintText` so it teaches itself.

**Regenerate app icons.** Edit `public/favicon.svg` (rounded, for the browser)
and/or `public/icon-maskable.svg` (full-bleed, mark inside the 80% safe circle),
then `node scripts/make-icons.mjs`. Playwright rasterises them; there is no
image toolchain to install.

---

## 9. Verification loop

```
npm test                          # 105 tests; ui.test.ts covers presentation
npm run build                     # tsc --noEmit + vite build
.\scripts\start.ps1               # preview serves dist, so build first
node scripts/playtest-browser.mjs # walks the whole flow, measures the fold
```

`ui.test.ts` is jsdom and asserts *presentation contracts*, not pixels: which
buttons exist, what they are labelled, what is inert, that the BEST badge
matches `adviseFarm` for all five chips, that the why-line names no farm. Add to
it when you add a surface — those tests are how the honesty rules stay true.

Screenshots land in `docs/playtest-landing.png` and `docs/playtest-home.png`.

---

## 10. Traps (each of these cost real time)

1. **`innerText` applies `text-transform`.** `.farm-name` is uppercased in CSS,
   so `innerText().includes("The Tube farm")` is false. The playtest has a
   `has()` helper that compares case-insensitively. Use it.
2. **`vite preview` serves `dist`.** `start.ps1` runs preview by default, so a
   source edit does nothing until `npm run build`. Use `start.ps1 -Dev` for hot
   reload.
3. **`loadGame` infers `prestigeCount` from `hype > 0`.** A hand-seeded save
   with Hype but zero prestiges silently becomes prestige 1, which moves the
   prestige bar to 1B. Keep seeded fields consistent with each other.
4. **Only managers auto-run.** `tick()` sets `running = true` for managed rows
   only; an unmanaged row runs the one cycle it was tapped for. Do not
   "helpfully" restart rows — that was a real bug that made managers cosmetic.
5. **The live drop always pays.** `tick()` credits `extraEventVps` regardless of
   what the player owns, and the event multiplies every farm. That is why
   `#drop` exists in the HUD. If you remove the chip, the wallet looks like the
   game plays itself.
6. **`rowVps` is 0 unless a row is managed or running**, so a fresh farm's `/s`
   and every rank ETA are legitimately blank. `adviseFarm` uses `potentialVps`
   instead, so BEST is unaffected — do not "fix" one with the other.
7. **`window.__slop` is DEV only.** It does not exist in a preview build; seed
   `localStorage` instead when you need a specific state.
8. **The boot splash hides via `#app:not(:empty) + #boot`.** If you move `#boot`
   away from being `#app`'s next sibling, it will never disappear.
9. **`renderApp` wipes `#toast-slot`.** Always `showToast` *after* `rebuild()`.
10. **No service worker, on purpose.** The manifest, icons, theme colour and
    standalone layout are all there, so it installs and looks like an app, but
    caching a bundle on a machine that rebuilds constantly is a staleness
    footgun. If you ever want the Android install banner, add a pass-through
    fetch handler and nothing more.
11. **No third-party requests, and no real brand names.** Fonts are vendored
    into `public/fonts` by `scripts/fetch-fonts.mjs` precisely so no player IP
    reaches a CDN; planets are The Tube / The Feed / The Simulation while the
    `youtube` / `tiktok` **ids** stay frozen because they are save data.
    `src/legal.test.ts` fails on either regression. Reasons:
    [`LEGAL-NOTES.md`](LEGAL-NOTES.md).
12. **Only the vendored Latin subsets exist.** A glyph outside them (`✕`, `◉`,
    `→` all were) falls back or shows tofu. Prefer `×`, `•`, `·`, `—`, `›`.

---

## 11. File map

| File | Owns |
|---|---|
| `src/ui.ts` | Every surface: landing, HUD, rows, dock, sheets, inside, patching, juice helpers |
| `src/styles.css` | Tokens, layout, components, keyframes, responsive, reduced motion |
| `src/main.ts` | State, handlers, route/sheet/selection, the frame loop, Escape |
| `src/game.ts` | Simulation, economy, BEST scoring, save hydration. **Not chrome.** |
| `src/format.ts` | `formatNum` / `formatTime` / `formatCycle` |
| `src/audio.ts` | Layered juice tones, keyed by `JuiceKind` |
| `src/data.ts` | Businesses, planets, shops, pass, constants, storage keys |
| `index.html` | Meta, manifest link, boot splash, safe-area viewport |
| `public/` | `favicon.svg`, `icon-maskable.svg`, generated PNGs, `manifest.webmanifest` |
| `scripts/make-icons.mjs` | SVG → PNG icon rasteriser |
| `scripts/playtest-browser.mjs` | Full-flow playtest + fold measurement |
