// World rendering: the camera, the pre-rendered city, cars, pedestrians,
// bullets, particles, mission markers and place labels.
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, PLACES } from './config.js';
import { clamp } from './random.js';

export function createCamera() {
  return { x: 0, y: 0, zoom: 1 };
}

export function updateCamera(state, dt) {
  const cam = state.camera;
  const p = state.player;
  const targetX = clamp(p.x - VIEW_W / 2 / cam.zoom, 0, WORLD_W - VIEW_W / cam.zoom);
  const targetY = clamp(p.y - VIEW_H / 2 / cam.zoom, 0, WORLD_H - VIEW_H / cam.zoom);
  const k = 1 - Math.pow(0.001, dt);
  cam.x += (targetX - cam.x) * k;
  cam.y += (targetY - cam.y) * k;
}

function drawCar(g, car, t) {
  g.save();
  g.translate(car.x, car.y);
  g.rotate(car.angle);
  // Shadow.
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(-car.len / 2 + 3, -car.wid / 2 + 4, car.len, car.wid);
  // Body.
  g.fillStyle = car.color;
  roundRect(g, -car.len / 2, -car.wid / 2, car.len, car.wid, 7);
  g.fill();
  // Roof and windshield.
  g.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(g, -car.len / 6, -car.wid / 2 + 3, car.len / 3, car.wid - 6, 4);
  g.fill();
  g.fillStyle = '#bcd6e8';
  g.fillRect(car.len / 4, -car.wid / 2 + 4, 7, car.wid - 8);
  g.fillRect(-car.len / 3 - 2, -car.wid / 2 + 4, 6, car.wid - 8);
  // Headlights and taillights.
  g.fillStyle = '#fff8c0';
  g.fillRect(car.len / 2 - 2, -car.wid / 2 + 2, 2, 5);
  g.fillRect(car.len / 2 - 2, car.wid / 2 - 7, 2, 5);
  g.fillStyle = '#c0392b';
  g.fillRect(-car.len / 2, -car.wid / 2 + 2, 2, 5);
  g.fillRect(-car.len / 2, car.wid / 2 - 7, 2, 5);
  if (car.police) {
    // Police livery: white doors and a light bar.
    g.fillStyle = '#f4f1de';
    g.fillRect(-car.len / 6 - 4, -car.wid / 2 + 2, 14, car.wid - 4);
    g.fillStyle = '#1a1a1a';
    g.font = 'bold 7px sans-serif';
    g.textAlign = 'center';
    g.save();
    g.rotate(Math.PI / 2);
    g.fillText('SPPD', 0, 3);
    g.restore();
    const flash = Math.sin(car.sirenPhase || 0) > 0;
    g.fillStyle = flash ? '#ff2d2d' : '#2d6bff';
    g.beginPath();
    g.arc(-2, -car.wid / 2 + 2, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = flash ? '#2d6bff' : '#ff2d2d';
    g.beginPath();
    g.arc(-2, car.wid / 2 - 2, 4, 0, Math.PI * 2);
    g.fill();
  }
  if (car.smoke > 0) {
    g.fillStyle = 'rgba(120,120,120,0.6)';
    g.beginPath();
    g.arc(-car.len / 2, 0, 6 + Math.sin(t * 9) * 2, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawPed(g, ped) {
  g.save();
  g.translate(ped.x, ped.y);
  // Shadow.
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath();
  g.ellipse(1, 2, 8, 6, 0, 0, Math.PI * 2);
  g.fill();
  const bob = ped.state === 'flee' ? Math.sin(ped.x * 0.3) * 1.5 : Math.sin(ped.x * 0.1) * 0.5;
  // Body.
  g.fillStyle = ped.shirt;
  g.beginPath();
  g.arc(0, bob * 0.4, 8, 0, Math.PI * 2);
  g.fill();
  // Head.
  g.fillStyle = ped.skin;
  g.beginPath();
  g.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 + bob * 0.4, 5, 0, Math.PI * 2);
  g.fill();
  if (ped.hitFlash > 0) {
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath();
    g.arc(0, 0, 9, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawRival(g, r, t) {
  g.save();
  g.translate(r.x, r.y);
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath();
  g.ellipse(1, 2, 9, 7, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a3a3a';
  g.beginPath();
  g.arc(0, 0, 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e8b88a';
  g.beginPath();
  g.arc(0, 0, 5, 0, Math.PI * 2);
  g.fill();
  // Gun.
  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(12, 0);
  g.stroke();
  // Health pips.
  g.fillStyle = '#c0392b';
  g.fillRect(-10, -16, 20, 3);
  g.fillStyle = '#2ecc71';
  g.fillRect(-10, -16, 20 * (r.health / 3), 3);
  g.restore();
}

export function renderWorld(ctx, state) {
  const cam = state.camera;
  const g = ctx;
  g.save();
  g.clearRect(0, 0, VIEW_W, VIEW_H);
  g.scale(cam.zoom, cam.zoom);
  g.translate(-cam.x, -cam.y);

  // City background slice.
  g.drawImage(state.cityBg, cam.x, cam.y, VIEW_W / cam.zoom, VIEW_H / cam.zoom, cam.x, cam.y, VIEW_W / cam.zoom, VIEW_H / cam.zoom);

  // Place labels.
  g.font = 'bold 13px sans-serif';
  g.textAlign = 'center';
  for (const key of Object.keys(PLACES)) {
    const pl = PLACES[key];
    if (Math.abs(pl.x - state.player.x) > 900 || Math.abs(pl.y - state.player.y) > 700) continue;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    const w = g.measureText(pl.name).width + 12;
    roundRect(g, pl.x - w / 2, pl.y - 62, w, 20, 10);
    g.fill();
    g.fillStyle = '#fff';
    g.fillText(pl.name, pl.x, pl.y - 48);
  }

  // Mission target marker: a pulsing ring + a beam of light.
  const m = state.missions;
  if (m.target) {
    const pulse = 1 + Math.sin(state.time * 4) * 0.15;
    g.strokeStyle = '#ffd34d';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(m.target.x, m.target.y, 34 * pulse, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(255,211,77,0.25)';
    g.beginPath();
    g.arc(m.target.x, m.target.y, 34 * pulse, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffd34d';
    g.beginPath();
    g.moveTo(m.target.x, m.target.y - 78);
    g.lineTo(m.target.x - 10, m.target.y - 52);
    g.lineTo(m.target.x + 10, m.target.y - 52);
    g.closePath();
    g.fill();
  }

  // Pickups.
  for (const pk of state.pickups) {
    g.save();
    g.translate(pk.x, pk.y);
    g.fillStyle = pk.kind === 'cash' ? '#2ecc71' : pk.kind === 'health' ? '#e74c3c' : '#f39c12';
    g.beginPath();
    g.arc(0, 0, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.font = 'bold 11px sans-serif';
    g.textAlign = 'center';
    g.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', 0, 4);
    g.restore();
  }

  // Cars (police last so their lights draw on top).
  const sorted = [...state.cars].sort((a, b) => (a.police ? 1 : 0) - (b.police ? 1 : 0));
  for (const car of sorted) drawCar(g, car, state.time);

  // Pedestrians and rivals.
  for (const ped of state.peds) drawPed(g, ped);
  for (const r of m.rivals) drawRival(g, r, state.time);

  // Bullets.
  for (const b of state.bullets) {
    g.strokeStyle = b.fromPlayer ? '#ffd34d' : '#ff6b5e';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    g.lineTo(b.x, b.y);
    g.stroke();
  }

  // Particles.
  for (const pt of state.particles) {
    g.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    g.fillStyle = pt.color;
    g.beginPath();
    g.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // The player on foot.
  const p = state.player;
  if (p.onFoot) {
    g.save();
    g.translate(p.x, p.y);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath();
    g.ellipse(1, 3, 10, 7, 0, 0, Math.PI * 2);
    g.fill();
    // Legs (simple walk cycle).
    const swing = p.moving ? Math.sin(p.walkCycle) * 4 : 0;
    g.strokeStyle = '#2c3e50';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-swing, 8);
    g.moveTo(0, 0);
    g.lineTo(swing, 8);
    g.stroke();
    // Body — the player's teal jacket.
    g.fillStyle = '#1abc9c';
    g.beginPath();
    g.arc(0, 0, 10, 0, Math.PI * 2);
    g.fill();
    // Head and hair.
    g.fillStyle = '#e8b88a';
    g.beginPath();
    g.arc(Math.cos(p.aimAngle) * 3, Math.sin(p.aimAngle) * 3, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2c2a29';
    g.beginPath();
    g.arc(Math.cos(p.aimAngle) * 3 - 1, Math.sin(p.aimAngle) * 3 - 2, 5, Math.PI, Math.PI * 2);
    g.fill();
    // Pistol.
    g.save();
    g.rotate(p.aimAngle);
    g.fillStyle = '#1a1a1a';
    g.fillRect(8, -1.5, 12, 3);
    g.restore();
    if (p.hurtFlash > 0) {
      g.fillStyle = 'rgba(255,0,0,0.45)';
      g.beginPath();
      g.arc(0, 0, 13, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    // Aim line (short, subtle).
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(p.x + Math.cos(p.aimAngle) * 24, p.y + Math.sin(p.aimAngle) * 24);
    g.lineTo(p.x + Math.cos(p.aimAngle) * 52, p.y + Math.sin(p.aimAngle) * 52);
    g.stroke();
  }

  // Busted meter ring around the player.
  if (state.bustedMeter > 0.05) {
    g.strokeStyle = '#ff2d2d';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(p.x, p.y, 26, -Math.PI / 2, -Math.PI / 2 + state.bustedMeter * Math.PI * 2);
    g.stroke();
  }

  // Screen-space vignette + hurt flash.
  g.restore();
  if (p.hurtFlash > 0) {
    g.fillStyle = `rgba(200,30,30,${p.hurtFlash * 0.35})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (state.wantedStars > 0) {
    const pulse = 0.05 + 0.03 * Math.sin(state.time * 5);
    g.fillStyle = `rgba(40,60,200,${pulse})`;
    g.fillRect(0, 0, VIEW_W, 8);
    g.fillRect(0, 0, 8, VIEW_H);
    g.fillRect(VIEW_W - 8, 0, 8, VIEW_H);
    g.fillRect(0, VIEW_H - 8, VIEW_W, 8);
  }
}
