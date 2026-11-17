// Solmar Bay — cars: arcade driving physics, traffic that follows the road
// grid and turns at intersections, and police cruisers that chase the player.
// Every car is the same shape of object; only its driver differs.

import { CAR_MODELS, ROADS_X, ROADS_Y, WORLD } from './config.js';
import { clamp, angleDiff, dist } from './random.js';
import { isOnRoad, nearestRoadPoint } from './city.js';

let nextCarId = 1;

// Make a car object. `driver` is 'player', 'traffic' or 'police'.
export function makeCar(modelKey, x, y, angle, driver) {
  const model = CAR_MODELS[modelKey] || CAR_MODELS.sedan;
  return {
    id: nextCarId += 1,
    model: modelKey,
    name: model.name,
    color: model.color,
    dark: model.dark,
    length: model.length,
    width: model.width,
    topSpeed: model.top,
    accel: model.accel,
    x, y, angle,
    speed: 0,
    driver: driver || 'traffic',
    // Traffic AI state.
    lane: 0,             // -1 or 1: which side of the road it drives on
    targetAngle: angle,
    turnAt: null,        // intersection it plans to turn at
    stuck: 0,
    // Police AI state.
    ramTimer: 0,
    siren: driver === 'police',
    // Ownership.
    owned: false,
    parked: driver === 'parked',
    dead: false,
  };
}

// Arcade driving: forward is the car's nose. throttle in -1..1, steer in -1..1.
export function driveCar(car, throttle, steer, dt, handbrake) {
  const model = CAR_MODELS[car.model];
  const forward = throttle >= 0 ? 1 : -1;
  if (throttle !== 0) {
    car.speed += throttle * car.accel * dt * (car.speed < 0 ? 0.6 : 1);
  }
  // Rolling drag and braking drag.
  car.speed -= car.speed * (handbrake ? 2.2 : 0.55) * dt;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  const maxForward = model.top;
  const maxReverse = 110;
  car.speed = clamp(car.speed, -maxReverse, maxForward);
  // Steering only bites while moving; sharper at low speed, looser at high.
  const speedFactor = clamp(Math.abs(car.speed) / 140, 0.15, 1);
  const turnRate = 2.6 * (1 - speedFactor * 0.45) * (car.speed >= 0 ? 1 : -1);
  car.angle += steer * turnRate * speedFactor * dt * (handbrake ? 1.5 : 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Keep cars inside the world; the sea stops them at the boardwalk.
  car.x = clamp(car.x, 30, 3020);
  car.y = clamp(car.y, 30, WORLD.height - 30);
  return forward;
}

// Two cars overlap when their centres are closer than this.
export function carsOverlap(a, b) {
  const d = dist(a.x, a.y, b.x, b.y);
  return d < (a.length + b.length) / 2 - 6;
}

// Push two overlapping cars apart and bleed some speed off both.
export function separateCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const overlap = (a.length + b.length) / 2 - 6 - d;
  if (overlap <= 0) return;
  const push = overlap / 2;
  const nx = dx / d;
  const ny = dy / d;
  a.x -= nx * push; a.y -= ny * push;
  b.x += nx * push; b.y += ny * push;
  a.speed *= 0.85;
  b.speed *= 0.85;
}

// Traffic AI: follow the road grid, keep a lane, and pick a random turn at
// each intersection. Cars slow down when another car is right ahead.
export function updateTrafficCar(car, cars, dt, rng) {
  const point = nearestRoadPoint(car.x, car.y);
  const laneOffset = 14;
  // Aim at a point 60px ahead on the car's lane: right-hand side of the
  // road in the direction of travel.
  let targetX;
  let targetY;
  if (point.vertical) {
    targetX = point.x + laneOffset * (car.lane || 1);
    targetY = car.y + Math.sin(car.angle) * 60;
  } else {
    targetX = car.x + Math.cos(car.angle) * 60;
    targetY = point.y + laneOffset * (car.lane || 1);
  }
  // At an intersection, sometimes turn: pick a new heading along the grid.
  const nearX = ROADS_X.find((rx) => Math.abs(car.x - rx) < 26);
  const nearY = ROADS_Y.find((ry) => Math.abs(car.y - ry) < 26);
  if (nearX !== undefined && nearY !== undefined && car.turnAt !== nearX + ':' + nearY) {
    car.turnAt = nearX + ':' + nearY;
    if (rng.chance(0.45)) {
      const options = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      car.targetAngle = rng.pick(options);
      // Snap the car onto the intersection centre before turning.
      car.x = nearX;
      car.y = nearY;
    }
  }
  // Steer toward the lane target.
  const want = Math.atan2(targetY - car.y, targetX - car.x);
  const diff = angleDiff(car.angle, car.targetAngle !== car.angle && Math.abs(angleDiff(car.angle, car.targetAngle)) < 0.5 ? car.targetAngle : want);
  let steer = clamp(diff * 2.2, -1, 1);
  if (Math.abs(angleDiff(car.angle, car.targetAngle)) > 0.05) {
    steer = clamp(angleDiff(car.angle, car.targetAngle) * 2.4, -1, 1);
  }
  // Slow down if a car is ahead.
  let throttle = 0.55;
  for (const other of cars) {
    if (other === car || other.dead) continue;
    const ahead = (other.x - car.x) * Math.cos(car.angle) + (other.y - car.y) * Math.sin(car.angle);
    const side = Math.abs((other.x - car.x) * -Math.sin(car.angle) + (other.y - car.y) * Math.cos(car.angle));
    if (ahead > 0 && ahead < 70 && side < 30) { throttle = -0.4; break; }
  }
  driveCar(car, throttle, steer, dt, false);
  // If the car is off the road entirely, steer it back toward the grid.
  if (!isOnRoad(car.x, car.y)) {
    car.targetAngle = want;
  }
  // Nudge the target angle back to the lane heading once the turn is done.
  if (Math.abs(angleDiff(car.angle, car.targetAngle)) < 0.08) {
    car.targetAngle = car.angle;
  }
}

// Police driving AI: chase the target point, cut corners, and ram. The
// cruiser steers straight at the player and floors it, with a little wobble
// so it does not look glued to a rail.
export function updatePoliceCar(car, tx, ty, dt, time) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  const diff = angleDiff(car.angle, want);
  const steer = clamp(diff * 2.6, -1, 1);
  const wobble = Math.sin(time * 2.1 + car.id) * 0.08;
  const d = dist(car.x, car.y, tx, ty);
  const throttle = d > 60 ? 1 : 0.35;
  driveCar(car, throttle, steer + wobble, dt, false);
  // Ram: when close, a burst of speed into the target.
  car.ramTimer -= dt;
  if (d < 90 && car.ramTimer <= 0) {
    car.speed += 60;
    car.ramTimer = 2.5;
  }
}

// Spawn a fresh traffic car on a random road, away from the player.
export function spawnTrafficCar(rng, playerX, playerY) {
  const vertical = rng.chance(0.5);
  let x;
  let y;
  let angle;
  if (vertical) {
    x = rng.pick(ROADS_X);
    y = rng.range(100, WORLD.height - 100);
    angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
  } else {
    x = rng.range(100, 2900);
    y = rng.pick(ROADS_Y);
    angle = rng.chance(0.5) ? 0 : Math.PI;
  }
  if (dist(x, y, playerX, playerY) < 420) return null;
  const models = ['sedan', 'coupe', 'pickup', 'taxi', 'van'];
  const car = makeCar(rng.pick(models), x, y, angle, 'traffic');
  car.lane = rng.chance(0.5) ? 1 : -1;
  car.targetAngle = angle;
  car.speed = rng.range(60, 110);
  return car;
}

// Spawn a police cruiser at the nearest road to a point, just off-screen.
export function spawnPoliceCar(rng, px, py) {
  const point = nearestRoadPoint(px, py);
  const angle = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
  const offset = rng.pick([-1, 1]) * rng.range(500, 700);
  const x = clamp(point.x + Math.cos(angle) * offset, 60, 2960);
  const y = clamp(point.y + Math.sin(angle) * offset, 60, WORLD.height - 60);
  const car = makeCar('police', x, y, angle, 'police');
  car.speed = 120;
  return car;
}
