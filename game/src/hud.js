// HUD and menus: minimap, wanted stars, money, health, speed, mission
// tracker, toasts, and the title / pause / busted / wasted screens.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, GAME_TITLE, GAME_SUBTITLE, MISSION_DEFS } from './config.js';
import { clamp } from './random.js';
import { missionObjectiveText } from './missions.js';
import { nearShop, shopPrompt } from './economy.js';

const MAP_W = 210;
const MAP_H = 158;

export function createMinimap(state) {
  const c = document.createElement('canvas');
  c.width = MAP_W;
  c.height = MAP_H;
  const g = c.getContext('2d');
  g.drawImage(state.cityBg, 0, 0, MAP_W, MAP_H);
  return c;
}

function panel(g, x, y, w, h, alpha = 0.72) {
  g.fillStyle = `rgba(10,12,16,${alpha})`;
  g.beginPath();
  g.roundRect(x, y, w, h, 10);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = 1;
  g.stroke();
}

function drawStars(g, x, y, stars) {
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i < stars ? '#ffd34d' : 'rgba(255,255,255,0.25)';
    drawStar(g, x + i * 26, y, 11);
  }
}

function drawStar(g, cx, cy, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
}

export function renderHUD(ctx, state, input) {
  const g = ctx;
  const p = state.player;

  // --- Top-left: mission objective -----------------------------------------
  const objective = missionObjectiveText(state);
  g.font = 'bold 15px sans-serif';
  const ow = Math.min(560, g.measureText(objective).width + 28);
  panel(g, 14, 14, ow, 46);
  g.fillStyle = '#ffd34d';
  g.fillText('◆', 28, 43);
  g.fillStyle = '#fff';
  g.font = '14px sans-serif';
  g.fillText(objective.slice(0, 72), 46, 43);

  // --- Top-right: money, wanted, health, ammo ------------------------------
  panel(g, VIEW_W - 264, 14, 250, 96);
  g.fillStyle = '#2ecc71';
  g.font = 'bold 22px sans-serif';
  g.textAlign = 'right';
  g.fillText(`$${state.money.toLocaleString('en-US')}`, VIEW_W - 30, 42);
  g.textAlign = 'left';
  drawStars(g, VIEW_W - 252, 62, state.wantedStars);
  // Health bar.
  g.fillStyle = 'rgba(255,255,255,0.2)';
  g.fillRect(VIEW_W - 252, 78, 150, 10);
  g.fillStyle = p.health > 40 ? '#2ecc71' : '#e74c3c';
  g.fillRect(VIEW_W - 252, 78, 150 * clamp(p.health / p.maxHealth, 0, 1), 10);
  g.fillStyle = '#fff';
  g.font = '11px sans-serif';
  g.fillText(`HP ${Math.round(p.health)}`, VIEW_W - 96, 87);
  g.fillStyle = '#f39c12';
  g.fillText(`Ammo ${p.ammo}`, VIEW_W - 96, 104);
  g.fillStyle = '#fff';
  g.fillText('M — missions   P — pause', VIEW_W - 252, 104);

  // --- Bottom-left: minimap -------------------------------------------------
  panel(g, 14, VIEW_H - MAP_H - 26, MAP_W + 12, MAP_H + 12, 0.85);
  g.save();
  g.beginPath();
  g.rect(20, VIEW_H - MAP_H - 20, MAP_W, MAP_H);
  g.clip();
  g.drawImage(state.minimap, 20, VIEW_H - MAP_H - 20);
  const sx = MAP_W / WORLD_W;
  const sy = MAP_H / WORLD_H;
  const mx0 = 20;
  const my0 = VIEW_H - MAP_H - 20;
  // Mission target blip.
  if (state.missions.target) {
    const t = state.missions.target;
    g.fillStyle = '#ffd34d';
    g.beginPath();
    g.arc(mx0 + t.x * sx, my0 + t.y * sy, 6, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.stroke();
  }
  // Police blips.
  for (const car of state.cars) {
    if (!car.police) continue;
    g.fillStyle = Math.sin(state.time * 8) > 0 ? '#ff2d2d' : '#2d6bff';
    g.beginPath();
    g.arc(mx0 + car.x * sx, my0 + car.y * sy, 4, 0, Math.PI * 2);
    g.fill();
  }
  // Player arrow.
  const px = mx0 + p.x * sx;
  const py = my0 + p.y * sy;
  g.save();
  g.translate(px, py);
  g.rotate(p.angle);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(8, 0);
  g.lineTo(-6, -5);
  g.lineTo(-6, 5);
  g.closePath();
  g.fill();
  g.strokeStyle = '#1abc9c';
  g.lineWidth = 2;
  g.stroke();
  g.restore();
  g.restore();
  g.fillStyle = '#fff';
  g.font = 'bold 12px sans-serif';
  g.fillText('SOLMAR BAY', 22, VIEW_H - MAP_H - 32);

  // --- Bottom-right: speed / controls ---------------------------------------
  if (p.inCar && p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.36);
    panel(g, VIEW_W - 190, VIEW_H - 84, 176, 70);
    g.fillStyle = '#fff';
    g.font = 'bold 30px sans-serif';
    g.textAlign = 'right';
    g.fillText(`${kmh}`, VIEW_W - 66, VIEW_H - 40);
    g.font = '13px sans-serif';
    g.fillStyle = '#ffd34d';
    g.fillText('km/h', VIEW_W - 28, VIEW_H - 40);
    g.textAlign = 'left';
    g.fillStyle = '#ccc';
    g.font = '11px sans-serif';
    g.fillText(p.car.name, VIEW_W - 178, VIEW_H - 62);
    g.fillText('E — exit car', VIEW_W - 178, VIEW_H - 26);
  } else {
    panel(g, VIEW_W - 250, VIEW_H - 84, 236, 70);
    g.fillStyle = '#fff';
    g.font = '12px sans-serif';
    g.fillText('WASD — move    Shift — sprint', VIEW_W - 238, VIEW_H - 58);
    g.fillText('Mouse — aim    Click — shoot', VIEW_W - 238, VIEW_H - 40);
    g.fillStyle = '#ffd34d';
    g.fillText('E — steal car / use shop', VIEW_W - 238, VIEW_H - 24);
  }

  // --- Shop prompt ------------------------------------------------------------
  const shop = nearShop(state);
  if (shop && !p.inCar) {
    const text = shopPrompt(state, shop);
    g.font = 'bold 14px sans-serif';
    const w = g.measureText(text).width + 28;
    panel(g, (VIEW_W - w) / 2, VIEW_H - 150, w, 34, 0.85);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.fillText(text, VIEW_W / 2, VIEW_H - 128);
    g.textAlign = 'left';
  }

  // --- Crime flash --------------------------------------------------------------
  if (state.crimeFlash > 0 && state.lastCrime) {
    g.globalAlpha = Math.min(1, state.crimeFlash);
    g.fillStyle = '#ff6b5e';
    g.font = 'bold 15px sans-serif';
    g.textAlign = 'center';
    g.fillText(`★ ${state.lastCrime} — wanted level up!`, VIEW_W / 2, 92);
    g.textAlign = 'left';
    g.globalAlpha = 1;
  }

  // --- Mission banner -------------------------------------------------------------
  const m = state.missions;
  if (m.bannerTimer > 0 && m.banner) {
    g.globalAlpha = Math.min(1, m.bannerTimer);
    g.font = 'bold 26px sans-serif';
    const w = g.measureText(m.banner).width + 40;
    panel(g, (VIEW_W - w) / 2, 130, w, 48, 0.85);
    g.fillStyle = '#ffd34d';
    g.textAlign = 'center';
    g.fillText(m.banner, VIEW_W / 2, 162);
    g.textAlign = 'left';
    g.globalAlpha = 1;
  }

  // --- Toasts -----------------------------------------------------------------------
  let ty = VIEW_H - 190;
  for (const toast of state.toasts) {
    g.globalAlpha = Math.min(1, toast.life);
    g.font = '13px sans-serif';
    const w = g.measureText(toast.text).width + 24;
    panel(g, (VIEW_W - w) / 2, ty, w, 26, 0.8);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.fillText(toast.text, VIEW_W / 2, ty + 18);
    g.textAlign = 'left';
    ty -= 32;
    g.globalAlpha = 1;
  }

  // --- Crosshair ----------------------------------------------------------------------
  if (p.onFoot) {
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 2;
    const cx = input.mouse.x;
    const cy = input.mouse.y;
    g.beginPath();
    g.arc(cx, cy, 9, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(cx - 13, cy);
    g.lineTo(cx - 5, cy);
    g.moveTo(cx + 5, cy);
    g.lineTo(cx + 13, cy);
    g.moveTo(cx, cy - 13);
    g.lineTo(cx, cy - 5);
    g.moveTo(cx, cy + 5);
    g.lineTo(cx, cy + 13);
    g.stroke();
  }
}

// --- Menus -----------------------------------------------------------------------------

function drawTitleBackdrop(g, state) {
  // A warm sunset gradient behind the menu, with the city minimap as a motif.
  const grad = g.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#ff9a5a');
  grad.addColorStop(0.55, '#e86a6a');
  grad.addColorStop(1, '#2e4a6e');
  g.fillStyle = grad;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.globalAlpha = 0.25;
  g.drawImage(state.cityBg, 0, 0, VIEW_W, VIEW_H);
  g.globalAlpha = 1;
}

export function renderTitle(ctx, state, input) {
  const g = ctx;
  drawTitleBackdrop(g, state);
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  g.font = 'bold 84px sans-serif';
  g.shadowColor = 'rgba(0,0,0,0.5)';
  g.shadowBlur = 18;
  g.fillText(GAME_TITLE, VIEW_W / 2, 190);
  g.shadowBlur = 0;
  g.font = 'bold 30px sans-serif';
  g.fillStyle = '#ffd34d';
  g.fillText(GAME_SUBTITLE, VIEW_W / 2, 236);
  g.font = '16px sans-serif';
  g.fillStyle = '#fff';
  g.fillText('An original open-world crime story. Steal cars, outrun the SPPD, run five jobs', VIEW_W / 2, 282);
  g.fillText('across Solmar Bay — and become the king of the streets.', VIEW_W / 2, 306);

  const buttons = [];
  const bw = 320;
  const bx = (VIEW_W - bw) / 2;
  let by = 350;
  const hasSave = !!state.save;
  buttons.push({ id: 'new', label: '▶  NEW GAME', x: bx, y: by, w: bw, h: 52 });
  by += 64;
  if (hasSave) {
    buttons.push({ id: 'continue', label: '↻  CONTINUE', x: bx, y: by, w: bw, h: 52 });
    by += 64;
  }
  buttons.push({ id: 'how', label: '?  HOW TO PLAY', x: bx, y: by, w: bw, h: 52 });
  state.ui.buttons = buttons;
  for (const b of buttons) {
    const hover = input.mouse.x > b.x && input.mouse.x < b.x + b.w && input.mouse.y > b.y && input.mouse.y < b.y + b.h;
    g.fillStyle = hover ? '#ffd34d' : 'rgba(10,12,16,0.8)';
    g.beginPath();
    g.roundRect(b.x, b.y, b.w, b.h, 12);
    g.fill();
    g.strokeStyle = hover ? '#fff' : 'rgba(255,255,255,0.4)';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = hover ? '#1a1a1a' : '#fff';
    g.font = 'bold 19px sans-serif';
    g.fillText(b.label, VIEW_W / 2, b.y + 34);
  }
  g.font = '13px sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText('WASD move / drive  •  E steal car & use shops  •  Mouse aim, click shoot  •  M missions  •  P pause', VIEW_W / 2, VIEW_H - 44);
  g.fillText('Progress saves at the Safehouse. Sound: N toggles mute. Best played with keyboard + mouse.', VIEW_W / 2, VIEW_H - 22);
  g.textAlign = 'left';
}

export function renderHowTo(ctx, state, input) {
  const g = ctx;
  drawTitleBackdrop(g, state);
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  g.font = 'bold 40px sans-serif';
  g.fillText('HOW TO PLAY', VIEW_W / 2, 110);
  const lines = [
    'You are Vex Marlowe, a driver fresh off the ferry in Solmar Bay.',
    'Work five jobs for Rico and the crew. Each job pays — spend it on cars,',
    'ammo, treatment and cop payoffs at the shops around the city.',
    '',
    'WASD / arrows — move on foot, drive a car.  Shift — sprint.',
    'E — steal the nearest car, exit a car, use a shop.',
    'Mouse — aim.  Left click — fire your pistol.',
    'Space — handbrake.  M — mission list.  P / Esc — pause.',
    '',
    'Crimes raise your wanted level (up to 5 stars). The SPPD will chase you.',
    'Lose the cops to cool down — or pay $150 at Paint & Repair.',
    'Getting busted costs a $150 fine. Getting wasted costs a $100 hospital bill.',
    'Save at the Safehouse. The story ends when the Bayfront Job is done.',
  ];
  g.font = '16px sans-serif';
  lines.forEach((line, i) => g.fillText(line, VIEW_W / 2, 160 + i * 28));
  const b = { id: 'back', label: '←  BACK', x: (VIEW_W - 220) / 2, y: 560, w: 220, h: 50 };
  state.ui.buttons = [b];
  const hover = input.mouse.x > b.x && input.mouse.x < b.x + b.w && input.mouse.y > b.y && input.mouse.y < b.y + b.h;
  g.fillStyle = hover ? '#ffd34d' : 'rgba(10,12,16,0.8)';
  g.beginPath();
  g.roundRect(b.x, b.y, b.w, b.h, 12);
  g.fill();
  g.fillStyle = hover ? '#1a1a1a' : '#fff';
  g.font = 'bold 18px sans-serif';
  g.fillText(b.label, VIEW_W / 2, b.y + 33);
  g.textAlign = 'left';
}

export function renderPause(ctx, state, input) {
  const g = ctx;
  g.fillStyle = 'rgba(8,10,14,0.72)';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  g.font = 'bold 44px sans-serif';
  g.fillText('PAUSED', VIEW_W / 2, 150);
  const buttons = [];
  const bw = 300;
  const bx = (VIEW_W - bw) / 2;
  let by = 200;
  for (const item of [
    { id: 'resume', label: '▶  RESUME' },
    { id: 'missions', label: '◆  MISSIONS' },
    { id: 'save', label: '💾  SAVE GAME' },
    { id: 'mute', label: state.audio.muted ? '🔇  UNMUTE' : '🔊  MUTE' },
    { id: 'title', label: '⌂  QUIT TO TITLE' },
  ]) {
    buttons.push({ id: item.id, label: item.label, x: bx, y: by, w: bw, h: 48 });
    by += 60;
  }
  state.ui.buttons = buttons;
  for (const b of buttons) {
    const hover = input.mouse.x > b.x && input.mouse.x < b.x + b.w && input.mouse.y > b.y && input.mouse.y < b.y + b.h;
    g.fillStyle = hover ? '#ffd34d' : 'rgba(255,255,255,0.12)';
    g.beginPath();
    g.roundRect(b.x, b.y, b.w, b.h, 12);
    g.fill();
    g.fillStyle = hover ? '#1a1a1a' : '#fff';
    g.font = 'bold 18px sans-serif';
    g.fillText(b.label, VIEW_W / 2, b.y + 31);
  }
  g.font = '14px sans-serif';
  g.fillStyle = '#ccc';
  g.fillText(`Money $${state.money}   •   Missions done ${state.missions.done.length}/5   •   Cars stolen ${state.stats.carsStolen}`, VIEW_W / 2, VIEW_H - 40);
  g.textAlign = 'left';
}

export function renderMissionList(ctx, state, input) {
  const g = ctx;
  g.fillStyle = 'rgba(8,10,14,0.78)';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.textAlign = 'center';
  g.fillStyle = '#ffd34d';
  g.font = 'bold 36px sans-serif';
  g.fillText('MISSIONS — SOLMAR BAY', VIEW_W / 2, 100);
  const buttons = [];
  let y = 150;
  MISSION_DEFS.forEach((def, i) => {
    const done = state.missions.done.includes(def.id);
    const current = state.missions.index === i && !done;
    g.textAlign = 'left';
    g.fillStyle = done ? '#2ecc71' : current ? '#ffd34d' : '#aaa';
    g.font = 'bold 19px sans-serif';
    g.fillText(`${done ? '✓' : current ? '▶' : '○'}  ${def.title} — $${def.payout}`, 240, y);
    g.fillStyle = '#ddd';
    g.font = '14px sans-serif';
    g.fillText(def.brief, 268, y + 24);
    if (!done) {
      const b = { id: `mission-${i}`, label: current ? 'ACTIVE' : 'START', x: 980, y: y - 22, w: 110, h: 34 };
      buttons.push(b);
      const hover = input.mouse.x > b.x && input.mouse.x < b.x + b.w && input.mouse.y > b.y && input.mouse.y < b.y + b.h;
      g.fillStyle = hover ? '#ffd34d' : 'rgba(255,255,255,0.14)';
      g.beginPath();
      g.roundRect(b.x, b.y, b.w, b.h, 8);
      g.fill();
      g.fillStyle = hover ? '#1a1a1a' : '#fff';
      g.font = 'bold 13px sans-serif';
      g.textAlign = 'center';
      g.fillText(b.label, b.x + b.w / 2, b.y + 22);
      g.textAlign = 'left';
    }
    y += 76;
  });
  const back = { id: 'back', label: '←  BACK', x: (VIEW_W - 220) / 2, y: y + 20, w: 220, h: 50 };
  buttons.push(back);
  const hover = input.mouse.x > back.x && input.mouse.x < back.x + back.w && input.mouse.y > back.y && input.mouse.y < back.y + back.h;
  g.fillStyle = hover ? '#ffd34d' : 'rgba(255,255,255,0.14)';
  g.beginPath();
  g.roundRect(back.x, back.y, back.w, back.h, 12);
  g.fill();
  g.fillStyle = hover ? '#1a1a1a' : '#fff';
  g.font = 'bold 18px sans-serif';
  g.textAlign = 'center';
  g.fillText(back.label, VIEW_W / 2, back.y + 33);
  g.textAlign = 'left';
  state.ui.buttons = buttons;
}

export function renderEndScreen(ctx, state, input, kind) {
  const g = ctx;
  const isBusted = kind === 'busted';
  const isWasted = kind === 'wasted';
  const isComplete = kind === 'complete';
  g.fillStyle = isComplete ? 'rgba(20,40,20,0.78)' : 'rgba(20,8,8,0.78)';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.textAlign = 'center';
  g.fillStyle = isComplete ? '#2ecc71' : '#ff3b30';
  g.font = 'bold 72px sans-serif';
  g.fillText(isBusted ? 'BUSTED!' : isWasted ? 'WASTED' : 'KING OF SOLMAR BAY', VIEW_W / 2, 260);
  g.fillStyle = '#fff';
  g.font = '18px sans-serif';
  if (isBusted) {
    g.fillText('The SPPD caught you. Fine: $150. Your car was impounded.', VIEW_W / 2, 320);
  } else if (isWasted) {
    g.fillText('You got taken down. Hospital bill: $100.', VIEW_W / 2, 320);
  } else {
    g.fillText(`You pulled off the Bayfront Job and own this city. Final take: $${state.money}.`, VIEW_W / 2, 320);
    g.fillText(`Missions done: 5/5   •   Cars stolen: ${state.stats.carsStolen}   •   Rivals down: ${state.stats.kills}`, VIEW_W / 2, 352);
  }
  const b = { id: 'respawn', label: isComplete ? '↻  KEEP PLAYING (FREE ROAM)' : '↻  RESPAWN AT THE SAFEHOUSE', x: (VIEW_W - 380) / 2, y: 400, w: 380, h: 54 };
  state.ui.buttons = [b];
  const hover = input.mouse.x > b.x && input.mouse.x < b.x + b.w && input.mouse.y > b.y && input.mouse.y < b.y + b.h;
  g.fillStyle = hover ? '#ffd34d' : 'rgba(255,255,255,0.14)';
  g.beginPath();
  g.roundRect(b.x, b.y, b.w, b.h, 12);
  g.fill();
  g.fillStyle = hover ? '#1a1a1a' : '#fff';
  g.font = 'bold 18px sans-serif';
  g.fillText(b.label, VIEW_W / 2, b.y + 35);
  g.font = '14px sans-serif';
  g.fillStyle = '#ccc';
  g.fillText('or press Enter', VIEW_W / 2, b.y + 84);
  g.textAlign = 'left';
}
