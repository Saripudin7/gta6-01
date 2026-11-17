# Solmar Bay — Streets of Gold

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Saripudin7/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Saripudin7/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01) — a sun-soaked coastal city you explore on foot and by car, with traffic, pedestrians, a wanted level and police chases, five story missions, combat, shops and a living economy. Nothing here is from any commercial game: the city, characters, vehicles, names, story, art and sounds are all original.

## Play

Serve the `game/` folder with any static server and open `index.html` in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network requests — every file the game loads is under `game/`.

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move on foot, drive a car |
| Shift | Sprint |
| E | Steal the nearest car / exit a car / use a shop |
| Mouse | Aim |
| Left click | Fire your pistol |
| Space | Handbrake |
| M | Mission list |
| P / Esc | Pause |
| N | Mute |

## The game

You are Vex Marlowe, a driver fresh off the ferry in Solmar Bay. Work five jobs for Rico and the crew:

1. **First Wheels** — steal a car and bring it to Paint & Repair.
2. **The Pickup** — collect a package at the Old Pier, deliver it to the Safehouse.
3. **Hot Delivery** — a 90-second timed run to the North Docks, with heat on you.
4. **The Getaway** — lose a 3-star police response, then lay low at the Safehouse.
5. **Bayfront Job** — hold up Bayfront Bank and outrun the SPPD.

Crimes raise your wanted level (up to 5 stars) and the Solmar Police Department sends cruisers after you. Lose them to cool down, or pay $150 at Paint & Repair. Spend mission money at Rico's Motors (buy faster cars), Harbor Arms (ammo), St. Marina Hospital (treatment) and the Safehouse (save). Getting busted costs a $150 fine; getting wasted costs a $100 hospital bill.

## Systems

- **City** — a procedurally laid-out grid city (seeded): roads, crosswalks, building blocks, parks, a beach boardwalk and docks, pre-rendered once for speed.
- **Traffic & pedestrians** — cars follow lanes and turn at intersections; pedestrians walk the sidewalks and flee gunfire and speeding cars.
- **Wanted & police** — heat decays out of sight; cruisers spawn to match the star level, chase and ram, with flashing light bars and sirens.
- **Missions & story** — five linked jobs with markers, timers, armed rivals and payouts.
- **Economy** — money, car purchases, ammo, treatment, cop payoffs, pickups.
- **HUD** — live minimap with mission and police blips, wanted stars, health, ammo, speedometer, objective tracker and toasts.
- **Save** — progress saves at the Safehouse (localStorage) and after every mission.
- **Sound** — fully synthesized WebAudio: engine hum, sirens, gunshots, chimes.

## Layout

```
game/
  index.html          entry point (loads src/main.js)
  src/
    main.js           bootstrap, game loop, menus, save wiring
    config.js         constants, places, car models, mission defs
    random.js         seeded RNG
    input.js          keyboard + mouse
    audio.js          synthesized WebAudio sounds
    city.js           city generation + pre-rendered background
    vehicles.js       car physics, traffic AI, police driving AI
    pedestrians.js    pedestrian AI
    police.js         wanted system + cruiser spawning
    player.js         on-foot movement, stealing, combat
    missions.js       five story missions, rivals, bullets
    economy.js        shops, car lot, payoffs
    render.js         world rendering + camera
    hud.js            HUD, minimap, menus
    save.js           localStorage save/load
    shots.js          screenshot staging (?shot=)
main.ts               hands the game in (copies game/ + screenshots/, writes dossier.json)
vendor/makefun-game.ts  make.fun dossier library (kit copy, unchanged)
screenshots/         3–4 real browser renders of the game
```

Screenshots are staged with `?shot=start|drive|chase|foot&seed=N` — each one runs the real game forward from a staged state and sets `window.__shotReady`.

## License

MIT — see [LICENSE](LICENSE).
