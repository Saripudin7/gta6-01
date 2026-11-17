// Solmar Bay — the wanted system: heat rises with crime, falls when the
// police lose sight of you, and cruisers spawn to match the star level.
// Getting caught costs a fine; getting away clean is the whole game.

import { WANTED } from './config.js';
import { clamp, dist } from './random.js';
import { spawnPoliceCar } from './vehicles.js';

// How many cruisers a star level puts on the street.
export function cruisersForStars(stars) {
  return [0, 1, 2, 3, 4, 5][stars] || 0;
}

// Stars shown on the HUD, from the raw heat number.
export function starsFromHeat(heat) {
  return clamp(Math.floor(heat / WANTED.heatPerStar), 0, WANTED.maxStars);
}

// Add heat for a crime. Stealing a car is loud; shooting is louder.
export function addHeat(state, amount, reason) {
  state.heat = clamp(state.heat + amount, 0, WANTED.maxStars * WANTED.heatPerStar + 10);
  state.wanted = starsFromHeat(state.heat);
  if (reason) state.lastCrime = reason;
}

// True when any police cruiser can see the player (close and roughly in
// front of the cruiser, or very close at all).
export function anyCopSeesPlayer(state) {
  const p = state.player;
  for (const cop of state.police) {
    const d = dist(cop.x, cop.y, p.x, p.y);
    if (d < 90) return true;
    if (d < 420) {
      const toPlayer = Math.atan2(p.y - cop.y, p.x - cop.x);
      let diff = toPlayer - cop.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.9) return true;
    }
  }
  return false;
}

// The per-frame wanted update: decay heat, keep the cruiser count right,
// chase with the cruisers, and check whether the player is busted.
export function updateWanted(state, dt) {
  const seen = anyCopSeesPlayer(state);
  state.seenByPolice = seen;
  // Heat decays; faster when nobody can see you.
  const decay = seen ? WANTED.decaySeen : WANTED.decayPerSecond;
  state.heat = Math.max(0, state.heat - decay * WANTED.heatPerStar * dt);
  const stars = starsFromHeat(state.heat);
  if (stars !== state.wanted) {
    state.wanted = stars;
    if (stars === 0) state.toast('You lost the heat. The SPPD stands down.', 'good');
  }

  // Spawn or remove cruisers to match the star level.
  const want = cruisersForStars(state.wanted);
  while (state.police.length < want) {
    const car = spawnPoliceCar(state.rng, state.player.x, state.player.y);
    state.police.push(car);
    state.cars.push(car);
  }
  while (state.police.length > want) {
    const car = state.police.pop();
    car.dead = true;
  }

  // Busted check: on foot, a cruiser parked on top of you for a while.
  if (!state.player.inCar && state.wanted > 0) {
    let closest = Infinity;
    for (const cop of state.police) {
      closest = Math.min(closest, dist(cop.x, cop.y, state.player.x, state.player.y));
    }
    if (closest < WANTED.bustedRange) {
      state.bustedTimer += dt;
      if (state.bustedTimer > WANTED.bustedHoldSeconds) {
        state.bustedTimer = 0;
        return 'busted';
      }
    } else {
      state.bustedTimer = 0;
    }
  } else {
    state.bustedTimer = 0;
  }
  return null;
}

// Clear all heat (used by Paint & Repair and after being busted).
export function clearWanted(state) {
  state.heat = 0;
  state.wanted = 0;
  state.bustedTimer = 0;
  for (const cop of state.police) cop.dead = true;
  state.police = [];
  state.cars = state.cars.filter((c) => c.driver !== 'police');
}
