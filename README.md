# Solmar Bay — Streets of Gold

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Saripudin7/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Saripudin7/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game that runs offline in a desktop browser.
Vex Marlowe steps off the ferry in Solmar Bay — a sun-soaked coastal city
of grid streets, a beach boardwalk, an old pier and the North Docks — with
$120, a pistol and a phone number for a fixer named Rico. Five story jobs
stand between him and the gold in Bayfront Bank, and the Solmar Bay Police
Department stands between him and all of it.

## How to play

Serve the game and open it in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network request, no external assets: every file the game
loads lives under `game/`, and every sound is synthesized live with WebAudio.
A saved game is kept in `localStorage` — save at the Safehouse, or finish a
mission, and your cash, health, ammo and progress will be waiting for you.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Walk, or drive the car |
| Mouse | Aim the pistol (on foot) |
| Left click | Shoot |
| E | Steal / enter / exit a car, use a shop, grab a package |
| Hold E | Crack the bank vault |
| Space | Handbrake |
| Shift | Run on foot |
| P / Esc | Pause |
| M | Mission list (press 1–5 to start a job) |
| N | Mute / unmute sound |

## The story

1. **First Wheels** — steal any car on the street and bring it to Paint
   & Repair so Rico's crew can make it clean.
2. **The Pickup** — collect a package at the Old Pier and deliver it to
   the Safehouse, past the rival watching the docks.
3. **Hot Delivery** — ninety seconds to the North Docks, with the SPPD
   joining the chase halfway there.
4. **The Getaway** — three stars and the whole department awake. Lose
   them, then get back to the Safehouse in one piece.
5. **Bayfront Job** — hold the floor at Bayfront Bank, crack the vault,
   and outrun a three-star response with the gold.

## Systems

- **A living city.** A seeded procedural grid: roads, zebra crossings,
  building blocks, parks, the Marina Plaza fountain, the beach, the
  boardwalk and the pier. The same seed always builds the same city.
- **Traffic and pedestrians.** Cars follow the road grid, keep their
  lane and turn at intersections. Pedestrians stroll the sidewalks and
  run from gunfire and speeding cars.
- **Wanted level, 0–5 stars.** Theft, shootings and hit-and-runs raise
  the heat; it cools when no cruiser can see you. Cruisers spawn to
  match the stars, chase, ram, flash their strobes and wail their
  sirens. Get caught on foot and you pay a $150 fine; go down and St.
  Marina charges you $100.
- **Combat.** A pistol aimed with the mouse, rival gunmen who fire in
  bursts at the pier and the bank, and tracer bullets with impact
  sparks.
- **Economy.** Buy cars at Rico's Motors, ammo at Harbor Arms, treatment
  at St. Marina Hospital, a fresh paint job at Paint & Repair to lose
  the heat, and save for free at the Safehouse.
- **HUD.** Wanted stars, health, cash, ammo, a speedometer, an
  objective tracker, toasts, and a live minimap with the mission
  diamond, police blips and shop markers.
- **Sound.** Engine hum, two-tone sirens, gunshots, skid squeals,
  mission chimes and cash-register ka-chings — all synthesized, no
  audio files.

## Layout

```text
game/
  index.html          the page: canvas + module script
  src/
    config.js         constants, places, car models, mission defs
    random.js         seeded RNG
    input.js          keyboard + mouse
    audio.js          synthesized WebAudio sounds
    city.js           city generation + prerendered background
    vehicles.js       driving physics, traffic AI, police driving
    pedestrians.js    pedestrian AI
    police.js         wanted system + cruiser spawning
    player.js         walking, stealing, pistol combat
    missions.js       the five story missions + rival gunmen
    economy.js        shops, the car lot, fines and bills
    render.js         world + camera rendering
    hud.js            HUD, minimap and menus
    save.js           localStorage save / load
    shots.js          screenshot staging (?shot= + __shotReady)
    main.js           bootstrap, game loop, screens
main.ts               copies game/ + screenshots/ to /output, writes dossier.json
serve.ts              tiny static server for local play
screenshots/          four real in-browser renders of the game
```

Screenshots are staged with `?shot=cover|drive|chase|foot&seed=…`; each
scene plays the real game forward and sets `window.__shotReady` when the
frame is drawn.

## License

MIT — see [LICENSE](LICENSE). Solmar Bay, Vex Marlowe, Rico and the SPPD
are original creations; nothing here comes from any commercial game.
