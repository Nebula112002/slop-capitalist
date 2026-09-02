# Slop Capitalist — agent notes

Own repo at `D:\AI\slop-capitalist`. Not d-ai source.

- **Port:** 8896. PC only. Never bind `:3000`.
- **Start:** `scripts\start.ps1` · **Stop:** `scripts\stop.ps1`
- **Save:** browser `localStorage` (`slop-capitalist.v1` plus per-username keys). Username only. No cloud.
- Theme is original (content-farm idle). Do not copy Hyper Hippo / ComputerLunch art, names, or passes.
- **No real brand names in player-facing text.** Planets are The Tube / The Feed / The Simulation. The `youtube` / `tiktok` ids are save data — never rename them.
- **No third-party runtime requests.** Fonts are self-hosted; do not add a CDN, analytics, or an ad SDK. `src/legal.test.ts` enforces both rules. Background: `docs/LEGAL-NOTES.md`.
- Keep the loop small: views, businesses, managers, milestones, prestige planets, Hype shop, idle chest.
- **Only managers auto-run.** An unmanaged row runs the one cycle it was tapped for. Do not "helpfully" restart rows.
- **Touching the UI?** Read `docs/DESIGN-SYSTEM.md` first — tokens, the fold budget, the render/patch split, a11y checklist, and the traps.
- Leftovers: `docs/OPUS.md` and monetization-do-not-touch. No Loopwright posts from this folder. No silent publish.
