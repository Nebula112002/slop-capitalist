# Third-party notices — Slop Capitalist

Everything the game is built from, and what its licence requires.

Slop Capitalist itself is [MIT licensed](../LICENSE), © 2026 Caleb.

---

## Ships in the build

Only fonts. There is no runtime JavaScript dependency — no framework, no
library, no SDK. Everything else in `dist/` is this project's own source.

| Component | Copyright | Licence | Where |
|---|---|---|---|
| IBM Plex Sans | © 2017 IBM Corp., Reserved Font Name "Plex" | SIL Open Font License 1.1 | `public/fonts/plex-sans-*.woff2` |
| IBM Plex Mono | © 2017 IBM Corp., Reserved Font Name "Plex" | SIL Open Font License 1.1 | `public/fonts/plex-mono-*.woff2` |
| Bebas Neue | © 2010 Dharma Type | SIL Open Font License 1.1 | `public/fonts/bebas-neue-*.woff2` |

The OFL requires the licence and copyright notice to travel with the font
files, so the full texts are bundled beside them:

- `public/fonts/OFL-IBM-Plex.txt`
- `public/fonts/OFL-Bebas-Neue.txt`

The OFL also forbids selling the fonts on their own and reserves the names
"Plex" — neither of which this project does. The fonts are served from the same
origin as the game (see `scripts/fetch-fonts.mjs`), not from a font CDN, so no
third party is contacted at runtime.

**Emoji** used as farm icons are ordinary Unicode characters drawn by whatever
emoji font the player's own operating system provides. No emoji artwork is
copied or redistributed here.

**Sound** is generated at runtime with the Web Audio API. No sample, loop or
audio file is included or licensed.

---

## Build and test only — not distributed

These never reach a player. They are listed for completeness.

| Tool | Version | Licence |
|---|---|---|
| Vite | 6.4.3 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| Vitest | 3.2.7 | MIT |
| jsdom | 26.1.0 | MIT |
| Playwright | 1.62.1 | Apache-2.0 |

Run `npm ls --omit=dev` to confirm the shipped dependency tree is empty.

---

## Regenerating the fonts

```
node scripts/fetch-fonts.mjs
```

Downloads the Latin and Latin-Extended subsets, writes
`public/fonts/fonts.css`, and re-downloads both licence texts. Re-run it if you
add a weight or a family — and if you add a family, add its licence and its row
to the table above.
