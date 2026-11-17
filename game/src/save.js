// Solmar Bay — saving: a small JSON snapshot in localStorage, written at
// the Safehouse and after every finished mission, read back on load.

import { SAVE_KEY } from './config.js';

// Turn the live state into a plain save object.
export function snapshotState(state) {
  return {
    version: 1,
    money: Math.round(state.player.money),
    health: Math.round(state.player.health),
    ammo: state.player.ammo,
    missionsDone: state.missionsDone,
    missionIndex: state.missionIndex,
    ownedCars: state.ownedCars.slice(),
    playerX: Math.round(state.player.x),
    playerY: Math.round(state.player.y),
    savedAt: Date.now(),
  };
}

// Write the snapshot. Returns true on success.
export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshotState(state)));
    return true;
  } catch (err) {
    return false;
  }
}

// Read the snapshot back, or null when there is no save yet.
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch (err) {
    return null;
  }
}

// Apply a loaded snapshot onto a fresh state.
export function applySave(state, data) {
  if (!data) return;
  state.player.money = data.money;
  state.player.health = data.health;
  state.player.ammo = data.ammo;
  state.missionsDone = data.missionsDone || 0;
  state.missionIndex = data.missionIndex || 0;
  state.ownedCars = data.ownedCars || [];
  state.player.x = data.playerX;
  state.player.y = data.playerY;
  state.hasSave = true;
}

// Delete the save (used from the title screen's fresh start).
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    // A missing save is not an error worth showing.
  }
}
