// The player: on-foot movement and combat, stealing and driving cars,
// health and ammo. Stealing a stranger's car is a crime; your own cars
// (bought at Rico's) are free to take.
import { WORLD_W, WORLD_H } from './config.js';
import { clamp, dist2 } from './random.js';
import { resolveBuildingCollision, hitBuilding } from './city.js';
import { updateCarPhysics } from './vehicles.js';
import { addWanted } from './police.js';

export function createPlayer(state) {
  return {
    x: 560,
    y: 640,
    angle: -Math.PI / 2,
    onFoot: true,
    inCar: false,
    car: null,
    health: 100,
    maxHealth: 100,
    ammo: 24,
    aimAngle: 0,
    fireCooldown: 0,
    hurtFlash: 0,
    walkCycle: 0,
    moving: false,
  };
}

export function nearestStealableCar(state, maxDist = 70) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of state.cars) {
    if (car.dead || car.police) continue;
    const d = dist2(state.player.x, state.player.y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(state, car) {
  const p = state.player;
  p.inCar = true;
  p.onFoot = false;
  p.car = car;
  car.ai = null;
  state.stats.carsStolen++;
  if (state.ownedCars.includes(car.id)) {
    state.showToast(`Driving your ${car.name}.`);
  } else {
    addWanted(state, 1, 'Stole a car');
    state.showToast(`Stole a ${car.name}! The cops noticed.`);
  }
  state.audio.click();
}

export function exitCar(state) {
  const p = state.player;
  if (!p.car) return;
  const car = p.car;
  car.speed = 0;
  // Step out to the side of the car.
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 26;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 26;
  p.angle = car.angle;
  p.inCar = false;
  p.onFoot = true;
  p.car = null;
}

export function fireBullet(state) {
  const p = state.player;
  if (p.fireCooldown > 0 || p.ammo <= 0) return;
  p.ammo--;
  p.fireCooldown = 0.28;
  const a = p.aimAngle;
  state.bullets.push({
    x: p.x + Math.cos(a) * 18,
    y: p.y + Math.sin(a) * 18,
    vx: Math.cos(a) * 780,
    vy: Math.sin(a) * 780,
    life: 0.9,
    fromPlayer: true,
  });
  state.audio.shot();
  state.addParticles(p.x + Math.cos(a) * 22, p.y + Math.sin(a) * 22, 3, '#ffd34d');
  if (state.wantedStars < 1) addWanted(state, 0.6, 'Fired a weapon in public');
}

export function updatePlayer(state, dt, input, pressed) {
  const p = state.player;
  if (p.fireCooldown > 0) p.fireCooldown -= dt;
  if (p.hurtFlash > 0) p.hurtFlash -= dt;

  // Aim with the mouse: screen space back into world space.
  const cam = state.camera;
  const worldMouseX = cam.x + input.mouse.x / cam.zoom;
  const worldMouseY = cam.y + input.mouse.y / cam.zoom;
  if (p.onFoot) p.aimAngle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);

  // Enter / exit a car.
  if (pressed.has('interact')) {
    if (p.inCar) {
      exitCar(state);
    } else {
      const car = nearestStealableCar(state);
      if (car) enterCar(state, car);
    }
  }

  if (p.inCar && p.car) {
    const throttle = (input.keys.has('up') ? 1 : 0) + (input.keys.has('down') ? -0.7 : 0);
    const steer = (input.keys.has('left') ? -1 : 0) + (input.keys.has('right') ? 1 : 0);
    updateCarPhysics(state, p.car, dt, { throttle, steer, brake: input.keys.has('brake') });
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    state.audio.setEngine(Math.abs(p.car.speed) / p.car.topSpeed, true);
    return;
  }

  state.audio.setEngine(0, false);
  // On foot: WASD movement, Shift to sprint.
  let mx = (input.keys.has('right') ? 1 : 0) - (input.keys.has('left') ? 1 : 0);
  let my = (input.keys.has('down') ? 1 : 0) - (input.keys.has('up') ? 1 : 0);
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  if (len > 0) {
    mx /= len;
    my /= len;
    const speed = input.keys.has('sprint') ? 250 : 165;
    const nx = p.x + mx * speed * dt;
    const ny = p.y + my * speed * dt;
    if (!hitBuilding(state.city, nx, p.y, 10)) p.x = nx;
    if (!hitBuilding(state.city, p.x, ny, 10)) p.y = ny;
    p.x = clamp(p.x, 16, WORLD_W - 16);
    p.y = clamp(p.y, 16, WORLD_H - 16);
    resolveBuildingCollision(state.city, p, 10);
    p.angle = Math.atan2(my, mx);
    p.walkCycle += dt * 10;
  }

  // Shoot with the mouse.
  if (input.mouse.down) fireBullet(state);

  // Pick up cash, health and ammo lying around.
  for (const pk of state.pickups) {
    if (pk.dead) continue;
    if (dist2(p.x, p.y, pk.x, pk.y) >= 30 * 30) continue;
    pk.dead = true;
    if (pk.kind === 'cash') {
      state.money += pk.amount;
      state.showToast(`+$${pk.amount}`);
    } else if (pk.kind === 'health') {
      p.health = Math.min(p.maxHealth, p.health + 40);
      state.showToast('Health +40');
    } else {
      p.ammo += 24;
      state.showToast('Ammo +24');
    }
    state.audio.pickup();
  }
  state.pickups = state.pickups.filter((pk) => !pk.dead);
}

export function damagePlayer(state, amount, source) {
  const p = state.player;
  if (p.hurtFlash > 0.35) return;
  p.health = Math.max(0, p.health - amount);
  p.hurtFlash = 0.5;
  state.showToast(`Hit by ${source}!`);
}
