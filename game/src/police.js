// The wanted system: heat rises with crimes, cools when the player stays
// out of sight, and police cruisers spawn to match the star level.
// Busted (caught on foot) and wasted (health gone) end the run at the
// Safehouse with a fine.
import { WORLD_W, WORLD_H } from './config.js';
import { clamp } from './random.js';
import { spawnPolice } from './vehicles.js';

export const MAX_WANTED = 5;

export function wantedStars(heat) {
  return clamp(Math.floor(heat + 0.0001), 0, MAX_WANTED);
}

export function createWantedSystem(state) {
  state.heat = 0;
  state.wantedStars = 0;
  state.heatDecayTimer = 0;
  state.bustedMeter = 0;
  state.crimeFlash = 0;
  state.lastCrime = '';
}

export function addWanted(state, amount, crime) {
  state.heat = clamp(state.heat + amount, 0, MAX_WANTED);
  state.wantedStars = wantedStars(state.heat);
  state.lastCrime = crime;
  state.crimeFlash = 2.2;
  state.heatDecayTimer = 0;
  syncPolice(state);
}

// Keep the number of live cruisers equal to the star level.
export function syncPolice(state) {
  const want = state.wantedStars;
  const have = state.cars.filter((c) => c.police && !c.dead).length;
  if (want > have) {
    for (let i = have; i < want; i++) {
      const p = state.player;
      const px = p.inCar && p.car ? p.car.x : p.x;
      const py = p.inCar && p.car ? p.car.y : p.y;
      const ang = state.rng() * Math.PI * 2;
      const r = 700 + state.rng() * 200;
      // Spawn off-screen, snapped onto a road so no cruiser starts inside a block.
      const x = Math.round(clamp(px + Math.cos(ang) * r, 40, WORLD_W - 40) / 400) * 400;
      const y = Math.round(clamp(py + Math.sin(ang) * r, 40, WORLD_H - 40) / 400) * 400;
      spawnPolice(state, x, y);
    }
  } else if (want < have) {
    let excess = have - want;
    for (const c of state.cars) {
      if (excess <= 0) break;
      if (c.police && !c.dead) {
        c.dead = true;
        excess--;
      }
    }
  }
}

export function updateWanted(state, dt) {
  const stars = wantedStars(state.heat);
  if (stars !== state.wantedStars) {
    state.wantedStars = stars;
    syncPolice(state);
  }
  if (state.crimeFlash > 0) state.crimeFlash -= dt;

  // Heat decays only while no cruiser is close and the player keeps a low
  // profile for a few seconds.
  const p = state.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  const nearCop = state.cars.some(
    (c) => c.police && !c.dead && Math.hypot(c.x - px, c.y - py) < 420,
  );
  if (state.heat > 0 && !nearCop) {
    state.heatDecayTimer += dt;
    if (state.heatDecayTimer > 4) {
      state.heat = Math.max(0, state.heat - dt * 0.12);
      if (state.wantedStars > wantedStars(state.heat)) {
        state.wantedStars = wantedStars(state.heat);
        syncPolice(state);
      }
    }
  } else {
    state.heatDecayTimer = 0;
  }

  // Busted: a cruiser sits on top of the player while on foot.
  if (!p.inCar && state.wantedStars > 0) {
    const copClose = state.cars.some(
      (c) => c.police && !c.dead && Math.hypot(c.x - p.x, c.y - p.y) < 70,
    );
    if (copClose) {
      state.bustedMeter += dt * 0.55;
      if (state.bustedMeter >= 1) {
        state.bustedMeter = 0;
        state.mode = 'busted';
        state.audio.busted();
      }
    } else {
      state.bustedMeter = Math.max(0, state.bustedMeter - dt * 0.4);
    }
  } else {
    state.bustedMeter = Math.max(0, state.bustedMeter - dt * 0.4);
  }

  // Wasted: health ran out.
  if (state.player.health <= 0 && state.mode === 'playing') {
    state.mode = 'wasted';
    state.audio.busted();
  }
}
