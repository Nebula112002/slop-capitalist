# Slop Capitalist

Idle tycoon. Farm the algorithm. One cursed short at a time.

AdVenture Capitalist loop, content-farm costume. Browser toy that can grow into a product.

**Home:** this folder on the PC. **Port:** `8896`. Not the warehouse. Never `:3000`.

Own git repo. Do **not** fold into [d-ai](https://github.com/Nebula112002/d-ai).

## Play

```powershell
cd D:\AI\slop-capitalist
.\scripts\start.ps1
```

Local: http://127.0.0.1:8896  
Tailnet: https://calebscomputer.tailfdadcb.ts.net:8896

Dev (hot reload):

```powershell
.\scripts\start.ps1 -Dev
```

Stop: `.\scripts\stop.ps1`

## Toy v0

- Currency: **Views**
- Planet 1: YouTube (5 businesses)
- Managers (autopilot)
- x2 milestones at 25 / 50 / 100 / …
- Offline progress (managers only, 8h cap)
- Prestige at 1M lifetime views → unlock **TikTok**, keep a multiplier
- Save: `localStorage` key `slop-capitalist.v1`

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
