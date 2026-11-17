// Solmar Bay — the world renderer: blit the prerendered city, then draw the
// moving pieces on top — cars with headlights and strobes, pedestrians,
// Vex, rivals, bullets, particles and mission markers. The camera follows
// the player and leads a little in the direction of travel.

import { VIEW, PLACES, WORLD } from './config.js';
import { clamp } from './random.js';
import { missionTargetPos } from './missions.js';

// Where the camera looks: the player, plus a lead in the direction of motion.
export function updateCamera(state, dt) {
  const p = state.player;
  const lead = p.inCar ? 90 : 40;
  const tx = p.x + Math.cos(p.angle) * lead - VIEW.width / 2;
  const ty = p.y + Math.sin(p.angle) * lead - VIEW.height / 2;
  state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);
  state.camera.x = clamp(state.camera.x, -60, WORLD.width - VIEW.width + 60);
  state.camera.y = clamp(state.camera.y, -60, WORLD.height - VIEW.height + 60);
}

// Draw one top-down car: body, roof, windshield, wheels and lights.
export function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const l = car.length;
  const w = car.width;
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-l / 2 + 3, -w / 2 + 4, l, w);
  // Wheels.
  ctx.fillStyle = '#141414';
  ctx.fillRect(-l / 2 + 6, -w / 2 - 3, 10, 5);
  ctx.fillRect(-l / 2 + 6, w / 2 - 2, 10, 5);
  ctx.fillRect(l / 2 - 16, -w / 2 - 3, 10, 5);
  ctx.fillRect(l / 2 - 16, w / 2 - 2, 10, 5);
  // Body.
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-l / 2, -w / 2, l, w, 6);
  ctx.fill();
  ctx.strokeStyle = car.dark;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Roof and cabin.
  ctx.fillStyle = car.dark;
  ctx.beginPath();
  ctx.roundRect(-l * 0.18, -w / 2 + 3, l * 0.36, w - 6, 4);
  ctx.fill();
  // Windshield and rear window.
  ctx.fillStyle = 'rgba(180,220,240,0.85)';
  ctx.fillRect(l * 0.2, -w / 2 + 3, 5, w - 6);
  ctx.fillRect(-l * 0.24, -w / 2 + 3, 4, w - 6);
  // Headlights.
  ctx.fillStyle = '#fff7c0';
  ctx.fillRect(l / 2 - 2, -w / 2 + 3, 3, 5);
  ctx.fillRect(l / 2 - 2, w / 2 - 8, 3, 5);
  // Police strobes: alternating red and blue flashes.
  if (car.driver === 'police') {
    const phase = Math.floor(time * 6 + car.id) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2e2e' : '#2e7dff';
    ctx.beginPath();
    ctx.arc(0, -w / 2 + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = phase ? '#2e7dff' : '#ff2e2e';
    ctx.beginPath();
    ctx.arc(0, w / 2 - 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Taxi checker stripe.
  if (car.model === 'taxi') {
    ctx.fillStyle = '#141414';
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(-l * 0.2 + i * 6, -w / 2 + 1, 3, 4);
      ctx.fillRect(-l * 0.2 + i * 6, w / 2 - 5, 3, 4);
    }
  }
  ctx.restore();
}

// Draw one pedestrian: a little walking figure with swinging arms.
function drawPed(ctx, ped) {
  const swing = Math.sin(ped.walkPhase) * 4;
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.rotate(ped.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(2, 3, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Legs (two dots that shuffle as they walk).
  ctx.fillStyle = ped.pants;
  ctx.beginPath(); ctx.arc(-3 + swing * 0.4, -4, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-3 - swing * 0.4, 4, 3.4, 0, Math.PI * 2); ctx.fill();
  // Body and head.
  ctx.fillStyle = ped.shirt;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath(); ctx.arc(5, 0, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Draw Vex: a dark-jacketed figure with a pistol, facing the mouse.
function drawPlayer(ctx, p, time) {
  const bob = p.walking ? Math.sin(p.walkPhase) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(1, 3, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Legs.
  ctx.fillStyle = '#23232b';
  ctx.beginPath(); ctx.arc(-4 + bob * 0.5, -5, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-4 - bob * 0.5, 5, 3.6, 0, Math.PI * 2); ctx.fill();
  // Jacket, head, and the gold chain that gives the game its name.
  ctx.fillStyle = '#b02e2e';
  ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath(); ctx.arc(6, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(2, 0, 7, -0.9, 0.9); ctx.stroke();
  // Pistol.
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(8, -2, 12, 4);
  // Muzzle flash.
  if (p.muzzleFlash > 0) {
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath(); ctx.arc(24, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath(); ctx.arc(24, 0, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // Aim line, faint, so the player can read the shot direction.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * 60, p.y + Math.sin(p.angle) * 60);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// A rival gunman: grey suit, red tie dot, pistol in hand.
function drawRival(ctx, rival) {
  ctx.save();
  ctx.translate(rival.x, rival.y);
  ctx.rotate(rival.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(1, 3, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3a44';
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath(); ctx.arc(5, 0, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d90429';
  ctx.fillRect(2, -1, 6, 2);
  ctx.fillStyle = '#111';
  ctx.fillRect(8, -2, 11, 4);
  ctx.restore();
}

// The bouncing diamond marker over the current objective.
function drawMarker(ctx, x, y, time, label) {
  const bob = Math.sin(time * 3) * 6;
  ctx.save();
  ctx.translate(x, y + bob - 26);
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#7a5c00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(11, 0); ctx.lineTo(0, 14); ctx.lineTo(-11, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7a5c00';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', 0, 5);
  ctx.restore();
  // Ground ring.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,209,102,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 26 + Math.sin(time * 3) * 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  if (label) {
    ctx.save();
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const w = ctx.measureText(label).width + 14;
    ctx.fillRect(x - w / 2, y + 34, w, 20);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(label, x, y + 48);
    ctx.restore();
  }
}

// The whole world, in draw order: background, markers, cars, people, bullets.
export function drawWorld(ctx, state) {
  const cam = state.camera;
  const time = state.time;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  ctx.drawImage(state.bgCanvas, 0, 0);

  // Objective marker and shop blips on the ground.
  const target = missionTargetPos(state);
  if (target) drawMarker(ctx, target.x, target.y, time, target.name);
  for (const key of Object.keys(PLACES)) {
    const p = PLACES[key];
    if (key === 'plaza') continue;
    ctx.save();
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(p.name, p.x + 1, p.y - p.radius - 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(p.name, p.x, p.y - p.radius - 7);
    ctx.restore();
  }

  // Parked and traffic cars (dead ones are skipped).
  for (const car of state.cars) {
    if (!car.dead) drawCar(ctx, car, time);
  }
  // Pedestrians.
  for (const ped of state.peds) drawPed(ctx, ped);
  // Rivals.
  for (const rival of state.rivals) {
    if (!rival.dead) drawRival(ctx, rival);
  }
  // Bullets as bright tracers.
  for (const b of state.bullets) {
    ctx.save();
    ctx.strokeStyle = '#ffe66d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  // Particles (sparks, dust, cash).
  for (const pt of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Vex himself, when he is on foot.
  if (!state.player.inCar) drawPlayer(ctx, state.player, time);
  ctx.restore();

  // Warm sun-soaked vignette over everything.
  const grad = ctx.createRadialGradient(
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.45,
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.95,
  );
  grad.addColorStop(0, 'rgba(255,190,80,0)');
  grad.addColorStop(1, 'rgba(120,60,0,0.16)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}
