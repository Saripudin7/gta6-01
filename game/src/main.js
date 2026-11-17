// Solmar Bay — an original open-world crime game.
// Bootstrap, game loop, state, menus and save wiring. All systems live in
// their own modules: city, vehicles, pedestrians, police, player, missions,
// economy, render, hud, audio and save.
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, PLACES, MISSION_DEFS } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { generateCity, renderCityBackground } from './city.js';
import { createCamera, updateCamera, renderWorld } from './render.js';
import { createPlayer, updatePlayer, exitCar } from './player.js';
import { spawnTraffic, spawnParkedCars, updateAllCars, makeCar } from './vehicles.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { createWantedSystem, updateWanted, syncPolice } from './police.js';
import { createMissionState, startMission, updateMissions, updateBullets, retryMission } from './missions.js';
import { nearShop, tryShop } from './economy.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { createMinimap, renderHUD, renderTitle, renderHowTo, renderPause, renderMissionList, renderEndScreen } from './hud.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 20261117);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function newState() {
  const state = {
    time: 0,
    mode: 'title',
    prevMode: 'playing',
    money: 150,
    ownedModels: [],
    ownedCars: [],
    cars: [],
    peds: [],
    bullets: [],
    particles: [],
    pickups: [],
    toasts: [],
    stats: { carsStolen: 0, missionsDone: 0, kills: 0 },
    rng: makeRng(seed),
    audio: createAudio(),
    input: createInput(canvas),
    camera: createCamera(),
    ui: { buttons: [] },
    save: loadGame(),
    city: null,
    cityBg: null,
    minimap: null,
    player: null,
    missions: null,
  };
  state.city = generateCity(seed);
  state.cityBg = renderCityBackground(state.city);
  state.minimap = createMinimap(state);
  state.player = createPlayer(state);
  state.missions = createMissionState(state);
  createWantedSystem(state);

  state.addParticles = function addParticles(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = state.rng() * Math.PI * 2;
      const sp = 40 + state.rng() * 120;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5 + state.rng() * 0.4,
        maxLife: 0.9,
        size: 2 + state.rng() * 3,
        color,
      });
    }
  };
  state.showToast = function showToast(text) {
    state.toasts.push({ text, life: 3 });
    if (state.toasts.length > 4) state.toasts.shift();
  };
  state.saveGame = function saveGameNow() {
    return saveGame(state);
  };
  return state;
}

const state = newState();

// --- world setup ---------------------------------------------------------------

function populateWorld() {
  state.cars = [];
  state.peds = [];
  state.bullets = [];
  state.particles = [];
  state.pickups = [];
  spawnTraffic(state, 26);
  spawnParkedCars(state, 14);
  spawnPedestrians(state, 60);
  // A few cash/health/ammo pickups scattered around the city.
  const rng = state.rng;
  for (let i = 0; i < 6; i++) {
    state.pickups.push({ x: rng() * (WORLD_W - 200) + 100, y: rng() * (WORLD_H - 200) + 100, kind: 'cash', amount: 25 + Math.floor(rng() * 4) * 25, dead: false });
  }
  state.pickups.push({ x: PLACES.hospital.x + 60, y: PLACES.hospital.y, kind: 'health', dead: false });
  state.pickups.push({ x: PLACES.gunShop.x - 60, y: PLACES.gunShop.y, kind: 'ammo', dead: false });
  state.pickups.push({ x: PLACES.pier.x + 40, y: PLACES.pier.y - 40, kind: 'cash', amount: 100, dead: false });
}

function applySave(save) {
  if (!save) return;
  state.money = save.money ?? 150;
  state.missions.index = save.missionIndex ?? 0;
  state.missions.done = save.missionsDone ?? [];
  state.ownedModels = save.ownedModels ?? [];
  state.player.x = save.x ?? PLACES.safehouse.x;
  state.player.y = save.y ?? PLACES.safehouse.y;
  state.player.health = save.health ?? 100;
  state.player.ammo = save.ammo ?? 24;
  // Owned cars wait at Rico's lot.
  state.ownedModels.forEach((modelId, i) => {
    const car = makeCar(modelId, PLACES.carLot.x + 60 + i * 70, PLACES.carLot.y + 40, 0, {});
    state.cars.push(car);
    state.ownedCars.push(car.id);
  });
}

function startNewGame() {
  clearSave();
  state.save = null;
  state.money = 150;
  state.missions.index = 0;
  state.missions.done = [];
  state.missions.completedAll = false;
  state.ownedModels = [];
  state.ownedCars = [];
  state.stats = { carsStolen: 0, missionsDone: 0, kills: 0 };
  state.player = createPlayer(state);
  populateWorld();
  state.mode = 'playing';
  state.showToast('Welcome to Solmar Bay. Press M to start Mission 1.');
  state.audio.ensure();
  state.audio.click();
}

function continueGame() {
  state.player = createPlayer(state);
  populateWorld();
  applySave(state.save);
  state.mode = 'playing';
  state.showToast('Welcome back to Solmar Bay.');
  state.audio.ensure();
  state.audio.click();
}

function respawn() {
  const p = state.player;
  if (state.mode === 'busted') state.money = Math.max(0, state.money - 150);
  if (state.mode === 'wasted') state.money = Math.max(0, state.money - 100);
  state.heat = 0;
  state.wantedStars = 0;
  state.bustedMeter = 0;
  syncPolice(state);
  if (p.car) {
    p.car.dead = true;
    p.car = null;
  }
  p.inCar = false;
  p.onFoot = true;
  p.x = PLACES.safehouse.x;
  p.y = PLACES.safehouse.y + 40;
  p.health = p.maxHealth;
  p.ammo = Math.max(p.ammo, 12);
  state.camera.x = p.x - VIEW_W / 2;
  state.camera.y = p.y - VIEW_H / 2;
  state.mode = 'playing';
  state.audio.click();
}

// --- per-frame update -------------------------------------------------------------

function updateParticles(dt) {
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 1 - dt * 2;
    pt.vy *= 1 - dt * 2;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
  for (const t of state.toasts) t.life -= dt;
  state.toasts = state.toasts.filter((t) => t.life > 0);
}

state.step = function step(dt, input, pressed) {
  state.time += dt;
  updatePlayer(state, dt, input, pressed);
  updateAllCars(state, dt);
  updatePedestrians(state, dt);
  updateWanted(state, dt);
  updateMissions(state, dt);
  updateBullets(state, dt);
  updateParticles(dt);
  updateCamera(state, dt);
  // Siren while any cruiser is out.
  if (state.cars.some((c) => c.police)) state.audio.siren(dt);
};

function update(dt) {
  const input = state.input;
  const pressed = input.consumePressed();

  // Global: mute toggle.
  if (pressed.has('mute')) {
    state.audio.ensure();
    const muted = state.audio.toggleMute();
    state.showToast(muted ? 'Sound muted' : 'Sound on');
  }

  // Menu button clicks (only outside gameplay — playing has no buttons).
  if (input.mouse.clicked && state.mode !== 'playing') {
    const b = state.ui.buttons.find(
      (btn) => input.mouse.x >= btn.x && input.mouse.x <= btn.x + btn.w && input.mouse.y >= btn.y && input.mouse.y <= btn.y + btn.h,
    );
    if (b) handleButton(b.id);
  }

  if (state.mode === 'title') {
    if (pressed.has('enter')) startNewGame();
    return;
  }
  if (state.mode === 'howto') {
    return;
  }
  if (state.mode === 'paused') {
    if (pressed.has('pause') || pressed.has('enter')) {
      state.mode = 'playing';
      state.audio.click();
    }
    return;
  }
  if (state.mode === 'missions') {
    if (pressed.has('pause') || pressed.has('mission')) {
      state.mode = state.prevMode;
    }
    return;
  }
  if (state.mode === 'busted' || state.mode === 'wasted' || state.mode === 'complete') {
    if (pressed.has('enter')) respawn();
    return;
  }

  // Playing.
  if (pressed.has('pause')) {
    state.mode = 'paused';
    state.audio.click();
    return;
  }

  // M opens the mission list; M again (or Esc) closes it.
  if (pressed.has('mission')) {
    state.prevMode = 'playing';
    state.mode = 'missions';
    state.audio.click();
    return;
  }

  // Shop interaction wins over stealing a car when on foot near a shop.
  const p = state.player;
  if (pressed.has('interact') && p.onFoot && nearShop(state)) {
    const carNear = state.cars.some((c) => !c.dead && Math.hypot(c.x - p.x, c.y - p.y) < 45);
    if (!carNear && tryShop(state)) pressed.delete('interact');
  }

  state.step(dt, input, pressed);
}

function handleButton(id) {
  state.audio.ensure();
  state.audio.click();
  if (id === 'new') startNewGame();
  else if (id === 'continue') continueGame();
  else if (id === 'how') state.mode = 'howto';
  else if (id === 'back') state.mode = state.prevMode || 'title';
  else if (id === 'resume') state.mode = 'playing';
  else if (id === 'missions') {
    state.prevMode = 'paused';
    state.mode = 'missions';
  } else if (id === 'save') {
    state.saveGame();
    state.showToast('Game saved.');
  } else if (id === 'mute') {
    state.audio.toggleMute();
  } else if (id === 'title') {
    state.saveGame();
    state.mode = 'title';
  } else if (id === 'respawn') respawn();
  else if (id.startsWith('mission-')) {
    const idx = Number(id.split('-')[1]);
    if (state.missions.done.includes(MISSION_DEFS[idx].id)) return;
    state.mode = 'playing';
    startMission(state, idx);
  }
}

// --- render ------------------------------------------------------------------------

state.render = function render() {
  const input = state.input;
  if (state.mode === 'title') {
    renderTitle(ctx, state, input);
    return;
  }
  if (state.mode === 'howto') {
    renderHowTo(ctx, state, input);
    return;
  }
  renderWorld(ctx, state);
  if (state.mode === 'playing' || state.mode === 'paused' || state.mode === 'missions') {
    renderHUD(ctx, state, input);
  }
  if (state.mode === 'paused') renderPause(ctx, state, input);
  else if (state.mode === 'missions') renderMissionList(ctx, state, input);
  else if (state.mode === 'busted' || state.mode === 'wasted' || state.mode === 'complete') {
    renderEndScreen(ctx, state, input, state.mode);
  }
};

// --- main loop ----------------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  state.render();
  state.input.endFrame();
  requestAnimationFrame(frame);
}

// --- boot ------------------------------------------------------------------------------

// Debug/test handle: lets a browser session inspect the live game state.
window.__solmar = state;

populateWorld();
if (shot) {
  stageShot(state, shot);
} else {
  state.mode = 'title';
  requestAnimationFrame(frame);
}
