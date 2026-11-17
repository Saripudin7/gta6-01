// Story missions: five linked jobs across Solmar Bay. Each mission is a
// small state machine with a target marker, a timer where it fits, and a
// payout. Rivals are armed pedestrians who shoot at the player.
import { PLACES, MISSION_DEFS } from './config.js';
import { dist2 } from './random.js';
import { addWanted } from './police.js';
import { damagePlayer } from './player.js';
import { hitBuilding } from './city.js';
import { shootPed } from './pedestrians.js';

export function createMissionState(state) {
  return {
    index: state.save ? state.save.missionIndex : 0,
    stage: 0,
    timer: 0,
    target: null, // {x, y, label}
    active: false,
    banner: '',
    bannerTimer: 0,
    done: state.save ? state.save.missionsDone : [],
    completedAll: false,
    robTimer: 0,
    rivals: [],
  };
}

export function startMission(state, index) {
  const m = state.missions;
  const def = MISSION_DEFS[index];
  if (!def) return;
  m.index = index;
  m.stage = 0;
  m.active = true;
  m.timer = 0;
  m.robTimer = 0;
  m.rivals = [];
  setTarget(state, def, 0);
  m.banner = def.title;
  m.bannerTimer = 4;
  state.showToast(def.brief);
  state.audio.missionDone();
}

export function setTarget(state, def, stage) {
  const m = state.missions;
  const P = PLACES;
  switch (def.id) {
    case 'first-wheels':
      m.target = stage === 0 ? { x: P.paintShop.x, y: P.paintShop.y, label: 'Paint & Repair' } : null;
      break;
    case 'the-pickup':
      m.target = stage === 0
        ? { x: P.pier.x, y: P.pier.y, label: 'Old Pier — pick up the package' }
        : { x: P.safehouse.x, y: P.safehouse.y, label: 'Safehouse — deliver the package' };
      break;
    case 'hot-delivery':
      if (stage === 0) {
        m.timer = 90;
        m.target = { x: P.docks.x, y: P.docks.y, label: 'North Docks — 90 seconds!' };
        addWanted(state, 1, 'Spotted with hot cargo');
      }
      break;
    case 'the-getaway':
      if (stage === 0) {
        addWanted(state, 3, 'Tripped an alarm');
        m.target = null;
      } else {
        m.target = { x: P.safehouse.x, y: P.safehouse.y, label: 'Safehouse — lay low' };
      }
      break;
    case 'bayfront-job':
      if (stage === 0) {
        m.target = { x: P.bank.x, y: P.bank.y, label: 'Bayfront Bank — hold it up (stand here)' };
        m.robTimer = 5;
        spawnRivals(state, P.bank.x, P.bank.y, 3);
      } else {
        m.target = { x: P.safehouse.x, y: P.safehouse.y, label: 'Safehouse — escape!' };
      }
      break;
    default:
      m.target = null;
  }
}

function spawnRivals(state, x, y, n) {
  for (let i = 0; i < n; i++) {
    state.missions.rivals.push({
      x: x + (state.rng() - 0.5) * 160,
      y: y + (state.rng() - 0.5) * 160,
      health: 3,
      fireCooldown: 1 + state.rng(),
      shirt: '#3a3a3a',
      dead: false,
    });
  }
}

function completeMission(state) {
  const m = state.missions;
  const def = MISSION_DEFS[m.index];
  state.money += def.payout;
  m.done.push(def.id);
  m.active = false;
  m.target = null;
  m.rivals = [];
  m.banner = `${def.title} — DONE! +$${def.payout}`;
  m.bannerTimer = 4;
  state.audio.missionDone();
  state.showToast(`Mission complete! +$${def.payout}`);
  state.stats.missionsDone++;
  if (state.saveGame) state.saveGame();
  if (m.index + 1 < MISSION_DEFS.length) {
    m.nextTimer = 3;
  } else {
    m.completedAll = true;
    state.mode = 'complete';
  }
}

function failMission(state, reason) {
  const m = state.missions;
  m.active = false;
  m.target = null;
  m.rivals = [];
  m.banner = `Mission failed — ${reason}`;
  m.bannerTimer = 4;
  state.showToast(`Mission failed: ${reason}. Press M to retry.`);
}

export function retryMission(state) {
  startMission(state, state.missions.index);
}

export function updateMissions(state, dt) {
  const m = state.missions;
  if (m.bannerTimer > 0) m.bannerTimer -= dt;
  if (m.nextTimer) {
    m.nextTimer -= dt;
    if (m.nextTimer <= 0) {
      m.nextTimer = 0;
      startMission(state, m.index + 1);
    }
    return;
  }
  if (!m.active) return;
  const def = MISSION_DEFS[m.index];
  const p = state.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;

  // Timed mission countdown.
  if (def.id === 'hot-delivery' && m.stage === 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission(state, 'the delivery was late');
      return;
    }
  }

  // Rivals shoot at the player.
  for (const r of m.rivals) {
    if (r.dead) continue;
    r.fireCooldown -= dt;
    const d = Math.hypot(px - r.x, py - r.y);
    if (d < 420 && r.fireCooldown <= 0) {
      r.fireCooldown = 1.4;
      const a = Math.atan2(py - r.y, px - r.x);
      state.bullets.push({
        x: r.x + Math.cos(a) * 16,
        y: r.y + Math.sin(a) * 16,
        vx: Math.cos(a) * 520,
        vy: Math.sin(a) * 520,
        life: 1.2,
        fromPlayer: false,
      });
      state.audio.shot();
    }
    // Rivals hold their ground near the bank.
    if (d > 300) {
      const a = Math.atan2(py - r.y, px - r.x);
      r.x += Math.cos(a) * 40 * dt;
      r.y += Math.sin(a) * 40 * dt;
    }
  }
  m.rivals = m.rivals.filter((r) => !r.dead);

  // Stage logic.
  switch (def.id) {
    case 'first-wheels': {
      // Stage 0: reach the paint shop while in any car.
      if (m.target && dist2(px, py, m.target.x, m.target.y) < 90 * 90 && p.inCar) {
        completeMission(state);
      }
      break;
    }
    case 'the-pickup': {
      if (m.stage === 0 && m.target && dist2(px, py, m.target.x, m.target.y) < 70 * 70) {
        m.stage = 1;
        state.showToast('Package picked up! Bring it to the Safehouse.');
        state.audio.pickup();
        setTarget(state, def, 1);
      } else if (m.stage === 1 && m.target && dist2(px, py, m.target.x, m.target.y) < 90 * 90) {
        completeMission(state);
      }
      break;
    }
    case 'hot-delivery': {
      if (m.target && dist2(px, py, m.target.x, m.target.y) < 90 * 90) {
        completeMission(state);
      }
      break;
    }
    case 'the-getaway': {
      if (m.stage === 0 && state.wantedStars === 0) {
        m.stage = 1;
        setTarget(state, def, 1);
        state.showToast('You lost them! Now reach the Safehouse.');
      } else if (m.stage === 1 && m.target && dist2(px, py, m.target.x, m.target.y) < 90 * 90) {
        completeMission(state);
      }
      break;
    }
    case 'bayfront-job': {
      if (m.stage === 0) {
        if (m.target && dist2(px, py, m.target.x, m.target.y) < 80 * 80) {
          m.robTimer -= dt;
          if (m.robTimer <= 0) {
            m.stage = 1;
            addWanted(state, 3, 'Robbed Bayfront Bank');
            state.showToast('Vault emptied! Run for the Safehouse!');
            setTarget(state, def, 1);
          }
        } else {
          m.robTimer = 5;
        }
        // All rivals down early also advances.
        if (m.rivals.length === 0 && state.stats.kills >= 3) {
          // keep the hold-up timer as the real gate
        }
      } else if (m.target && dist2(px, py, m.target.x, m.target.y) < 90 * 90) {
        completeMission(state);
      }
      break;
    }
    default:
      break;
  }
}

export function updateBullets(state, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) {
      b.dead = true;
      continue;
    }
    // Hit a building.
    if (hitBuilding(state.city, b.x, b.y, 0)) {
      b.dead = true;
      state.addParticles(b.x, b.y, 4, '#d8d2c2');
      continue;
    }
    if (b.fromPlayer) {
      // Hit a pedestrian.
      for (const ped of state.peds) {
        if (ped.dead) continue;
        if (dist2(b.x, b.y, ped.x, ped.y) < 16 * 16) {
          b.dead = true;
          state.stats.kills++;
          shootPed(state, ped);
          addWanted(state, 0.5, 'Shot a civilian');
          break;
        }
      }
      if (b.dead) continue;
      // Hit a rival.
      for (const r of state.missions.rivals) {
        if (r.dead) continue;
        if (dist2(b.x, b.y, r.x, r.y) < 18 * 18) {
          b.dead = true;
          r.health--;
          state.addParticles(b.x, b.y, 5, '#c0392b');
          if (r.health <= 0) {
            r.dead = true;
            state.stats.kills++;
            state.money += 50;
            state.showToast('Rival down +$50');
          }
          break;
        }
      }
      if (b.dead) continue;
      // Hit a police car: damages it, raises heat.
      for (const car of state.cars) {
        if (car.dead || !car.police) continue;
        if (dist2(b.x, b.y, car.x, car.y) < 26 * 26) {
          b.dead = true;
          car.smoke = 2;
          addWanted(state, 0.4, 'Shot at the police');
          state.addParticles(b.x, b.y, 5, '#ffd34d');
          break;
        }
      }
    } else {
      // Enemy bullet vs the player.
      const p = state.player;
      if (dist2(b.x, b.y, p.x, p.y) < 16 * 16) {
        b.dead = true;
        damagePlayer(state, 12, 'a rival');
      }
    }
  }
  state.bullets = state.bullets.filter((b) => !b.dead);
}

export function missionObjectiveText(state) {
  const m = state.missions;
  if (!m.active) {
    if (m.completedAll) return 'Story complete — free roam. Press M for the mission list.';
    if (m.done.length === 0) return 'Press M to start Mission 1 — First Wheels.';
    return 'Between jobs. Press M to start the next mission.';
  }
  const def = MISSION_DEFS[m.index];
  let text = def.title;
  if (m.target) text += `  •  ${m.target.label}`;
  if (def.id === 'hot-delivery' && m.stage === 0) text += `  •  ${Math.max(0, Math.ceil(m.timer))}s left`;
  if (def.id === 'bayfront-job' && m.stage === 0 && m.target) {
    const p = state.player;
    const px = p.inCar && p.car ? p.car.x : p.x;
    const py = p.inCar && p.car ? p.car.y : p.y;
    if (dist2(px, py, m.target.x, m.target.y) < 80 * 80) {
      text += `  •  Hold up: ${Math.max(0, m.robTimer).toFixed(1)}s`;
    }
  }
  return text;
}
