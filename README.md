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
- Managers (autopilot), plus a **Mgrs** dock tab
- Income x2 at 25 / 50 / 100 / … · cycle time **halves at 25 / 100 / 400 / 1000** (floor 0.25s)
- Offline progress (managers only, 8h cap)
- Local-clock **Trend Drop** + free **Infinity Intern** pass (no ads, no IAP)
- Save: `localStorage` key `slop-capitalist.v1` (hydrate, no wipe)

You start with one cursed short. Tap the bar. Buy more. Hire a gremlin. Walk away.

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
