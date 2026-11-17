// Vehicles: arcade car physics, traffic AI that follows the road grid, and
// spawning of traffic, parked cars and police cruisers.
import { WORLD_W, WORLD_H, BLOCK, ROAD_W, CAR_MODELS } from './config.js';
import { makeRng, pick, range, clamp, angleLerp, dist2 } from './random.js';
import { isOnRoad, snapToRoad, hitBuilding } from './city.js';

let nextCarId = 1;

export function makeCar(modelId, x, y, angle, opts = {}) {
  const model = CAR_MODELS.find((m) => m.id === modelId) || CAR_MODELS[0];
  return {
    id: nextCarId++,
    model: model.id,
    name: model.name,
    color: opts.color || model.color,
    x, y, angle,
    speed: 0,
    topSpeed: opts.topSpeed || model.topSpeed,
    accel: opts.accel || model.accel,
    len: modelId === 'van' ? 62 : 46,
    wid: 24,
    ai: opts.ai || null, // 'traffic' | 'police' | null (player-driven)
    dir: opts.dir || 0, // traffic: 0=+x, 1=+y, 2=-x, 3=-y
    lane: opts.lane || 0,
    dead: false,
    smoke: 0,
    police: !!opts.police,
    targetCar: null,
    honk: 0,
  };
}

export function spawnTraffic(state, count) {
  const rng = state.rng;
  const models = ['sedan', 'taxi', 'coupe', 'van', 'sedan', 'taxi'];
  for (let i = 0; i < count; i++) {
    const vertical = rng() < 0.5;
    const road = Math.floor(rng() * (WORLD_W / BLOCK)) * BLOCK;
    const along = range(rng, 100, WORLD_W - 100);
    const dir = vertical ? (rng() < 0.5 ? 1 : 3) : (rng() < 0.5 ? 0 : 2);
    const lane = (rng() < 0.5 ? -1 : 1) * (ROAD_W / 4 - 4);
    const x = vertical ? road + lane : along;
    const y = vertical ? along : road + lane;
    const angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][dir];
    const car = makeCar(pick(rng, models), x, y, angle, { ai: 'traffic', dir, lane });
    car.speed = range(rng, 90, 150);
    state.cars.push(car);
  }
}

export function spawnParkedCars(state, count) {
  const rng = state.rng;
  const models = ['sedan', 'taxi', 'coupe', 'van', 'sport'];
  let placed = 0;
  let tries = 0;
  while (placed < count && tries < count * 20) {
    tries++;
    const vertical = rng() < 0.5;
    const road = Math.floor(rng() * (WORLD_W / BLOCK)) * BLOCK;
    const along = range(rng, 120, WORLD_W - 120);
    const side = rng() < 0.5 ? -1 : 1;
    const x = vertical ? road + side * (ROAD_W / 2 - 12) : along;
    const y = vertical ? along : road + side * (ROAD_W / 2 - 12);
    if (dist2(x, y, state.player.x, state.player.y) < 300 * 300) continue;
    if (state.cars.some((c) => dist2(x, y, c.x, c.y) < 90 * 90)) continue;
    if (hitBuilding(state.city, x, y, 20)) continue;
    const angle = vertical ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI);
    state.cars.push(makeCar(pick(rng, models), x, y, angle, {}));
    placed++;
  }
}

export function spawnPolice(state, x, y) {
  const car = makeCar('police', x, y, 0, { ai: 'police', police: true, topSpeed: 480, accel: 310 });
  state.cars.push(car);
  return car;
}

// --- physics helpers -------------------------------------------------------

function carCorners(car) {
  const c = Math.cos(car.angle);
  const s = Math.sin(car.angle);
  const hl = car.len / 2;
  const hw = car.wid / 2;
  return [
    { x: car.x + c * hl - s * hw, y: car.y + s * hl + c * hw },
    { x: car.x + c * hl + s * hw, y: car.y + s * hl - c * hw },
    { x: car.x - c * hl - s * hw, y: car.y - s * hl + c * hw },
    { x: car.x - c * hl + s * hw, y: car.y - s * hl - c * hw },
  ];
}

function circlesCollide(a, b, ra, rb) {
  return dist2(a.x, a.y, b.x, b.y) < (ra + rb) * (ra + rb);
}

export function updateCarPhysics(state, car, dt, control) {
  // control: {throttle: -1..1, steer: -1..1, brake: bool}
  const maxReverse = -car.topSpeed * 0.45;
  if (control.throttle > 0) car.speed += car.accel * control.throttle * dt;
  else if (control.throttle < 0) car.speed += car.accel * control.throttle * dt * 0.8;
  else {
    // Rolling drag.
    car.speed -= car.speed * 0.6 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  if (control.brake) {
    car.speed -= Math.sign(car.speed) * 420 * dt;
    if (Math.abs(car.speed) < 10) car.speed = 0;
  }
  car.speed = clamp(car.speed, maxReverse, car.topSpeed);
  // Steering only works while moving; stronger at low speed, gentler at speed.
  const steerAuthority = clamp(Math.abs(car.speed) / 120, 0, 1) * (1 - clamp(Math.abs(car.speed) / car.topSpeed, 0, 0.55));
  car.angle += control.steer * 2.4 * steerAuthority * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Building collision: slide along walls, lose speed on impact.
  const hitX = hitBuilding(state.city, nx, car.y, 12);
  const hitY = hitBuilding(state.city, car.x, ny, 12);
  if (hitX || hitY) {
    if (Math.abs(car.speed) > 180 && !car._crashCooldown) {
      state.audio.crash();
      state.addParticles(car.x, car.y, 8, '#d8d2c2');
      car._crashCooldown = 0.5;
    }
    car.speed *= 0.55;
    if (!hitX) car.x = nx;
    if (!hitY) car.y = ny;
    // Clamp to world.
    car.x = clamp(car.x, 20, WORLD_W - 20);
    car.y = clamp(car.y, 20, WORLD_H - 20);
  } else {
    car.x = clamp(nx, 20, WORLD_W - 20);
    car.y = clamp(ny, 20, WORLD_H - 20);
  }
  if (car._crashCooldown) car._crashCooldown -= dt;
  // Smoke when badly damaged (visual only).
  if (car.smoke > 0) car.smoke -= dt;
}

// --- traffic AI ------------------------------------------------------------

const DIRS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 },
];

export function updateTrafficCar(state, car, dt) {
  const d = DIRS[car.dir];
  // At an intersection centre, sometimes turn.
  const nearX = Math.abs(car.x - snapToRoad(car.x)) < 22;
  const nearY = Math.abs(car.y - snapToRoad(car.y)) < 22;
  if (nearX && nearY && state.rng() < 0.02) {
    const turn = state.rng() < 0.5 ? 1 : 3; // left or right
    car.dir = (car.dir + turn) % 4;
    const nd = DIRS[car.dir];
    car.angle = Math.atan2(nd.dy, nd.dx);
  }
  // Keep to the lane: steer toward the lane offset.
  const targetAngle = Math.atan2(d.dy, d.dx);
  car.angle = angleLerp(car.angle, targetAngle, Math.min(1, dt * 4));
  // Slow down for a car ahead.
  let targetSpeed = 130;
  for (const other of state.cars) {
    if (other === car || other.dead) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = dx * d.dx + dy * d.dy;
    const side = Math.abs(dx * d.dy - dy * d.dx);
    if (ahead > 0 && ahead < 90 && side < 26) {
      targetSpeed = Math.min(targetSpeed, Math.max(0, other.speed - 20));
    }
  }
  // Stop for a red-ish random pause at intersections (light traffic feel).
  if (nearX && nearY && state.rng() < 0.002) targetSpeed = 0;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (hitBuilding(state.city, nx, ny, 12)) {
    car.dir = (car.dir + 2) % 4;
    const nd = DIRS[car.dir];
    car.angle = Math.atan2(nd.dy, nd.dx);
    return;
  }
  car.x = clamp(nx, 20, WORLD_W - 20);
  car.y = clamp(ny, 20, WORLD_H - 20);
  // Wrap around the map edges so traffic never runs dry.
  if (car.x <= 22 || car.x >= WORLD_W - 22 || car.y <= 22 || car.y >= WORLD_H - 22) {
    car.dir = (car.dir + 2) % 4;
    const nd = DIRS[car.dir];
    car.angle = Math.atan2(nd.dy, nd.dx);
  }
}

// --- police AI ---------------------------------------------------------------

export function updatePoliceCar(state, car, dt) {
  const p = state.player;
  const targetX = p.inCar && p.car ? p.car.x : p.x;
  const targetY = p.inCar && p.car ? p.car.y : p.y;
  const dx = targetX - car.x;
  const dy = targetY - car.y;
  const dist = Math.hypot(dx, dy);
  const wantAngle = Math.atan2(dy, dx);
  // Ram the player: steer hard, full throttle, slight overshoot wobble.
  const steer = angleLerp(0, wantAngle - car.angle, 1);
  const clampedSteer = clamp(steer * 2, -1, 1);
  const throttle = dist > 60 ? 1 : 0.4;
  updateCarPhysics(state, car, dt, { throttle, steer: clampedSteer, brake: false });
  // Keep police near the player: despawn far ones, respawn is handled by the
  // wanted system in police.js.
  if (dist > 1400) car.dead = true;
  // Siren light flash value for the renderer.
  car.sirenPhase = (car.sirenPhase || 0) + dt * 6;
}

export function updateAllCars(state, dt) {
  for (const car of state.cars) {
    if (car.dead) continue;
    if (car.ai === 'traffic') updateTrafficCar(state, car, dt);
    else if (car.ai === 'police') updatePoliceCar(state, car, dt);
    // Player-driven and parked cars are moved by their owners.
  }
  // Simple car-car separation so traffic does not pile through each other.
  for (let i = 0; i < state.cars.length; i++) {
    const a = state.cars[i];
    if (a.dead) continue;
    for (let j = i + 1; j < state.cars.length; j++) {
      const b = state.cars[j];
      if (b.dead) continue;
      const minD = (a.len + b.len) / 2 - 6;
      const d2 = dist2(a.x, a.y, b.x, b.y);
      if (d2 < minD * minD && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (minD - d) / 2;
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        if (a.ai !== 'traffic') a.speed *= 0.9;
        if (b.ai !== 'traffic') b.speed *= 0.9;
      }
    }
  }
  state.cars = state.cars.filter((c) => !c.dead);
  void carCorners;
  void circlesCollide;
}
