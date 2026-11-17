// Solmar Bay — Streets of Gold: bootstrap, the game loop, screens and the
// wiring between every system. This file owns the state object; the other
// modules are pure functions that take it and move it one step forward.

import { VIEW, PLAYER_START, PLAYER, PLACES, MISSIONS } from './config.js';
import { Rng, seedFromString, clamp } from './random.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { buildCity, prerenderBackground } from './city.js';
import { makeCar, updateTrafficCar, updatePoliceCar, spawnTrafficCar, separateCars, carsOverlap } from './vehicles.js';
import { spawnPeds, updatePeds, scarePeds } from './pedestrians.js';
import { updateWanted, clearWanted } from './police.js';
import { updatePlayer, updateBullets } from './player.js';
import { startMission, updateMissions, updateRivals, missionTargetPos, failMission } from './missions.js';
import { shopAt, shopPrompt, interactShop, buyCar, payBustedFine, payHospitalBill } from './economy.js';
import { drawWorld, updateCamera } from './render.js';
import { drawHUD, drawTitle, drawPause, drawMissionList, drawShop, drawEndCard, pushToast, updateToasts } from './hud.js';
import { saveGame, loadGame, applySave, clearSave } from './save.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

// Fit the 1280x720 view into the window, keeping the aspect ratio.
function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = Math.floor(VIEW.width * scale) + 'px';
  canvas.style.height = Math.floor(VIEW.height * scale) + 'px';
  canvas.style.left = Math.floor((window.innerWidth - VIEW.width * scale) / 2) + 'px';
  canvas.style.top = Math.floor((window.innerHeight - VIEW.height * scale) / 2) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// Build a fresh game state for a seed. Everything the game needs lives here.
export function createState(seed) {
  const rng = new Rng(seed);
  const city = buildCity(seed);
  const state = {
    seed, rng, city,
    bgCanvas: prerenderBackground(city),
    time: 0,
    screen: 'title',
    input: new Input(canvas),
    sound: new Sound(),
    camera: { x: PLAYER_START.x - VIEW.width / 2, y: PLAYER_START.y - VIEW.height / 2 },
    player: {
      x: PLAYER_START.x, y: PLAYER_START.y, angle: PLAYER_START.angle,
      moveAngle: PLAYER_START.angle, health: PLAYER.maxHealth,
      money: PLAYER.startMoney, ammo: PLAYER.startAmmo,
      inCar: null, fireTimer: 0, invuln: 0, walking: false, walkPhase: 0,
    },
    cars: [], traffic: [], peds: [], police: [],
    bullets: [], particles: [], rivals: [],
    heat: 0, wanted: 0, seenByPolice: false, bustedTimer: 0,
    mission: null, missionIndex: 0, missionsDone: 0,
    objective: 'Press M to see Rico\'s jobs, or just explore Solmar Bay.',
    missionTimer: 0, missionTarget: null,
    ownedCars: [], hasSave: false,
    toasts: [], prompt: '', shopMenu: null,
    lastCrime: '',
    muted: false,
  };
  // Helpers the modules call back into (bound to this state).
  state.toast = (text, kind) => pushToast(state, text, kind);
  state.saveGame = () => saveGame(state);
  // One simulation step, exposed so the screenshot stager can run the game
  // forward without a browser animation frame.
  state.tick = (dt, silent) => tick(state, dt, silent);
  state.muzzle = 0;
  // Parked cars from the city layout.
  for (const spot of city.parked) {
    const car = makeCar(spot.model, spot.x, spot.y, spot.angle, 'parked');
    state.cars.push(car);
  }
  // Traffic and pedestrians.
  for (let i = 0; i < 14; i += 1) {
    const car = spawnTrafficCar(rng, state.player.x, state.player.y);
    if (car) { state.cars.push(car); state.traffic.push(car); }
  }
  state.peds = spawnPeds(rng, 26, state.player.x, state.player.y);
  return state;
}

// Keep the streets busy: top traffic back up to fourteen cars.
function maintainTraffic(state) {
  state.traffic = state.traffic.filter((c) => !c.dead);
  if (state.traffic.length < 14) {
    const car = spawnTrafficCar(state.rng, state.player.x, state.player.y);
    if (car) { state.cars.push(car); state.traffic.push(car); }
  }
  state.cars = state.cars.filter((c) => !c.dead);
}

// The context prompt under the HUD: what E does right here, right now.
function computePrompt(state) {
  const p = state.player;
  if (p.inCar) { state.prompt = ''; return; }
  const shop = shopAt(state);
  if (shop) { state.prompt = shopPrompt(state, shop); return; }
  const m = state.mission;
  if (m && !m.done && !m.failed && m.def.id === 2 && m.stage === 0) {
    const place = PLACES.pier;
    if (Math.hypot(p.x - place.x, p.y - place.y) < place.radius) {
      state.prompt = 'E — Grab the package';
      return;
    }
  }
  if (m && !m.done && !m.failed && m.def.id === 5 && m.stage === 1) {
    const place = PLACES.bank;
    if (Math.hypot(p.x - place.x, p.y - place.y) < place.radius) {
      state.prompt = 'Hold E — Crack the vault';
      return;
    }
  }
  let best = null;
  let bestD = 70;
  for (const car of state.cars) {
    if (car.dead || car.driver === 'police') continue;
    const d = Math.hypot(p.x - car.x, p.y - car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  state.prompt = best ? 'E — Take the ' + best.name : '';
}

// One simulation step. `silent` skips sound updates (used by screenshots).
function tick(state, dt, silent) {
  state.time += dt;
  const p = state.player;
  const input = state.input;

  // Shop interaction eats the E press so the player does not steal a car
  // parked right outside the shop door at the same time.
  if (input.pressed('KeyE') && shopAt(state)) {
    interactShop(state);
    input.pressedKeys.delete('KeyE');
  }

  updatePlayer(state, dt);
  updateMissions(state, dt);
  updateRivals(state, dt);

  // Traffic cars follow the grid; police cruisers chase the player.
  for (const car of state.traffic) {
    if (!car.dead) updateTrafficCar(car, state.cars, dt, state.rng);
  }
  for (const cop of state.police) {
    if (!cop.dead) updatePoliceCar(cop, p.x, p.y, dt, state.time);
  }
  // Car-to-car bumps between traffic cars.
  for (let i = 0; i < state.cars.length; i += 1) {
    for (let j = i + 1; j < state.cars.length; j += 1) {
      const a = state.cars[i];
      const b = state.cars[j];
      if (!a.dead && !b.dead && carsOverlap(a, b)) separateCars(a, b);
    }
  }

  // Pedestrians stroll, and flee from a speeding car.
  let danger = null;
  if (p.inCar && Math.abs(p.inCar.speed) > 200) danger = { x: p.x, y: p.y, radius: 130 };
  updatePeds(state.peds, dt, state.rng, danger);

  // Wanted system: heat, cruisers, and the busted check.
  const busted = updateWanted(state, dt);
  if (busted === 'busted') {
    failMission(state, 'Caught by the SPPD.');
    payBustedFine(state);
    state.screen = 'busted';
    state.sound.fail();
  }

  // Bullets and the wasted check.
  if (updateBullets(state, dt) === 'playerDead') {
    failMission(state, 'Vex went down.');
    payHospitalBill(state);
    state.screen = 'wasted';
    state.sound.fail();
  }

  // Particles fade out.
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);

  // Handbrake at speed throws up dust at the rear wheels.
  if (p.inCar && state.input.held('Space') && Math.abs(p.inCar.speed) > 150) {
    const car = p.inCar;
    const backX = car.x - Math.cos(car.angle) * (car.length / 2);
    const backY = car.y - Math.sin(car.angle) * (car.length / 2);
    state.particles.push({
      x: backX, y: backY,
      vx: (state.rng.next() - 0.5) * 60, vy: (state.rng.next() - 0.5) * 60,
      life: 0.5, max: 0.5, color: '#c9c9bd', size: 5,
    });
  }

  maintainTraffic(state);
  state.missionTarget = missionTargetPos(state);
  computePrompt(state);
  updateToasts(state, dt);
  updateCamera(state, dt);
  if (!silent) {
    const speed01 = p.inCar ? clamp(Math.abs(p.inCar.speed) / 330, 0, 1) : 0;
    state.sound.update(speed01, state.wanted, dt);
  }
  // Muzzle flash lives on the state for the renderer.
  state.player.muzzleFlash = state.muzzle;
}

// Draw the current screen.
function render(state) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (state.screen === 'title') {
    drawTitle(ctx, state);
    return;
  }
  drawWorld(ctx, state);
  drawHUD(ctx, state);
  if (state.screen === 'pause') drawPause(ctx, state);
  if (state.screen === 'missions') drawMissionList(ctx, state);
  if (state.screen === 'shop') drawShop(ctx, state);
  if (state.screen === 'busted') drawEndCard(ctx, state, 'busted');
  if (state.screen === 'wasted') drawEndCard(ctx, state, 'wasted');
}

// Screen-level keys: title, pause, mission list, shop, end cards.
function handleScreenKeys(state) {
  const input = state.input;
  if (input.pressed('KeyN')) {
    state.sound.setMuted(!state.sound.muted);
    state.toast(state.sound.muted ? 'Sound muted (N to unmute).' : 'Sound on.', 'info');
  }
  if (state.screen === 'title') {
    if (input.pressed('Enter') || input.mouseClicked) {
      state.sound.ensure();
      if (state.hasSave) {
        const data = loadGame();
        if (data) applySave(state, data);
      }
      state.screen = 'play';
      state.toast('Welcome to Solmar Bay, Vex. Press M for Rico\'s jobs.', 'mission');
    }
    if (input.pressed('KeyC')) {
      clearSave();
      state.hasSave = false;
      state.toast('Fresh start — the old save is gone.', 'info');
    }
    return;
  }
  if (state.screen === 'busted' || state.screen === 'wasted') {
    if (input.pressed('Enter') || input.mouseClicked) {
      state.screen = 'play';
      state.objective = 'Press M to see Rico\'s jobs.';
    }
    return;
  }
  if (state.screen === 'pause') {
    if (input.pressed('KeyP') || input.pressed('Escape')) state.screen = 'play';
    if (input.pressed('KeyM')) state.screen = 'missions';
    return;
  }
  if (state.screen === 'missions') {
    if (input.pressed('KeyM') || input.pressed('Escape')) { state.screen = 'play'; return; }
    for (let i = 0; i < 5; i += 1) {
      if (input.pressed('Digit' + (i + 1))) {
        if (i < state.missionsDone) {
          state.toast('That job is already done.', 'info');
        } else {
          startMission(state, i);
          state.screen = 'play';
        }
        return;
      }
    }
    return;
  }
  if (state.screen === 'shop') {
    if (input.pressed('Escape')) { state.screen = 'play'; return; }
    const options = ['coupe', 'van', 'sport'];
    for (let i = 0; i < 3; i += 1) {
      if (input.pressed('Digit' + (i + 1))) {
        buyCar(state, options[i]);
        state.screen = 'play';
        return;
      }
    }
    return;
  }
  // Playing.
  if (input.pressed('KeyP') || input.pressed('Escape')) { state.screen = 'pause'; return; }
  if (input.pressed('KeyM')) { state.screen = 'missions'; return; }
}

// The main loop: fixed-ish steps, clamped so a tab switch cannot jump time.
let lastTime = 0;
function loop(state, timestamp) {
  const dt = clamp((timestamp - lastTime) / 1000, 0, 0.05);
  lastTime = timestamp;
  state.input.updateMouseWorld(state.camera, canvas.clientWidth / VIEW.width);
  handleScreenKeys(state);
  if (state.screen === 'play') tick(state, dt, false);
  render(state);
  state.input.endFrame();
  requestAnimationFrame((t) => loop(state, t));
}

// Entry point: read ?shot= and ?seed=, build the world, and go.
function main() {
  const params = new URLSearchParams(window.location.search);
  const seedText = params.get('seed') || 'solmar-bay-1';
  const seed = seedFromString(seedText);
  const state = createState(seed);
  state.hasSave = !!loadGame();
  window.__game = state;

  const shot = params.get('shot');
  if (shot) {
    // Screenshot mode: stage the scene, draw it once, signal readiness.
    state.sound.muted = true;
    stageShot(shot, state);
    state.input.updateMouseWorld(state.camera, canvas.clientWidth / VIEW.width);
    render(state);
    window.__shotReady = true;
    return;
  }
  requestAnimationFrame((t) => { lastTime = t; loop(state, t); });
}

main();
