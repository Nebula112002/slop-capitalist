# Slop Capitalist

Idle tycoon. Farm the algorithm. One cursed short at a time.

AdVenture Capitalist loop, content-farm costume. Browser toy that can grow into a product.

**Home:** this folder on the PC. **Port:** `8896`. Not the warehouse. Never `:3000`.

**GitHub:** [Nebula112002/slop-capitalist](https://github.com/Nebula112002/slop-capitalist)  
Own git repo. Do **not** fold into [d-ai](https://github.com/Nebula112002/d-ai).

## Play

Double-click `START.bat`, or:

```powershell
cd D:\AI\slop-capitalist
.\scripts\start.ps1 -Open
```

Local: http://127.0.0.1:8896  
Tailnet: https://calebscomputer.tailfdadcb.ts.net:8896

The PC watchdog can keep it up via `D:\AI\scripts\ensure-slop-capitalist.ps1`.

Dev (hot reload):

```powershell
.\scripts\start.ps1 -Dev -Open
```

Stop: `.\scripts\stop.ps1`

## Toy v0

- Currency: **Views**
- Planets: YouTube → TikTok (1st prestige) → **The Simulation** (2nd prestige)
- **Tap a row's icon to post one clip.** Only a hired manager runs a farm on its own
- Income x2 at 25 / 50 / 100 / … · cycle time **halves at 25 / 100 / 400 / 1000** (floor 0.25s)
- Offline progress (managers only, 8h cap)
- Local-clock **Trend Drop** + free **Infinity Intern** pass (no ads, no IAP)
- Save: `localStorage` key `slop-capitalist.v1` plus per-username keys (`slop-capitalist.v1.<slug>`). Username only. No password.
- Prestige banks **Hype** (shop in the prestige sheet). First bar 1M this-run, then 1B, then The Simulation.
- Idle **comeback chest**: 25% of manager VPS on top of away earnings, ranks in settings.
- Rare jobs (managers, drop, pass, stats, settings) live in one menu sheet, not the dock.
- Installs like an app: web manifest, maskable icon, standalone display, no service worker on purpose.

You start with one cursed short. Tap its icon. Buy more. Hire a gremlin. Walk away.

## Working on the UI

Read [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) first — tokens, the
"list owns the fold" budget, component anatomy, the `renderApp` vs `patchMeters`
split, the a11y checklist, recipes, and the traps. What shipped and why is in
[`docs/PLAYTEST.md`](docs/PLAYTEST.md); the brief is
[`docs/OPUS.md`](docs/OPUS.md). Monetization: not this pass.

## Stack

Vite + TypeScript. No React. No backend. No ads.

```powershell
npm install
npm test
npm run dev
```

Health: `GET /api/health` → `{ ok, service: "slop-capitalist", port: 8896 }`

## Layout

This folder is gitignored by d-ai, same as `prison-warden-simulator` and `pa-church-daycare-app`. Commit here. Push to this repo's `origin`.
