// Solmar Bay — screenshot staging for ?shot=cover|drive|chase|foot.
// Each scene plays the real game forward from a fresh world for a fixed
// number of steps with a simple autopilot, so the frame is what a short
// session really looks like and the same seed always gives the same frame.
// main.js sets window.__shotReady = true once the scene is drawn.

import { PLACES } from './config.js';
import { startMission } from './missions.js';
import { makeCar } from './vehicles.js';
import { addHeat } from './police.js';

// Drive the player's car toward a point: throttle, and steer at the target.
function autopilotDrive(state, tx, ty) {
  const p = state.player;
  const car = p.inCar;
  if (!car) return;
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const input = state.input;
  input.keys.clear();
  if (Math.abs(diff) < 0.5) input.keys.add('KeyW');
  if (diff > 0.12) input.keys.add('KeyD');
  if (diff < -0.12) input.keys.add('KeyA');
}

// Put Vex in a car at a place, facing the road, ready to drive.
function putInCar(state, x, y, angle, modelKey) {
  const car = makeCar(modelKey || 'coupe', x, y, angle, 'player');
  state.cars.push(car);
  state.player.inCar = car;
  state.player.x = x;
  state.player.y = y;
  state.player.angle = angle;
  car.speed = 120;
  return car;
}

// Step the simulation forward a fixed number of frames without rendering.
function runSteps(state, steps, driveTarget) {
  const dt = 1 / 60;
  for (let i = 0; i < steps; i += 1) {
    if (driveTarget) autopilotDrive(state, driveTarget.x, driveTarget.y);
    state.tick(dt, true);
    state.input.endFrame();
  }
}

// Stage one named scene on the live state. Returns the screen to show.
export function stageShot(name, state) {
  state.screen = 'play';
  state.time = 0;
  if (name === 'drive') {
    // Cruising down the main avenue in a Comet GT, traffic around.
    putInCar(state, 1000, 1000, 0, 'sport');
    startMission(state, 0);
    runSteps(state, 60 * 6, { x: 2600, y: 1000 });
    return 'play';
  }
  if (name === 'chase') {
    // Three-star chase: cruisers on Vex, sirens on, mid-escape. The drive
    // target is far from the Safehouse so the frame catches the chase
    // while it is still hot, with a cruiser closing in behind.
    putInCar(state, 1400, 1400, Math.PI / 2, 'coupe');
    startMission(state, 3);
    runSteps(state, 60 * 6, { x: 2600, y: 2200 });
    state.player.health = 100;
    return 'play';
  }
  if (name === 'foot') {
    // On foot at the Old Pier, package job running, rivals in view.
    state.player.x = PLACES.pier.x - 120;
    state.player.y = PLACES.pier.y - 60;
    state.player.angle = 0.4;
    startMission(state, 1);
    runSteps(state, 60 * 3, null);
    // The pier rival shoots during staging; patch Vex up so the frame
    // shows him at full health, ready for the job.
    state.player.health = 100;
    return 'play';
  }
  // Cover: the richest single frame — driving the Bayfront Job with a
  // three-star chase, the minimap, the HUD and the objective all visible.
  putInCar(state, 1800, 1400, 0, 'sport');
  startMission(state, 4);
  addHeat(state, 65, 'bank robbery');
  runSteps(state, 60 * 5, { x: 600, y: 1400 });
  state.player.health = 100;
  return 'play';
}
