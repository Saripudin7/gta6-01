// Solmar Bay — Vex Marlowe on foot: walking, running, stealing cars, and
// pistol combat. Aiming follows the mouse; the player fires with a click.

import { PLAYER, PRICES } from './config.js';
import { clamp, dist, angleDiff } from './random.js';
import { clampToWorld, isInSea } from './city.js';
import { driveCar, carsOverlap, separateCars } from './vehicles.js';
import { scarePeds } from './pedestrians.js';
import { addHeat } from './police.js';

// Find the nearest car the player could steal (parked or traffic, not police).
export function nearestStealableCar(state) {
  const p = state.player;
  let best = null;
  let bestD = 70;
  for (const car of state.cars) {
    if (car.dead || car.driver === 'police') continue;
    const d = dist(p.x, p.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// Try to steal the nearest car. Returns the car or null.
export function tryStealCar(state) {
  const car = nearestStealableCar(state);
  if (!car) return null;
  const p = state.player;
  p.inCar = car;
  car.driver = 'player';
  car.parked = false;
  car.speed = 0;
  p.x = car.x;
  p.y = car.y;
  state.sound.click();
  addHeat(state, 12, 'car theft');
  state.toast('You took the ' + car.name + '. The SPPD noticed.', 'bad');
  return car;
}

// Step out of the car, on the driver's side.
export function exitCar(state) {
  const p = state.player;
  const car = p.inCar;
  if (!car) return;
  p.x = car.x - Math.sin(car.angle) * 26;
  p.y = car.y + Math.cos(car.angle) * 26;
  p.angle = car.angle;
  p.inCar = null;
  car.driver = 'parked';
  car.speed = 0;
  state.sound.click();
}

// Fire the pistol at the mouse position. Spawns a tracer bullet and scares
// nearby pedestrians. Returns true when a shot was actually fired.
export function tryShoot(state) {
  const p = state.player;
  if (p.inCar || p.ammo <= 0 || p.fireTimer > 0) return false;
  p.ammo -= 1;
  p.fireTimer = PLAYER.fireDelay;
  const angle = Math.atan2(state.input.mouseWorldY - p.y, state.input.mouseWorldX - p.x);
  p.angle = angle;
  state.bullets.push({
    x: p.x + Math.cos(angle) * 18,
    y: p.y + Math.sin(angle) * 18,
    vx: Math.cos(angle) * 780,
    vy: Math.sin(angle) * 780,
    life: PLAYER.pistolRange / 780,
    damage: PLAYER.pistolDamage,
    fromPlayer: true,
  });
  state.sound.shot();
  state.muzzle = 0.06;
  scarePeds(state.peds, p.x, p.y, 320);
  // Shooting in public is a crime.
  addHeat(state, 6, 'shots fired');
  return true;
}

// Move bullets, test hits against rivals, cars and the player, and spawn
// little impact sparks. Returns 'playerDead' when a rival bullet kills Vex.
export function updateBullets(state, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    if (b.fromPlayer) {
      for (const rival of state.rivals) {
        if (rival.dead) continue;
        if (dist(b.x, b.y, rival.x, rival.y) < 16) {
          rival.health -= b.damage;
          b.dead = true;
          state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#ffdd55', size: 4 });
          if (rival.health <= 0) {
            rival.dead = true;
            state.player.money += 25;
            state.toast('Rival down. +$25 picked up.', 'good');
            state.sound.cash();
          }
          break;
        }
      }
      if (b.dead) continue;
      for (const car of state.cars) {
        if (car.dead || car.driver === 'player') continue;
        const dx = b.x - car.x;
        const dy = b.y - car.y;
        const along = Math.abs(dx * Math.cos(car.angle) + dy * Math.sin(car.angle));
        const across = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
        if (along < car.length / 2 && across < car.width / 2) {
          b.dead = true;
          state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.2, max: 0.2, color: '#ffb347', size: 4 });
          break;
        }
      }
    } else {
      // Rival bullets can hit Vex on foot or his car.
      const p = state.player;
      const tx = p.inCar ? p.inCar.x : p.x;
      const ty = p.inCar ? p.inCar.y : p.y;
      if (dist(b.x, b.y, tx, ty) < (p.inCar ? 24 : 13)) {
        b.dead = true;
        if (p.inCar) {
          p.inCar.speed *= 0.7;
        } else {
          hurtPlayer(state, b.damage);
        }
        state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.2, max: 0.2, color: '#ef476f', size: 4 });
      }
    }
  }
  state.bullets = state.bullets.filter((b) => !b.dead);
  if (state.player.health <= 0) return 'playerDead';
  return null;
}

// Hurt the player (on foot). Armour is not a thing in Solmar Bay: health is
// health, and the hospital is the only way back up.
export function hurtPlayer(state, damage) {
  const p = state.player;
  if (p.invuln > 0) return;
  p.health -= damage;
  p.invuln = 0.25;
  state.sound.thud();
  if (p.health <= 0) p.health = 0;
}

// The per-frame player update: on foot or driving, plus shooting.
export function updatePlayer(state, dt) {
  const p = state.player;
  const input = state.input;
  p.fireTimer = Math.max(0, p.fireTimer - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  state.muzzle = Math.max(0, state.muzzle - dt);

  if (p.inCar) {
    const car = p.inCar;
    const axis = input.moveAxis();
    const throttle = -axis.y; // W is forward
    const steer = axis.x;
    const handbrake = input.held('Space');
    const prevSpeed = Math.abs(car.speed);
    driveCar(car, throttle, steer, dt, handbrake);
    if (handbrake && prevSpeed > 180) state.sound.skid();
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    // Car-to-car bumps.
    for (const other of state.cars) {
      if (other === car || other.dead) continue;
      if (carsOverlap(car, other)) {
        separateCars(car, other);
        if (Math.abs(car.speed) > 140) {
          state.sound.thud();
          addHeat(state, 4, 'hit and run');
        }
      }
    }
    // Running over a pedestrian is a serious crime.
    for (const ped of state.peds) {
      if (dist(car.x, car.y, ped.x, ped.y) < 22 && Math.abs(car.speed) > 60) {
        ped.fleeing = 3;
        ped.fleeX = ped.x + (ped.x - car.x) * 3;
        ped.fleeY = ped.y + (ped.y - car.y) * 3;
        addHeat(state, 10, 'hit a pedestrian');
      }
    }
    if (input.pressed('KeyE')) exitCar(state);
    return;
  }

  // On foot: WASD moves, Shift runs, mouse aims, click shoots.
  const axis = input.moveAxis();
  const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y) || 1;
  const speed = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  p.x += (axis.x / len) * speed * dt * (axis.x || axis.y ? 1 : 0);
  p.y += (axis.y / len) * speed * dt * (axis.x || axis.y ? 1 : 0);
  if (axis.x || axis.y) {
    p.moveAngle = Math.atan2(axis.y, axis.x);
    p.walking = true;
    p.walkPhase += dt * (input.running() ? 13 : 9);
  } else {
    p.walking = false;
  }
  // Aim at the mouse.
  p.angle = Math.atan2(input.mouseWorldY - p.y, input.mouseWorldX - p.x);
  const clamped = clampToWorld(p.x, p.y);
  p.x = clamped.x;
  p.y = clamped.y;
  // The sea is a wall for a pedestrian.
  if (isInSea(p.x, p.y)) p.x = 3036;
  if (input.mouseDown || input.mouseClicked) tryShoot(state);
  if (input.pressed('KeyE')) tryStealCar(state);
}
