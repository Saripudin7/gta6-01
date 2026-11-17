// Solmar Bay — pedestrians: ordinary people walking the sidewalks who run
// away from gunfire and from speeding cars. They give the city life and make
// reckless driving feel reckless.

import { WORLD, ROADS_X, ROADS_Y } from './config.js';
import { dist } from './random.js';

const SHIRTS = ['#e07a5f', '#81b29a', '#f2cc8f', '#6d9dc5', '#c77dff', '#e8e8e8', '#f4a259', '#90be6d'];
const PANTS = ['#2b2d42', '#4a4e69', '#6c584c', '#3a3a3a', '#5a6b7a'];

// Make one pedestrian standing on a sidewalk near (x, y).
export function makePed(rng, x, y) {
  return {
    x, y,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(38, 62),
    walkPhase: rng.range(0, Math.PI * 2),
    shirt: rng.pick(SHIRTS),
    pants: rng.pick(PANTS),
    skin: rng.pick(['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']),
    fleeing: 0,        // seconds left of panic
    fleeX: 0, fleeY: 0,
    targetX: x, targetY: y,
    wait: rng.range(0, 2),
  };
}

// Scatter pedestrians across the sidewalks, away from the player start.
export function spawnPeds(rng, count, playerX, playerY) {
  const peds = [];
  let guard = 0;
  while (peds.length < count && guard < count * 20) {
    guard += 1;
    const vertical = rng.chance(0.5);
    let x;
    let y;
    if (vertical) {
      x = rng.pick(ROADS_X) + rng.pick([-58, 58]);
      y = rng.range(80, WORLD.height - 80);
    } else {
      x = rng.range(80, 2860);
      y = rng.pick(ROADS_Y) + rng.pick([-58, 58]);
    }
    if (dist(x, y, playerX, playerY) < 260) continue;
    if (x > 2880) continue;
    peds.push(makePed(rng, x, y));
  }
  return peds;
}

// Pick a new strolling destination on a nearby sidewalk.
function pickStrollTarget(ped, rng) {
  const vertical = rng.chance(0.5);
  if (vertical) {
    const rx = rng.pick(ROADS_X);
    ped.targetX = rx + rng.pick([-58, 58]);
    ped.targetY = ped.y + rng.range(-260, 260);
  } else {
    const ry = rng.pick(ROADS_Y);
    ped.targetX = ped.x + rng.range(-260, 260);
    ped.targetY = ry + rng.pick([-58, 58]);
  }
  ped.targetX = Math.max(40, Math.min(2860, ped.targetX));
  ped.targetY = Math.max(40, Math.min(WORLD.height - 40, ped.targetY));
}

// A gunshot or a speeding car nearby sends a pedestrian running.
export function scarePeds(peds, x, y, radius) {
  for (const ped of peds) {
    if (dist(ped.x, ped.y, x, y) < radius) {
      ped.fleeing = 2.5;
      const dx = ped.x - x;
      const dy = ped.y - y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      ped.fleeX = ped.x + (dx / d) * 220;
      ped.fleeY = ped.y + (dy / d) * 220;
    }
  }
}

// Move every pedestrian. Fleeing ones sprint away; the rest stroll between
// sidewalk targets, pausing now and then like real people do.
export function updatePeds(peds, dt, rng, danger) {
  for (const ped of peds) {
    ped.walkPhase += dt * (ped.fleeing > 0 ? 14 : 7);
    if (ped.fleeing > 0) {
      ped.fleeing -= dt;
      const dx = ped.fleeX - ped.x;
      const dy = ped.fleeY - ped.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 8) {
        ped.angle = Math.atan2(dy, dx);
        ped.x += Math.cos(ped.angle) * 150 * dt;
        ped.y += Math.sin(ped.angle) * 150 * dt;
      }
      continue;
    }
    // A speeding car or a crash nearby is also scary.
    if (danger && dist(ped.x, ped.y, danger.x, danger.y) < danger.radius) {
      ped.fleeing = 2;
      ped.fleeX = ped.x + (ped.x - danger.x) * 2;
      ped.fleeY = ped.y + (ped.y - danger.y) * 2;
      continue;
    }
    if (ped.wait > 0) {
      ped.wait -= dt;
      continue;
    }
    const dx = ped.targetX - ped.x;
    const dy = ped.targetY - ped.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 12) {
      pickStrollTarget(ped, rng);
      if (rng.chance(0.25)) ped.wait = rng.range(0.5, 2.5);
      continue;
    }
    ped.angle = Math.atan2(dy, dx);
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
  }
}
