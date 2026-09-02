# Privacy policy — Slop Capitalist

**Last updated:** 2 September 2026

Short version: the game runs entirely in your browser, keeps your save on your
own device, and never sends anything anywhere. There is no account, no server,
no analytics, no advertising and no payment.

The same summary is in the game itself, under **Menu → Privacy & legal**.

---

## 1. What the game stores

All of it lives in your browser's `localStorage`, on the device you played on.

| Key | Contents |
|---|---|
| `slop-capitalist.v1.<name>` | One save per player name: views, farms owned, managers hired, prestige and Hype, shop levels, idle-chest rank, mute setting, earned title, play time and counters |
| `slop-capitalist.v1` | A legacy save from before player names existed. It is moved onto the first name you use, then removed |
| `slop-capitalist.users` | The player names you have typed, and which was used last |
| `slop-capitalist.ui` / `slop-capitalist.ui.<name>` | Which screen you were last on, so returning players skip the start screen |

The **player name** is whatever you type. It is a label for choosing a save. It
is never verified, never checked against anything, and never leaves the device.
There is no password and no email, because there is no account.

## 2. What the game does not do

- No data is transmitted off your device. There is no backend to transmit it to.
- No analytics, telemetry, crash reporting, fingerprinting or session recording.
- No advertising, ad SDK, advertising identifier or tracking cookie.
- No purchases, in-app currency for sale, subscriptions or payment processing.
- No requests to any third party at runtime. Fonts are bundled with the game
  rather than loaded from a font CDN, so no third party is told your IP address
  when the page opens.
- No microphone, camera, location, contacts, files, notifications or clipboard
  reading. The only sound is short tones generated in the browser.
- No accounts, chat, messaging, multiplayer, leaderboards or user-generated
  content, so there is nothing for anyone else to see.

## 3. Cookies and similar technology

The game sets no cookies. It uses `localStorage` for one purpose: keeping the
save you asked it to keep. That is storage strictly necessary to provide the
functionality you requested, which is why there is no consent banner. Nothing
is stored for analytics or advertising, because neither exists here.

## 4. Your data and your control

Because the data never leaves your device, you already hold all of it. In
practice:

- **Access and portability** — *Settings → Copy export* gives you the entire
  save as readable JSON.
- **Erasure** — *Settings → Reset this save* deletes the current player's save.
  *Privacy & legal → Delete all* deletes every save, every player name and the
  remembered screen. Both are immediate and unrecoverable.
- **Everything else** — clearing site data in your browser removes the game's
  storage completely, as it would for any site.

There is no request to make and nobody to make it to: the developer never
receives your data and cannot access, restore or export it for you.

## 5. Children

The game collects no personal data from anyone, of any age. It has no ads, no
purchases, no social features and no user-generated content. It is a satire of
algorithmic video platforms, so the humour is aimed at adults, but nothing in it
is age-gated and nothing about a player is recorded.

## 6. Where it runs

This build is served from a single personal computer at `http://127.0.0.1:8896`
and, optionally, over a private Tailscale network to that same machine. It is
not published on the public internet. A web server may keep ordinary,
short-lived access logs the way any web server does; that is the operator's own
machine, not a service run by this project.

## 7. Changes

Any change to what is stored will be reflected here and in the in-game
**Privacy & legal** screen. The version history of this file is the changelog.

## 8. Contact

This is a personal project with no support organisation. Questions go to the
repository owner: <https://github.com/Nebula112002/slop-capitalist>.
