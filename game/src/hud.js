// Solmar Bay — the HUD and every menu: wanted stars, health, money, ammo,
// the minimap with mission and police blips, the objective tracker, toasts,
// the speedometer, and the title / pause / mission-list / shop screens.

import { VIEW, WORLD, PLACES, MISSIONS, CAR_MODELS, BEACH } from './config.js';
import { clamp, dist } from './random.js';
import { lotOptions } from './economy.js';

// A toast message on screen. kind: 'good' | 'bad' | 'mission' | 'info'.
export function pushToast(state, text, kind) {
  state.toasts.push({ text, kind: kind || 'info', life: 4.5 });
  if (state.toasts.length > 4) state.toasts.shift();
}

export function updateToasts(state, dt) {
  for (const t of state.toasts) t.life -= dt;
  state.toasts = state.toasts.filter((t) => t.life > 0);
}

// Draw a five-pointed star (filled gold or dark outline).
function drawStar(ctx, x, y, r, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#ffd166';
    ctx.fill();
    ctx.strokeStyle = '#7a5c00';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

// A small panel with a dark translucent back.
function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,12,20,0.62)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// The minimap: the whole city shrunk, with the player arrow, police dots,
// the mission diamond and shop letters.
export function drawMinimap(ctx, state) {
  const size = 190;
  const x0 = VIEW.width - size - 14;
  const y0 = 14;
  const scale = size / WORLD.width;
  const mapH = WORLD.height * scale;
  panel(ctx, x0 - 6, y0 - 6, size + 12, mapH + 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, size, mapH);
  ctx.clip();
  // Land, sea and roads.
  ctx.fillStyle = '#5d8a46';
  ctx.fillRect(x0, y0, size, mapH);
  ctx.fillStyle = '#2e86ab';
  ctx.fillRect(x0 + BEACH.x * scale, y0, size - BEACH.x * scale, mapH);
  ctx.fillStyle = '#e8d5a3';
  ctx.fillRect(x0 + 2880 * scale, y0, (BEACH.seaX - 2880) * scale, mapH);
  ctx.strokeStyle = '#3d3d46';
  ctx.lineWidth = 3;
  for (const rx of [200, 600, 1000, 1400, 1800, 2200, 2600]) {
    ctx.beginPath(); ctx.moveTo(x0 + rx * scale, y0); ctx.lineTo(x0 + rx * scale, y0 + mapH); ctx.stroke();
  }
  for (const ry of [200, 600, 1000, 1400, 1800, 2200]) {
    ctx.beginPath(); ctx.moveTo(x0, y0 + ry * scale); ctx.lineTo(x0 + size, y0 + ry * scale); ctx.stroke();
  }
  // Shops.
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  for (const key of Object.keys(PLACES)) {
    const p = PLACES[key];
    if (key === 'plaza' || key === 'pier') continue;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(x0 + p.x * scale, y0 + p.y * scale, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Mission target: a pulsing gold diamond.
  const target = state.missionTarget;
  if (target) {
    const pulse = 5 + Math.sin(state.time * 4) * 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(x0 + target.x * scale, y0 + target.y * scale - pulse);
    ctx.lineTo(x0 + target.x * scale + pulse, y0 + target.y * scale);
    ctx.lineTo(x0 + target.x * scale, y0 + target.y * scale + pulse);
    ctx.lineTo(x0 + target.x * scale - pulse, y0 + target.y * scale);
    ctx.closePath(); ctx.fill();
  }
  // Police cruisers: flashing red-blue dots.
  for (const cop of state.police) {
    ctx.fillStyle = Math.floor(state.time * 5) % 2 === 0 ? '#ff2e2e' : '#2e7dff';
    ctx.beginPath(); ctx.arc(x0 + cop.x * scale, y0 + cop.y * scale, 4, 0, Math.PI * 2); ctx.fill();
  }
  // The player: a white arrow pointing where Vex faces.
  const p = state.player;
  ctx.save();
  ctx.translate(x0 + p.x * scale, y0 + p.y * scale);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-5, 4.5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
  // North label.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N', x0 + 4, y0 + 13);
  ctx.fillText('SOLMAR BAY', x0 + 18, y0 + 13);
}

// The main in-game HUD: stars, health, money, ammo, objective, toasts.
export function drawHUD(ctx, state) {
  const p = state.player;
  // Top-left: wanted stars + health bar.
  panel(ctx, 14, 14, 250, 64);
  for (let i = 0; i < 5; i += 1) drawStar(ctx, 34 + i * 26, 34, 11, i < state.wanted);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(state.wanted > 0 ? 'WANTED — SPPD' : 'CLEAN', 168, 30);
  ctx.fillText('♥', 22, 62);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(44, 52, 200, 12);
  const healthW = 200 * clamp(p.health / 100, 0, 1);
  ctx.fillStyle = p.health > 50 ? '#57cc5a' : p.health > 25 ? '#ffb347' : '#ef476f';
  ctx.fillRect(44, 52, healthW, 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(Math.round(p.health) + '', 248 - 26, 62);

  // Top-centre: the objective tracker.
  if (state.objective) {
    ctx.font = 'bold 15px sans-serif';
    const w = Math.min(620, ctx.measureText(state.objective).width + 28);
    panel(ctx, (VIEW.width - w) / 2, 14, w, 34);
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(state.objective, VIEW.width / 2, 36);
    // Mission timer, when one is running.
    if (state.missionTimer > 0) {
      ctx.fillStyle = state.missionTimer < 20 ? '#ef476f' : '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(Math.ceil(state.missionTimer) + 's', VIEW.width / 2, 66);
    }
  }

  // Bottom-left: money and ammo.
  panel(ctx, 14, VIEW.height - 64, 250, 50);
  ctx.fillStyle = '#7ee081';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('$' + Math.round(p.money), 28, VIEW.height - 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('◉ ' + p.ammo + ' rounds', 150, VIEW.height - 31);

  // Bottom-right: speedometer while driving.
  if (p.inCar) {
    const car = p.inCar;
    const kmh = Math.round(Math.abs(car.speed) * 0.55);
    panel(ctx, VIEW.width - 214, VIEW.height - 64, 200, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(kmh + '', VIEW.width - 66, VIEW.height - 30);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('km/h', VIEW.width - 26, VIEW.height - 30);
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(car.name, VIEW.width - 200, VIEW.height - 30);
  }

  // Toasts, newest at the bottom of the stack.
  ctx.textAlign = 'left';
  let ty = VIEW.height - 120;
  for (let i = state.toasts.length - 1; i >= 0; i -= 1) {
    const t = state.toasts[i];
    ctx.globalAlpha = clamp(t.life, 0, 1);
    ctx.font = 'bold 14px sans-serif';
    const w = ctx.measureText(t.text).width + 24;
    ctx.fillStyle = t.kind === 'bad' ? 'rgba(120,20,20,0.8)' : t.kind === 'good' ? 'rgba(20,90,40,0.8)' : 'rgba(8,12,20,0.8)';
    ctx.beginPath();
    ctx.roundRect(14, ty - 20, w, 26, 7);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t.text, 26, ty - 2);
    ctx.globalAlpha = 1;
    ty -= 32;
  }

  // Context prompt (shop / steal / package) above the toasts.
  if (state.prompt) {
    ctx.font = 'bold 15px sans-serif';
    const w = ctx.measureText(state.prompt).width + 28;
    panel(ctx, (VIEW.width - w) / 2, VIEW.height - 116, w, 32);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(state.prompt, VIEW.width / 2, VIEW.height - 95);
  }

  // Busted warning: a cruiser is right on top of you.
  if (state.bustedTimer > 0.2 && !p.inCar) {
    ctx.fillStyle = '#ef476f';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE SPPD IS GRABBING YOU — RUN!', VIEW.width / 2, 110);
  }

  drawMinimap(ctx, state);
}

// A full-screen dark overlay with a centred card.
function overlayCard(ctx, title, lines, footer) {
  ctx.fillStyle = 'rgba(6,10,18,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 640;
  const h = 130 + lines.length * 26 + (footer ? 40 : 0);
  const x = (VIEW.width - w) / 2;
  const y = (VIEW.height - h) / 2;
  ctx.fillStyle = 'rgba(10,16,28,0.94)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, y + 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW.width / 2, y + 92 + i * 26);
  });
  if (footer) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(footer, VIEW.width / 2, y + h - 18);
  }
}

// The title screen: sun-soaked bay, the name, the story, the controls.
export function drawTitle(ctx, state) {
  ctx.fillStyle = '#1d5f7a';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // A painted sunset bay behind the card.
  const sun = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sun.addColorStop(0, '#ff9a3c');
  sun.addColorStop(0.45, '#ff6b6b');
  sun.addColorStop(0.75, '#2e86ab');
  sun.addColorStop(1, '#1d5f7a');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(VIEW.width - 200, 130, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(140 + i * 230, 470 + (i % 2) * 60, 130, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#0d2b3d';
  ctx.fillRect(0, 560, VIEW.width, 160);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR BAY', VIEW.width / 2, 170);
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('— Streets of Gold —', VIEW.width / 2, 214);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('Vex Marlowe just got off the ferry with $120 and a pistol.', VIEW.width / 2, 260);
  ctx.fillText('Rico has five jobs for him. The SPPD has other plans.', VIEW.width / 2, 286);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText('WASD drive & walk · Mouse aim · Click shoot · E steal / enter / use · Space handbrake', VIEW.width / 2, 340);
  ctx.fillText('Shift run · P pause · M missions · N mute · Save at the Safehouse', VIEW.width / 2, 364);
  if (state.hasSave) {
    ctx.fillStyle = '#7ee081';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('Save found — press ENTER to continue your story, or C for a fresh start.', VIEW.width / 2, 420);
  } else {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText('Press ENTER or click to start', VIEW.width / 2, 420);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '13px sans-serif';
  ctx.fillText('An original open-world crime game. No Rockstar names, art or music — just Solmar Bay.', VIEW.width / 2, 690);
}

// Pause menu.
export function drawPause(ctx, state) {
  overlayCard(ctx, 'PAUSED', [
    'Take a breath, Vex. The city waits.',
    'Missions done: ' + state.missionsDone + ' / 5    ·    Cash: $' + Math.round(state.player.money),
    'P / Esc — resume      M — mission list      N — mute (' + (state.sound.muted ? 'muted' : 'on') + ')',
  ], 'Press P to keep playing');
}

// The mission list: all five jobs, their state, and how to start one.
export function drawMissionList(ctx, state) {
  ctx.fillStyle = 'rgba(6,10,18,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RICO\'S JOBS', VIEW.width / 2, 90);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Press 1–5 to start a job · M / Esc to close', VIEW.width / 2, 120);
  let y = 170;
  MISSIONS.forEach((m, i) => {
    const done = i < state.missionsDone;
    const active = state.mission && state.mission.def.id === m.id && !state.mission.done && !state.mission.failed;
    const h = 76;
    ctx.fillStyle = active ? 'rgba(255,209,102,0.22)' : 'rgba(10,16,28,0.9)';
    ctx.beginPath();
    ctx.roundRect((VIEW.width - 720) / 2, y, 720, h, 10);
    ctx.fill();
    ctx.strokeStyle = done ? '#57cc5a' : '#ffd166';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = done ? '#7ee081' : active ? '#ffd166' : '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText((done ? '✓ ' : (i + 1) + '. ') + m.title + '   —   $' + m.reward, (VIEW.width - 720) / 2 + 20, y + 30);
    ctx.fillStyle = '#cfd8dc';
    ctx.font = '14px sans-serif';
    ctx.fillText(m.brief, (VIEW.width - 720) / 2 + 20, y + 56);
    y += h + 12;
  });
}

// The car lot menu at Rico's Motors.
export function drawShop(ctx, state) {
  const options = lotOptions(state);
  overlayCard(ctx, "RICO'S MOTORS", [
    'Cash: $' + Math.round(state.player.money) + ' — press 1–3 to buy, Esc to leave.',
    '',
    ...options.map((o, i) => (i + 1) + '. ' + o.name + ' — $' + o.price + (o.owned ? '  (OWNED)' : o.afford ? '' : '  (too expensive)')),
    '',
    'Bought cars park at the lot. Walk up and press E to take one.',
  ], 'Esc — back to the street');
}

// Busted / wasted screens. The fine shown is the one actually paid.
export function drawEndCard(ctx, state, kind) {
  const paid = state.lastFine || 0;
  if (kind === 'busted') {
    overlayCard(ctx, 'BUSTED!', [
      'The SPPD caught up with Vex.',
      'Fine paid: $' + paid + ' — you wake up at the Safehouse.',
      'Missions done: ' + state.missionsDone + ' / 5',
    ], 'Press ENTER to keep playing');
  } else {
    overlayCard(ctx, 'WASTED', [
      'Vex went down in the streets of Solmar Bay.',
      'St. Marina patched him up — bill: $' + paid + '.',
      'Missions done: ' + state.missionsDone + ' / 5',
    ], 'Press ENTER to keep playing');
  }
}
