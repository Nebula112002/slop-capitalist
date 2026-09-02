# Legal notes — what was fixed, what is still open

**I am not a lawyer and this is not legal advice.** It is an engineering record
of concrete compliance problems found in the code, what was changed, and what
is left that only a person (or a real lawyer) can decide. "Fully legally
compliant" is not a state a repository can be put into by an agent — several of
the remaining items are business decisions, and some depend on where you live
and where you publish.

Player-facing documents: [`PRIVACY.md`](PRIVACY.md), [`TERMS.md`](TERMS.md),
[`THIRD-PARTY.md`](THIRD-PARTY.md). In the game: **Menu → Privacy & legal**.

---

## Fixed

### 1. The game shipped other companies' trademarks as content

The two planets were named **YouTube** and **TikTok**, with **FYP** / "For You
page" as reward and copy text. Those are live registered marks belonging to
Google and ByteDance. Using them as level names in a distributed game is a
trademark problem, not a parody flourish — and you would have been submitting
Google's own trademark to Google Play.

Renamed to generic, invented names: **The Tube**, **The Feed**, **The
Simulation**; `Duet Chain` → `Mirror Chain`; `You Are The FYP` → `You Are The
Feed`; `Duet Storm` → `Mirror Storm`; `FYP Stamp` → `Feed Stamp`.

**The save-critical ids were deliberately left alone.** `PlanetId` is still
`"youtube" | "tiktok" | "simulation"` because those strings are written into
every save as `state.planet` and used as the keys of `state.businesses`, and
`"fyp"` is still a pass-tier id inside `state.pass.claimed`. Renaming them
would orphan real progress. Ids are internal and ship only as save data, not as
anything a player reads. `src/legal.test.ts` locks both halves: no brand name
in any player-facing string, and the ids frozen.

An already-earned title ("For You Farmer") stays in that player's save. It is
their earned string, and rewriting saves to fix a cosmetic label is worse than
leaving it.

### 2. Every page load told Google the player's IP address

`index.html` pulled three families from `fonts.googleapis.com` /
`fonts.gstatic.com`. A webfont request hands the third party the visitor's IP
address and user agent, which is a personal-data transfer with no consent and
no disclosure. A German court (LG München I, 3 O 17493/20) awarded damages over
exactly this pattern.

The fonts are now self-hosted (`scripts/fetch-fonts.mjs` vendors the Latin and
Latin-Extended subsets into `public/fonts/`). **The app now makes zero
third-party requests at runtime**, which is why there is no consent banner to
argue about. Both families are SIL OFL 1.1, which permits self-hosting provided
the licence and copyright notice travel with the files — so the script
downloads those too, and `THIRD-PARTY.md` credits them.

Three glyphs (`✕`, `◉`, `→`) fell outside the vendored subsets and would have
rendered as fallback or tofu; they were swapped for in-subset equivalents.

### 3. There was no privacy policy, terms, or attribution

Written, and — more importantly — surfaced **in the app**, not just in
markdown. A **Privacy & legal** sheet is reachable from the menu, from
settings, and from the landing footer. It states what is stored, that nothing is
transmitted, that nothing is for sale, how to export, how to delete, the font
attributions, the no-warranty position, and the no-affiliation statement.

### 4. "Delete my data" was not actually possible

`Reset save` only cleared the current player's key. A player who had used
several names, or who had a save from an older build, could not remove
everything. `clearAllLocalData()` prefix-scans `localStorage` and removes every
`slop-capitalist*` key — every save, every name, and the remembered route —
then drops back to the start screen. Combined with the existing JSON export,
access/portability and erasure are both real operations a player can perform,
which is the practical substance of GDPR Articles 15, 17 and 20.

### 5. Storage consent

Untouched, deliberately: `localStorage` is used only to keep the save the
player asked for. That is storage strictly necessary for the requested
functionality and is exempt from ePrivacy consent. Nothing is stored for
analytics or advertising, because neither exists. This is now stated plainly in
the policy instead of being merely true.

---

## Still open — needs a human

1. **The product name and genre.** "Slop Capitalist" sits in the same lane as
   *AdVenture Capitalist*. Game mechanics are not copyrightable, and
   "capitalist" is a common word, so the exposure is low — but names and trade
   dress are a judgment call, not a code change. `AGENTS.md` already forbids
   copying that game's art, names and passes; that rule still holds. The README
   no longer describes the game as an "AdVenture Capitalist loop".
2. **Governing law and jurisdiction.** `TERMS.md` intentionally has no
   choice-of-law clause. Pick one only if you distribute publicly, and pick it
   for where you actually are.
3. **The copyright holder.** `LICENSE` says "Caleb". If this is ever
   distributed, decide whether that should be a full legal name or an entity.
4. **Play Store submission is not a code task.** For the record, what it would
   need beyond this repository:
   - A developer account, app signing, and a **public HTTPS privacy policy
     URL** — the Play Console will not accept a local file. `PRIVACY.md` is
     written to be publishable as-is.
   - The **Data safety** declaration (answer: no data collected, no data
     shared) and the **IARC content rating** questionnaire. Both are
     self-declarations only you can make; both are enforced, so answer them
     honestly.
   - A target-audience declaration. There are no ads, purchases, social
     features or user content, which keeps the family-policy surface small.
   - A wrapper, because a page on `127.0.0.1:8896` is not a submittable
     artifact. A Trusted Web Activity is the natural fit — but it needs the
     game hosted on a public HTTPS origin plus Digital Asset Links
     verification, which changes the privacy answer above (a real web server
     will see IP addresses and keep logs). If you go that route, revisit
     `PRIVACY.md` section 6 first.
   - Play's billing rules only bite if you sell something. Do not start.
5. **Accessibility as law, not politeness.** The UI work already targets the
   usual WCAG basics (labels, focus order, focus trapping, contrast, reduced
   motion, target sizes). If this ever becomes a commercial service in the EU,
   the European Accessibility Act turns that from good practice into an
   obligation with documentation attached. The checklist in
   [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) is the starting point, not a
   conformance statement.
6. **Monetization stays untouched.** Out of scope by instruction, and every
   claim above ("nothing is for sale", "no ads", "no tracking") depends on it
   staying that way. Adding an ad SDK or a purchase would invalidate most of
   `PRIVACY.md` in one commit.

---

## What the tests guard

`src/legal.test.ts` fails if someone:

- puts a third-party brand name back into any player-facing string, or into the
  rendered farm, landing or menu on any planet;
- renames a save-critical id (`PLANET_IDS`, pass-tier ids, event ids, storage
  keys);
- reintroduces a font CDN or any other `https://` runtime request in
  `index.html`, `ui.ts`, `main.ts`, `game.ts` or `styles.css`;
- removes the bundled OFL licence texts;
- removes the "not affiliated" statement from the in-app legal sheet.

Run it with the rest: `npm test`.
