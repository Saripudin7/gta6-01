// Screenshot scenes behind ?shot=start|drive|chase|foot (with &seed=N).
// Each one plays the real game forward from a staged state — the same code
// the player runs — then paints twice and sets window.__shotReady.
import { PLACES } from './config.js';
import { makeCar, spawnPolice } from './vehicles.js';
import { startMission } from './missions.js';

export function stageShot(state, shot) {
  const p = state.player;

  const putPlayerInCar = (modelId, x, y, angle, speed) => {
    const car = makeCar(modelId, x, y, angle, {});
    car.speed = speed;
    state.cars.push(car);
    p.inCar = true;
    p.onFoot = false;
    p.car = car;
    p.x = x;
    p.y = y;
    p.angle = angle;
    return car;
  };

  if (shot === 'start') {
    state.mode = 'title';
    state.render();
    state.render();
    window.__shotReady = true;
    return;
  }

  state.mode = 'playing';
  state.money = 2350;
  p.health = 100;
  p.ammo = 48;

  if (shot === 'drive') {
    // Downtown cruise with traffic and pedestrians around, a marker ahead.
    putPlayerInCar('coupe', 1600, 1200, 0, 260);
    state.missions.index = 1;
    startMission(state, 1);
  } else if (shot === 'chase') {
    // The cover: a 3-star police chase in the sports car, sirens behind.
    putPlayerInCar('sport', 1700, 1200, 0, 420);
    state.missions.index = 2;
    startMission(state, 2);
    state.heat = 3;
    state.wantedStars = 3;
    const c1 = spawnPolice(state, 1420, 1200);
    c1.angle = 0;
    c1.speed = 380;
    const c2 = spawnPolice(state, 1300, 1200);
    c2.angle = 0;
    c2.speed = 360;
  } else if (shot === 'foot') {
    // On foot at the pier, pistol out, the package marker in view.
    p.x = 700;
    p.y = 2050;
    p.onFoot = true;
    p.inCar = false;
    p.car = null;
    p.aimAngle = Math.atan2(PLACES.pier.y - p.y, PLACES.pier.x - p.x);
    state.missions.index = 1;
    startMission(state, 1);
  } else {
    putPlayerInCar('sedan', 1240, 840, Math.PI / 2, 200);
  }

  // Step the simulation so traffic, peds and police settle into natural
  // positions. Driving shots hold the throttle so the car is moving.
  const driving = shot === 'drive' || shot === 'chase';
  const driveInput = {
    keys: driving ? new Set(['up']) : new Set(),
    mouse: { x: 640, y: 360, down: false, clicked: false },
  };
  const steps = shot === 'chase' ? 60 : 90;
  for (let i = 0; i < steps; i++) state.step(1 / 60, driveInput, new Set());
  state.missions.bannerTimer = 0;
  state.crimeFlash = 0;
  state.toasts = [];
  if (shot === 'foot') {
    // The warm-up mouse sat at screen centre and overwrote the aim; point
    // the pistol at the pier package again for the shot.
    p.aimAngle = Math.atan2(PLACES.pier.y - p.y, PLACES.pier.x - p.x);
  }
  state.camera.x = Math.max(0, Math.min(3200 - 1280, p.x - 640));
  state.camera.y = Math.max(0, Math.min(2400 - 720, p.y - 360));
  state.render();
  state.render();
  window.__shotReady = true;
}
