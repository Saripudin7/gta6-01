// Save and load through localStorage. The save holds money, mission
// progress, owned cars and the player's position — never the live traffic.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const p = state.player;
    const data = {
      version: 1,
      money: state.money,
      missionIndex: state.missions.index,
      missionsDone: state.missions.done,
      ownedModels: state.ownedModels,
      x: p.x,
      y: p.y,
      health: p.health,
      ammo: p.ammo,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}
