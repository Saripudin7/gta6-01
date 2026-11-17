// Solmar Bay — the five story missions for Rico and his crew, plus the
// rival gunmen who guard the pier and the bank. Missions are a small state
// machine: each one has stages, a target place, and a win/fail check.

import { MISSIONS, PLACES, PLAYER } from './config.js';
import { dist } from './random.js';
import { addHeat, clearWanted } from './police.js';
import { makeCar } from './vehicles.js';

// A rival gunman: stands his ground, shoots at Vex when close.
export function makeRival(x, y) {
  return {
    x, y, angle: 0, health: 100, dead: false,
    fireTimer: 1.2, burst: 0, burstTimer: 0,
    homeX: x, homeY: y,
  };
}

// Start mission number `index` (0-based). Resets the mission state.
export function startMission(state, index) {
  const def = MISSIONS[index];
  state.missionIndex = index;
  state.mission = {
    def,
    stage: 0,
    timer: def.timeLimit || 0,
    surviveLeft: def.survive || 0,
    robProgress: 0,
    done: false,
    failed: false,
    packageHeld: false,
    targetKey: def.place,
    text: def.brief,
  };
  state.objective = def.hint;
  state.toast('Mission ' + def.id + ': ' + def.title, 'mission');
  state.sound.chime();
  // Mission 3 opens with the package already in the car: jump to the drive.
  if (def.id === 3) {
    state.mission.stage = 1;
    state.mission.targetKey = 'docks';
    state.objective = 'Reach the North Docks before the timer runs out!';
  }
  // Mission 4 starts hot: three stars from the first second.
  if (def.id === 4) {
    addHeat(state, 62, 'the getaway');
    state.mission.stage = 1;
    state.objective = 'Lose the SPPD, then get to the Safehouse.';
  }
  // Mission 5 posts two rivals at the bank doors.
  if (def.id === 5) {
    state.rivals.push(makeRival(PLACES.bank.x - 70, PLACES.bank.y - 60));
    state.rivals.push(makeRival(PLACES.bank.x + 60, PLACES.bank.y + 70));
    state.mission.stage = 1;
  }
  // Mission 2 posts one rival guarding the pier package.
  if (def.id === 2) {
    state.rivals.push(makeRival(PLACES.pier.x - 40, PLACES.pier.y - 90));
  }
}

// Finish the active mission: pay out, save, and offer the next one.
export function completeMission(state) {
  const m = state.mission;
  if (!m || m.done) return;
  m.done = true;
  const payout = m.def.reward + (m.def.id === 5 ? 1500 : 0);
  state.player.money += payout;
  state.sound.chime();
  state.sound.cash();
  // A burst of gold sparks over Vex so the payout is visible, not just a number.
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2;
    state.particles.push({
      x: state.player.x, y: state.player.y,
      vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
      life: 0.7, max: 0.7, color: '#ffd166', size: 4,
    });
  }
  state.toast('Mission complete: ' + m.def.title + '  +$' + payout, 'good');
  state.objective = 'Mission complete! Press M to start the next job.';
  state.missionsDone += 1;
  state.saveGame();
  clearWanted(state);
}

// Fail the active mission: heat stays, the job can be retried from M.
export function failMission(state, reason) {
  const m = state.mission;
  if (!m || m.done || m.failed) return;
  m.failed = true;
  state.sound.fail();
  state.toast('Mission failed: ' + reason + ' — press M to retry.', 'bad');
  state.objective = 'Mission failed. Press M to try again.';
  state.rivals = [];
}

// The current objective marker position (world coordinates).
export function missionTargetPos(state) {
  const m = state.mission;
  if (!m || m.done || m.failed) return null;
  const place = PLACES[m.targetKey];
  return place ? { x: place.x, y: place.y, name: place.name } : null;
}

// Rival gunmen: hold position, aim at Vex, fire in short bursts.
export function updateRivals(state, dt) {
  const p = state.player;
  for (const rival of state.rivals) {
    if (rival.dead) continue;
    const d = dist(rival.x, rival.y, p.x, p.y);
    const tx = p.inCar ? p.inCar.x : p.x;
    const ty = p.inCar ? p.inCar.y : p.y;
    rival.angle = Math.atan2(ty - rival.y, tx - rival.x);
    // Drift back toward home if Vex drags them far away.
    const home = dist(rival.x, rival.y, rival.homeX, rival.homeY);
    if (home > 160) {
      rival.x += (rival.homeX - rival.x) / home * 40 * dt;
      rival.y += (rival.homeY - rival.y) / home * 40 * dt;
    }
    if (d > 520) continue;
    rival.fireTimer -= dt;
    if (rival.burst > 0) {
      rival.burstTimer -= dt;
      if (rival.burstTimer <= 0) {
        rival.burst -= 1;
        rival.burstTimer = 0.16;
        const spread = (state.rng.next() - 0.5) * 0.3;
        const a = rival.angle + spread;
        state.bullets.push({
          x: rival.x + Math.cos(a) * 18, y: rival.y + Math.sin(a) * 18,
          vx: Math.cos(a) * 640, vy: Math.sin(a) * 640,
          life: 0.8, damage: 9, fromPlayer: false,
        });
        state.sound.shot();
      }
    } else if (rival.fireTimer <= 0 && d < 460) {
      rival.burst = 3;
      rival.burstTimer = 0;
      rival.fireTimer = 1.6 + state.rng.next() * 0.8;
    }
  }
  state.rivals = state.rivals.filter((r) => !r.dead || r.deadTimer > 0);
  for (const r of state.rivals) if (r.dead) r.deadTimer = (r.deadTimer || 0) + dt;
  state.rivals = state.rivals.filter((r) => !r.dead || (r.deadTimer || 0) < 8);
}

// The mission state machine, run once per frame.
export function updateMissions(state, dt) {
  const m = state.mission;
  if (!m || m.done || m.failed) return;
  const p = state.player;
  const id = m.def.id;

  // Mission 1: steal a car, then drive it to Paint & Repair.
  if (id === 1) {
    if (m.stage === 0) {
      if (p.inCar) {
        m.stage = 1;
        m.targetKey = 'paint';
        state.objective = 'Drive the stolen car to Paint & Repair.';
        state.toast('Nice wheels. Now get it to Paint & Repair.', 'mission');
      }
      return;
    }
    const place = PLACES.paint;
    if (p.inCar && dist(p.x, p.y, place.x, place.y) < place.radius) {
      completeMission(state);
    }
    return;
  }

  // Mission 2: fetch the package at the pier, deliver it to the Safehouse.
  if (id === 2) {
    if (m.stage === 0) {
      const place = PLACES.pier;
      if (dist(p.x, p.y, place.x, place.y) < place.radius && state.input.pressed('KeyE')) {
        m.packageHeld = true;
        m.stage = 1;
        m.targetKey = 'safehouse';
        state.objective = 'Package secured. Deliver it to the Safehouse.';
        state.sound.pickup();
        state.toast('Package grabbed. Do not stop for anyone.', 'mission');
      }
      return;
    }
    const place = PLACES.safehouse;
    if (dist(p.x, p.y, place.x, place.y) < place.radius) {
      completeMission(state);
    }
    return;
  }

  // Mission 3: ninety seconds to the North Docks; police join halfway.
  if (id === 3) {
    m.timer -= dt;
    state.missionTimer = m.timer;
    if (m.timer < 45 && !m.policeSent) {
      m.policeSent = true;
      addHeat(state, 45, 'speeding delivery');
      state.toast('SPPD on your tail! Keep driving!', 'bad');
    }
    if (m.timer <= 0) {
      failMission(state, 'Out of time — the buyer walked away.');
      return;
    }
    const place = PLACES.docks;
    if (dist(p.x, p.y, place.x, place.y) < place.radius) {
      completeMission(state);
    }
    return;
  }

  // Mission 4: survive the three-star response, then reach the Safehouse.
  if (id === 4) {
    if (m.stage === 1) {
      if (state.wanted === 0) {
        m.stage = 2;
        m.targetKey = 'safehouse';
        state.objective = 'Heat is gone. Get to the Safehouse.';
        state.toast('You shook them. Now get home.', 'good');
      }
      return;
    }
    const place = PLACES.safehouse;
    if (dist(p.x, p.y, place.x, place.y) < place.radius) {
      completeMission(state);
    }
    return;
  }

  // Mission 5: hold E in the bank to crack the vault, then escape to the Safehouse.
  if (id === 5) {
    if (m.stage === 1) {
      const place = PLACES.bank;
      const inside = dist(p.x, p.y, place.x, place.y) < place.radius;
      if (inside && !p.inCar && state.input.held('KeyE')) {
        m.robProgress += dt;
        state.objective = 'Cracking the vault… ' + Math.ceil(5 - m.robProgress) + 's — hold E!';
        if (m.robProgress >= 5) {
          m.stage = 2;
          m.targetKey = 'safehouse';
          state.objective = 'Vault open! Lose the SPPD and reach the Safehouse.';
          addHeat(state, 65, 'bank robbery');
          state.sound.cash();
          state.toast('You got the gold! Now run!', 'mission');
        }
      } else {
        m.robProgress = Math.max(0, m.robProgress - dt * 2);
        if (!inside) state.objective = 'Get inside Bayfront Bank and hold E to crack the vault.';
      }
      return;
    }
    if (m.stage === 2) {
      if (state.wanted === 0) {
        m.stage = 3;
        state.objective = 'Heat is gone. Get to the Safehouse with the gold.';
      }
      return;
    }
    const place = PLACES.safehouse;
    if (dist(p.x, p.y, place.x, place.y) < place.radius) {
      completeMission(state);
    }
    return;
  }
}
