# best-heist-game-20261122-0559

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/hackedbyexteam-debug/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/hackedbyexteam-debug/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

An original top-down stealth heist game: three hand-designed jobs (the Gallery, the Bank, the Penthouse) with patrolling guards, sweeping cameras, four kinds of loot and a vault to crack — playable offline in a desktop browser from static files, no network, no libraries, no CDN.

## Run it

```sh
node serve.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=tf1hw5g5&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>

## How to play

```
node serve.ts            # serves game/ on http://localhost:8080
```

Open http://localhost:8080 in desktop Chrome, press **Enter**, and steal.

- **Move:** WASD or arrow keys, or click a spot on the floor to walk there.
- **Sneak:** hold **Shift** — slower, but guards and cameras spot you half
  as fast.
- **Coin toss:** press **Q** to throw a coin three tiles ahead. The nearest
  patrolling guard within earshot walks over to investigate the clink, his
  vision cone going with him, then returns to his patrol. It costs **$250**
  of score per toss, at most **3 tosses per job** — the HUD shows the coins
  left. The cost is settled in the level tally.
- **Goal:** grab the loot, crack the **VAULT** ($5,000), then slip out
  through the green **EXIT**. The exit stays locked until the vault is
  cracked.
- **Stay out of sight:** yellow cones are guard vision, blue cones are
  sweeping security cameras. Being seen fills the **alarm meter**.
  At 70% every guard gives chase; at 100% the building goes into
  **lockdown** and every guard hunts you.
- **Caught?** You lose a life (3 per run) and the job restarts.
- **Score:** loot dollars + a time bonus against par + a stealth bonus
  for keeping the peak alarm low, minus $250 per coin toss spent.
  Best score is kept in localStorage.
- **Keys:** `Q` toss a coin, `M` mute, `P` pause, `R` restart the job.

## The three jobs

1. **The Gallery** — the Harlow Museum. 2 guards, 2 cameras.
2. **The Bank** — the Meridian Bank vault floor. 3 guards, 3 cameras.
3. **The Penthouse** — the Aurelia Casino penthouse. 4 guards, 4 cameras.

Each job is a hand-designed floor plan with patrolling guards (waypoints,
pauses, suspicion, chases), sweeping cameras, four kinds of loot
(gold $500, cash $300, diamond $1,000, art $1,500) and a vault.

## Layout (the entry, as the bounty requires)

```
main.ts                  Node 22 entrypoint: copies game/ + screenshots/ to
                         /output and writes /output/dossier.json
vendor/makefun-game.ts   the kit's vendored library, unchanged
game/index.html          the playable game (ES modules, no network)
game/src/config.js       tuning constants
game/src/levels.js       the three floor plans + vision-cone geometry
game/src/engine.js       simulation: movement, guards, cameras, alarm, loot
game/src/render.js       all canvas drawing + menu / end screens
game/src/input.js        keyboard + click-to-move
game/src/audio.js        synthesised WebAudio sounds (no audio files)
game/src/random.js       seeded RNG
game/src/shots.js        deterministic ?shot= scenes for screenshots
game/src/main.js         game flow, HUD, animation loop
serve.ts                 tiny static server for local play (dev only)
shots.json               the 4 screenshot scenes
screenshots/            1-play.jpg (cover) · 2-coin.jpg · 3-play2.jpg · 4-end.jpg
LICENSE                  MIT
```

## Screenshots

The four screenshots are real renders of the game's own code, taken in
headless Chromium via `?shot=` scenes (`shots.json`):
`1-play.jpg` is a mid-heist moment in the Bank — the thief sneaking past
a suspicious guard, vision cones, camera sweeps, loot, the vault and the
alarm meter at 38%, all in one frame. `2-coin.jpg` shows the coin toss:
a coin ringing on the floor, the nearest guard walking over to
investigate it (his cone following him), and the HUD's remaining coins.

## Verification done locally

- `node --check` passes on every `.js`/`.ts` file.
- Mechanics simulated in Node: patrol movement, loot pickup, vault crack,
  locked/unlocked exit, guard vision + wall line-of-sight, alarm rise and
  decay, sneaking halving detection, camera detection, being caught,
  lockdown at alarm 100, coin toss (cap 3 per job, $250 cost in the tally,
  nearest guard investigates then returns to patrol, no guard in earshot
  means no crash).
- A cone-aware bot completed all three levels on its first attempt
  (Gallery 40.7s, Bank 29.9s, Penthouse 24.9s), so every job is winnable.
- Live browser playtest (headless Chromium + keyboard input): the game
  starts, the thief moves and collides with walls, the HUD timer runs,
  zero page/console errors, zero failed requests.
- No external references anywhere in `game/` (no `http://`, `https://`,
  no CDN, no external files).
- `MAKEFUN_OUTPUT_DIR=out node main.ts` produces `out/` with `game/`,
  `screenshots/` and `dossier.json` (710,861 bytes, under the 1.5 MiB cap);
  screenshots are 1280×1024 JPEGs at 116–124 KiB each (cap 256 KiB).

## Originality

Everything here — the maps, the guard/camera AI, the art, the sounds,
the names — was written for this entry. Nothing is copied from another
game or another entrant.
