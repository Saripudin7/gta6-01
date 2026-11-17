// Solmar Bay — the city itself: a seeded grid of roads, blocks, buildings,
// parks, the beach, the boardwalk and the pier. The whole static look is
// painted once onto an offscreen canvas (prerendered background); the game
// then just blits that canvas and draws the moving things on top.

import { WORLD, ROADS_X, ROADS_Y, BEACH, PIER, PALETTE, PLACES } from './config.js';
import { Rng, clamp } from './random.js';

// One city block's building: a rectangle with a roof colour and a height
// shade so the top-down view still reads as a skyline.
function makeBuilding(rng, x, y, w, h) {
  const roofs = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE];
  return {
    x, y, w, h,
    roof: rng.pick(roofs),
    shade: rng.range(0.82, 1.05),
    yard: rng.chance(0.3),
  };
}

// Build the city layout from a seed. Roads are fixed (the grid); everything
// inside the blocks is rolled: buildings, parks, trees and parked cars.
export function buildCity(seed) {
  const rng = new Rng(seed);
  const buildings = [];
  const parks = [];
  const trees = [];
  const parked = [];
  const roadHalf = WORLD.roadWidth / 2;

  for (let bx = 0; bx < ROADS_X.length - 1; bx += 1) {
    for (let by = 0; by < ROADS_Y.length - 1; by += 1) {
      const x0 = ROADS_X[bx] + roadHalf + 14;
      const y0 = ROADS_Y[by] + roadHalf + 14;
      const x1 = ROADS_X[bx + 1] - roadHalf - 14;
      const y1 = ROADS_Y[by + 1] - roadHalf - 14;
      // The marina plaza block stays open: no buildings there.
      const isPlaza = bx === 2 && by === 2;
      const isPark = !isPlaza && rng.chance(0.16);
      if (isPlaza || isPark) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, plaza: isPlaza });
        const count = rng.int(6, 12);
        for (let i = 0; i < count; i += 1) {
          trees.push({ x: rng.range(x0 + 10, x1 - 10), y: rng.range(y0 + 10, y1 - 10), r: rng.range(7, 13) });
        }
        continue;
      }
      // Split the block into 1-4 buildings.
      const cols = rng.chance(0.5) ? 2 : 1;
      const rows = rng.chance(0.4) ? 2 : 1;
      const cw = (x1 - x0) / cols;
      const ch = (y1 - y0) / rows;
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          const pad = 12;
          buildings.push(makeBuilding(
            rng,
            x0 + cx * cw + pad, y0 + cy * ch + pad,
            cw - pad * 2, ch - pad * 2,
          ));
        }
      }
      // A few street trees along the block edges.
      const treeCount = rng.int(2, 5);
      for (let i = 0; i < treeCount; i += 1) {
        trees.push({ x: rng.range(x0, x1), y: rng.chance(0.5) ? y0 + 6 : y1 - 6, r: rng.range(6, 10) });
      }
      // Parked cars along the block's south kerb.
      if (rng.chance(0.75)) {
        const n = rng.int(1, 3);
        for (let i = 0; i < n; i += 1) {
          parked.push({
            x: x0 + 40 + i * 62 + rng.range(-6, 6),
            y: y1 - 4,
            angle: Math.PI / 2,
            model: rng.pick(['sedan', 'coupe', 'pickup', 'taxi', 'van']),
          });
        }
      }
    }
  }

  // Extra parked cars near the ferry and the docks, for the first steal.
  parked.push({ x: 420, y: 2080, angle: 0, model: 'sedan' });
  parked.push({ x: 420, y: 2140, angle: 0, model: 'coupe' });
  parked.push({ x: 2520, y: 380, angle: Math.PI / 2, model: 'pickup' });
  parked.push({ x: 2580, y: 380, angle: Math.PI / 2, model: 'taxi' });

  return { seed, buildings, parks, trees, parked };
}

// True when a point is on a road (drivable asphalt).
export function isOnRoad(x, y) {
  const half = WORLD.roadWidth / 2;
  for (const rx of ROADS_X) if (Math.abs(x - rx) < half) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < half) return true;
  return false;
}

// True when a point is in the sea (east of the boardwalk).
export function isInSea(x, y) {
  return x > BEACH.seaX;
}

// True when a point is on the beach sand or the boardwalk.
export function isOnBeach(x, y) {
  return x > BEACH.x && x <= BEACH.seaX;
}

// Snap a point to the nearest road centre line.
export function nearestRoadPoint(x, y) {
  let bestX = ROADS_X[0];
  let bestD = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; bestX = rx; }
  }
  let bestY = ROADS_Y[0];
  bestD = Infinity;
  for (const ry of ROADS_Y) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; bestY = ry; }
  }
  return Math.abs(x - bestX) < Math.abs(y - bestY)
    ? { x: bestX, y, vertical: true }
    : { x, y: bestY, vertical: false };
}

// Clamp a point inside the playable world (the sea blocks the east side).
export function clampToWorld(x, y) {
  return {
    x: clamp(x, 20, BEACH.seaX - 10),
    y: clamp(y, 20, WORLD.height - 20),
  };
}

// Paint the whole static city once onto an offscreen canvas.
export function prerenderBackground(city) {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;
  const ctx = canvas.getContext('2d');

  // Base grass.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  // Mow stripes for a little texture.
  ctx.fillStyle = PALETTE.grassDark;
  for (let y = 0; y < WORLD.height; y += 80) {
    if ((y / 80) % 2 === 0) ctx.fillRect(0, y, WORLD.width, 40);
  }

  // Sea and sand on the east edge.
  ctx.fillStyle = PALETTE.seaDeep;
  ctx.fillRect(BEACH.seaX, 0, WORLD.width - BEACH.seaX, WORLD.height);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(BEACH.seaX - 14, 0, 14, WORLD.height);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(BEACH.x, 0, BEACH.seaX - BEACH.x, WORLD.height);
  // Foam lines where the waves meet the sand.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  for (let y = 40; y < WORLD.height; y += 130) {
    ctx.beginPath();
    ctx.moveTo(BEACH.seaX - 6, y);
    ctx.quadraticCurveTo(BEACH.seaX - 22, y + 22, BEACH.seaX - 4, y + 44);
    ctx.stroke();
  }
  // Boardwalk planks.
  ctx.fillStyle = PALETTE.boardwalk;
  ctx.fillRect(BEACH.x - 26, 0, 26, WORLD.height);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  for (let y = 0; y < WORLD.height; y += 18) {
    ctx.beginPath(); ctx.moveTo(BEACH.x - 26, y); ctx.lineTo(BEACH.x, y); ctx.stroke();
  }

  // Sidewalks: pale strips along every road.
  ctx.fillStyle = PALETTE.sidewalk;
  const half = WORLD.roadWidth / 2;
  for (const rx of ROADS_X) ctx.fillRect(rx - half - 12, 0, WORLD.roadWidth + 24, WORLD.height);
  for (const ry of ROADS_Y) ctx.fillRect(0, ry - half - 12, WORLD.width, WORLD.roadWidth + 24);

  // Asphalt.
  ctx.fillStyle = PALETTE.asphalt;
  for (const rx of ROADS_X) ctx.fillRect(rx - half, 0, WORLD.roadWidth, WORLD.height);
  for (const ry of ROADS_Y) ctx.fillRect(0, ry - half, WORLD.width, WORLD.roadWidth);

  // Centre dashed lines.
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  for (const rx of ROADS_X) {
    ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD.height); ctx.stroke();
  }
  for (const ry of ROADS_Y) {
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(WORLD.width, ry); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Zebra crossings at every intersection.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const rx of ROADS_X) {
    for (const ry of ROADS_Y) {
      for (let i = -3; i <= 3; i += 1) {
        ctx.fillRect(rx + i * 12 - 4, ry - half - 10, 8, 20);
      }
    }
  }

  // Parks and the plaza.
  for (const park of city.parks) {
    ctx.fillStyle = park.plaza ? '#b7d977' : '#69a84f';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.strokeStyle = '#4e7a3a';
    ctx.lineWidth = 3;
    ctx.strokeRect(park.x, park.y, park.w, park.h);
    if (park.plaza) {
      ctx.fillStyle = '#d9c9a3';
      ctx.beginPath();
      ctx.arc(park.x + park.w / 2, park.y + park.h / 2, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5b8dc9';
      ctx.beginPath();
      ctx.arc(park.x + park.w / 2, park.y + park.h / 2, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Buildings: roof colour, a darker rim, and a pale skylight.
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.globalAlpha = b.shade;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(b.x + b.w * 0.3, b.y + b.h * 0.3, b.w * 0.4, b.h * 0.4);
  }

  // Trees.
  for (const t of city.trees) {
    ctx.fillStyle = '#2f6b2f';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4c9a3f';
    ctx.beginPath(); ctx.arc(t.x - 2, t.y - 2, t.r * 0.65, 0, Math.PI * 2); ctx.fill();
  }

  // The pier: wooden deck reaching out over the sea.
  ctx.fillStyle = '#8a6b42';
  ctx.fillRect(PIER.x - 26, PIER.y - 130, 52, PIER.length + 130);
  ctx.fillStyle = '#a5825a';
  ctx.fillRect(PIER.x - 20, PIER.y - 130, 40, PIER.length + 130);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let y = PIER.y - 130; y < PIER.y + PIER.length; y += 16) {
    ctx.beginPath(); ctx.moveTo(PIER.x - 20, y); ctx.lineTo(PIER.x + 20, y); ctx.stroke();
  }

  // Named place pads so the player can spot shops from above.
  for (const key of Object.keys(PLACES)) {
    const p = PLACES[key];
    if (key === 'pier' || key === 'plaza') continue;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.22;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.stroke();
  }

  return canvas;
}
