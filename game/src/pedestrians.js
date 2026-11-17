// Pedestrians: they walk the sidewalks, cross at intersections, and flee
// from gunfire and from speeding cars. Running one over is a crime.
import { WORLD_W, WORLD_H, BLOCK, ROAD_W } from './config.js';
import { range, int, clamp, dist2 } from './random.js';
import { hitBuilding, resolveBuildingCollision } from './city.js';

const SHIRTS = ['#e07a5f', '#81b29a', '#e8c15a', '#9a8c98', '#5b7fa6', '#d97b2b', '#f4f1de', '#7d9b76'];
const SKINS = ['#e8b88a', '#c98d5f', '#8a5a3b', '#f0c8a0'];

export function spawnPedestrians(state, count) {
  const rng = state.rng;
  for (let i = 0; i < count; i++) {
    const x = range(rng, 80, WORLD_W - 80);
    const y = range(rng, 80, WORLD_H - 80);
    if (hitBuilding(state.city, x, y, 14)) continue;
    state.peds.push({
      x,
      y,
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 26, 48),
      shirt: SHIRTS[int(rng, 0, SHIRTS.length - 1)],
      skin: SKINS[int(rng, 0, SKINS.length - 1)],
      state: 'walk',
      panic: 0,
      wanderTimer: range(rng, 2, 6),
      targetX: undefined,
      targetY: undefined,
      dead: false,
      hitFlash: 0,
    });
  }
}

export function updatePedestrians(state, dt) {
  const p = state.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  const danger = state.bullets.length > 0 || state.wantedStars >= 2;

  for (const ped of state.peds) {
    if (ped.dead) continue;
    if (ped.hitFlash > 0) ped.hitFlash -= dt;
    const dPlayer = Math.hypot(ped.x - px, ped.y - py);

    // Flee when the player is dangerous or closing fast in a car.
    if ((danger && dPlayer < 260) || (p.inCar && dPlayer < 90)) {
      ped.state = 'flee';
      ped.panic = 1.2;
    }
    if (ped.panic > 0) ped.panic -= dt;

    if (ped.state === 'flee') {
      const away = Math.atan2(ped.y - py, ped.x - px);
      ped.angle = away;
      ped.x += Math.cos(away) * 150 * dt;
      ped.y += Math.sin(away) * 150 * dt;
      if (ped.panic <= 0) ped.state = 'walk';
    } else {
      ped.wanderTimer -= dt;
      if (ped.wanderTimer <= 0) {
        ped.wanderTimer = range(state.rng, 2, 7);
        // Pick a new stroll along the nearest sidewalk line.
        const vertical = state.rng() < 0.5;
        const road = Math.round((vertical ? ped.x : ped.y) / BLOCK) * BLOCK;
        const side = state.rng() < 0.5 ? -1 : 1;
        const offset = ROAD_W / 2 + 10;
        if (vertical) {
          ped.targetX = road + side * offset;
          ped.targetY = ped.y + range(state.rng, -260, 260);
        } else {
          ped.targetX = ped.x + range(state.rng, -260, 260);
          ped.targetY = road + side * offset;
        }
      }
      if (ped.targetX !== undefined) {
        const dx = ped.targetX - ped.x;
        const dy = ped.targetY - ped.y;
        const d = Math.hypot(dx, dy);
        if (d > 6) {
          ped.angle = Math.atan2(dy, dx);
          ped.x += (dx / d) * ped.speed * dt;
          ped.y += (dy / d) * ped.speed * dt;
        }
      }
    }
    ped.x = clamp(ped.x, 16, WORLD_W - 16);
    ped.y = clamp(ped.y, 16, WORLD_H - 16);
    resolveBuildingCollision(state.city, ped, 8);

    // Run over by a moving car.
    for (const car of state.cars) {
      if (car.dead || Math.abs(car.speed) < 60) continue;
      if (dist2(ped.x, ped.y, car.x, car.y) < 26 * 26) {
        killPed(state, ped, car);
        break;
      }
    }
  }
  state.peds = state.peds.filter((ped) => !ped.dead);
  // Keep the streets populated.
  if (state.peds.length < 46 && state.rng() < 0.05) spawnPedestrians(state, 2);
}

export function killPed(state, ped, byCar) {
  ped.dead = true;
  state.addParticles(ped.x, ped.y, 10, ped.shirt);
  if (byCar && byCar === state.player.car) {
    state.addWanted(0.7, 'Ran over a pedestrian');
  }
}

export function shootPed(state, ped) {
  ped.dead = true;
  state.addParticles(ped.x, ped.y, 10, '#c0392b');
}
