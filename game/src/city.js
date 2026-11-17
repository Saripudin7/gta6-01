// Solmar Bay city generation: a road grid, building blocks, parks, a
// beach with a boardwalk, and docks. The city is pre-rendered once to an
// offscreen canvas, so the frame loop only draws the visible slice.
import { WORLD_W, WORLD_H, ROAD_W, BLOCK, PALETTE, PLACES } from './config.js';
import { makeRng, pick, range, int } from './random.js';

export function roadCentersX() {
  const xs = [];
  for (let x = 0; x <= WORLD_W; x += BLOCK) xs.push(x);
  return xs;
}

export function roadCentersY() {
  const ys = [];
  for (let y = 0; y <= WORLD_H; y += BLOCK) ys.push(y);
  return ys;
}

// True when a point sits on asphalt (inside a road strip).
export function isOnRoad(x, y) {
  const rx = x % BLOCK;
  const ry = y % BLOCK;
  return rx < ROAD_W / 2 || rx > BLOCK - ROAD_W / 2 || ry < ROAD_W / 2 || ry > BLOCK - ROAD_W / 2;
}

export function snapToRoad(v) {
  return Math.round(v / BLOCK) * BLOCK;
}

export function generateCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const parks = [];
  const lots = [];
  const cols = WORLD_W / BLOCK;
  const rows = WORLD_H / BLOCK;

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const x0 = bx * BLOCK + ROAD_W / 2;
      const y0 = by * BLOCK + ROAD_W / 2;
      const w = BLOCK - ROAD_W;
      const h = BLOCK - ROAD_W;
      // Beach strip along the south edge.
      if (by === rows - 1) {
        lots.push({ kind: 'beach', x: x0, y: y0, w, h });
        continue;
      }
      // Docks along the east edge.
      if (bx === cols - 1 && by >= 1 && by <= 3) {
        lots.push({ kind: 'docks', x: x0, y: y0, w, h });
        continue;
      }
      // A park every so often, with a pond and trees.
      if (rng() < 0.14) {
        parks.push({ x: x0, y: y0, w, h });
        for (let i = 0; i < 7; i++) {
          trees.push({ x: x0 + range(rng, 20, w - 20), y: y0 + range(rng, 20, h - 20), r: range(rng, 9, 16) });
        }
        continue;
      }
      // A plaza with a fountain.
      if (rng() < 0.08) {
        lots.push({ kind: 'plaza', x: x0, y: y0, w, h });
        continue;
      }
      // Buildings: 2–4 per block, kept off the sidewalk edge and apart.
      const n = int(rng, 2, 4);
      const placed = [];
      for (let i = 0; i < n; i++) {
        const bw = range(rng, 80, 150);
        const bh = range(rng, 70, 130);
        const bx0 = x0 + range(rng, 8, Math.max(9, w - bw - 8));
        const by0 = y0 + range(rng, 8, Math.max(9, h - bh - 8));
        const overlap = placed.some(
          (s) => bx0 < s.x + s.w + 14 && bx0 + bw + 14 > s.x && by0 < s.y + s.h + 14 && by0 + bh + 14 > s.y,
        );
        if (overlap) continue;
        placed.push({ x: bx0, y: by0, w: bw, h: bh });
        buildings.push({ x: bx0, y: by0, w: bw, h: bh, roof: pick(rng, PALETTE.roofs), tall: rng() < 0.25 });
      }
      // Street trees along the block edge.
      for (let i = 0; i < 3; i++) {
        trees.push({ x: x0 + range(rng, 10, w - 10), y: y0 + 4, r: range(rng, 7, 11) });
      }
    }
  }

  // Named places must stay reachable: clear buildings around them.
  const clearAround = (cx, cy, radius) => {
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if (b.x < cx + radius && b.x + b.w > cx - radius && b.y < cy + radius && b.y + b.h > cy - radius) {
        buildings.splice(i, 1);
      }
    }
  };
  clearAround(PLACES.safehouse.x, PLACES.safehouse.y, 90);
  clearAround(PLACES.paintShop.x, PLACES.paintShop.y, 90);
  clearAround(PLACES.bank.x, PLACES.bank.y, 90);
  clearAround(PLACES.carLot.x, PLACES.carLot.y, 110);
  clearAround(PLACES.gunShop.x, PLACES.gunShop.y, 80);
  clearAround(PLACES.hospital.x, PLACES.hospital.y, 80);

  return { buildings, trees, parks, lots, seed };
}

// The building a point sits inside, or null.
export function hitBuilding(city, x, y, pad = 0) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

// Push a circle out of the building it overlaps; true when it was inside.
export function resolveBuildingCollision(city, obj, radius) {
  const b = hitBuilding(city, obj.x, obj.y, 0);
  if (!b) return false;
  const left = obj.x - (b.x - radius);
  const right = b.x + b.w + radius - obj.x;
  const top = obj.y - (b.y - radius);
  const bottom = b.y + b.h + radius - obj.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) obj.x = b.x - radius;
  else if (m === right) obj.x = b.x + b.w + radius;
  else if (m === top) obj.y = b.y - radius;
  else obj.y = b.y + b.h + radius;
  return true;
}

export function renderCityBackground(city) {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const g = canvas.getContext('2d');

  // Grass base.
  g.fillStyle = PALETTE.grass;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // Sea, sand and boardwalk along the south edge.
  g.fillStyle = PALETTE.sand;
  g.fillRect(0, WORLD_H - 200, WORLD_W, 200);
  g.fillStyle = PALETTE.sea;
  g.fillRect(0, WORLD_H - 110, WORLD_W, 110);
  g.fillStyle = PALETTE.seaDeep;
  for (let x = 0; x < WORLD_W; x += 90) {
    g.fillRect(x + 20, WORLD_H - 84, 46, 4);
    g.fillRect(x + 55, WORLD_H - 52, 30, 4);
  }
  g.fillStyle = '#a98f66';
  g.fillRect(0, WORLD_H - 206, WORLD_W, 8);

  // Parks with ponds, plazas with fountains, docks with piers.
  for (const p of city.parks) {
    g.fillStyle = PALETTE.park;
    g.fillRect(p.x, p.y, p.w, p.h);
    g.strokeStyle = '#4a7d3c';
    g.lineWidth = 4;
    g.strokeRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);
    g.fillStyle = '#6fb3c9';
    g.beginPath();
    g.ellipse(p.x + p.w / 2, p.y + p.h / 2, 34, 22, 0, 0, Math.PI * 2);
    g.fill();
  }
  for (const l of city.lots) {
    if (l.kind === 'plaza') {
      g.fillStyle = PALETTE.plaza;
      g.fillRect(l.x, l.y, l.w, l.h);
      g.fillStyle = '#7fb3c9';
      g.beginPath();
      g.arc(l.x + l.w / 2, l.y + l.h / 2, 22, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = PALETTE.plaza;
      g.beginPath();
      g.arc(l.x + l.w / 2, l.y + l.h / 2, 12, 0, Math.PI * 2);
      g.fill();
    } else if (l.kind === 'docks') {
      g.fillStyle = '#8a7a5c';
      g.fillRect(l.x, l.y, l.w, l.h);
      g.fillStyle = '#5d5342';
      for (let i = 0; i < 5; i++) g.fillRect(l.x + 20 + i * 56, l.y + 30, 34, 90);
      g.fillStyle = PALETTE.sea;
      g.fillRect(l.x, l.y + 140, l.w, l.h - 140);
    }
  }

  // Roads: sidewalk border, asphalt, centre dashes, crosswalks.
  g.fillStyle = PALETTE.sidewalk;
  for (let x = 0; x <= WORLD_W; x += BLOCK) g.fillRect(x - ROAD_W / 2 - 8, 0, ROAD_W + 16, WORLD_H);
  for (let y = 0; y <= WORLD_H; y += BLOCK) g.fillRect(0, y - ROAD_W / 2 - 8, WORLD_W, ROAD_W + 16);
  g.fillStyle = PALETTE.road;
  for (let x = 0; x <= WORLD_W; x += BLOCK) g.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (let y = 0; y <= WORLD_H; y += BLOCK) g.fillRect(0, y - ROAD_W / 2, WORLD_W, ROAD_W);
  g.fillStyle = PALETTE.lane;
  for (let x = 0; x <= WORLD_W; x += BLOCK) {
    for (let y = 40; y < WORLD_H; y += 80) g.fillRect(x - 2, y, 4, 34);
  }
  for (let y = 0; y <= WORLD_H; y += BLOCK) {
    for (let x = 40; x < WORLD_W; x += 80) g.fillRect(x, y - 2, 34, 4);
  }
  g.fillStyle = '#d8d2c2';
  for (let x = 0; x <= WORLD_W; x += BLOCK) {
    for (let y = 0; y <= WORLD_H; y += BLOCK) {
      for (let i = -3; i <= 3; i++) {
        g.fillRect(x + i * 10 - 3, y - ROAD_W / 2 + 4, 6, 12);
        g.fillRect(x + i * 10 - 3, y + ROAD_W / 2 - 16, 6, 12);
      }
    }
  }

  // Buildings: drop shadow, wall, coloured roof, skylight, tall-block core.
  for (const b of city.buildings) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    g.fillStyle = '#e8ddc9';
    g.fillRect(b.x, b.y, b.w, b.h);
    g.fillStyle = b.roof;
    g.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(b.x + 12, b.y + 12, Math.max(8, b.w / 4), Math.max(8, b.h / 5));
    if (b.tall) {
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(b.x + b.w * 0.3, b.y + b.h * 0.3, b.w * 0.4, b.h * 0.4);
      g.fillStyle = '#d8d2c2';
      g.fillRect(b.x + b.w * 0.35, b.y + b.h * 0.35, b.w * 0.3, b.h * 0.3);
    }
  }

  // Trees with a soft shadow.
  for (const t of city.trees) {
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.beginPath();
    g.arc(t.x + 3, t.y + 4, t.r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#4e8a3f';
    g.beginPath();
    g.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#67a854';
    g.beginPath();
    g.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, Math.PI * 2);
    g.fill();
  }

  // Coloured ground pads mark the named places so they read from above.
  const pads = [
    [PLACES.safehouse, '#7fb069'],
    [PLACES.paintShop, '#e07a5f'],
    [PLACES.bank, '#e8c15a'],
    [PLACES.carLot, '#81b29a'],
    [PLACES.gunShop, '#9a8c98'],
    [PLACES.hospital, '#f4f1de'],
  ];
  for (const [place, color] of pads) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(place.x, place.y, 52, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(place.x, place.y, 52, 0, Math.PI * 2);
    g.stroke();
  }

  return canvas;
}
