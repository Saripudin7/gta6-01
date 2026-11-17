// Solmar Bay — Streets of Gold: all the fixed numbers of the city.
// One place for sizes, places, car models, prices and mission text so the
// rest of the game never hard-codes a magic number twice.

export const WORLD = {
  width: 3200,
  height: 2400,
  roadWidth: 92,
  laneWidth: 23,
  blockSize: 400,
  roadGap: 400,
};

// Road centre lines: a regular grid, so traffic and the minimap stay simple.
export const ROADS_X = [200, 600, 1000, 1400, 1800, 2200, 2600];
export const ROADS_Y = [200, 600, 1000, 1400, 1800, 2200];

// The beach runs along the whole east edge; the sea is east of the boardwalk.
export const BEACH = { x: 2880, seaX: 3050 };
export const PIER = { x: 2960, y: 2180, length: 260 };

// Named places. x/y are world coordinates; radius is the trigger zone.
export const PLACES = {
  ferry:      { name: 'Ferry Terminal',   x: 320,  y: 2120, radius: 90,  color: '#7ec8e3', blip: 'F' },
  motors:     { name: "Rico's Motors",    x: 1500, y: 560,  radius: 110, color: '#ffb347', blip: 'M' },
  paint:      { name: 'Paint & Repair',   x: 1420, y: 1020, radius: 100, color: '#c77dff', blip: 'P' },
  pier:       { name: 'Old Pier',         x: 2960, y: 2180, radius: 100, color: '#8ecae6', blip: 'O' },
  safehouse:  { name: 'Safehouse',        x: 620,  y: 1420, radius: 100, color: '#90e0a0', blip: 'H' },
  docks:      { name: 'North Docks',      x: 2620, y: 320,  radius: 110, color: '#ffd166', blip: 'D' },
  bank:       { name: 'Bayfront Bank',    x: 2220, y: 1420, radius: 110, color: '#f4d35e', blip: '$' },
  arms:       { name: 'Harbor Arms',      x: 1020, y: 1820, radius: 90,  color: '#ef476f', blip: 'A' },
  hospital:   { name: 'St. Marina Hospital', x: 620, y: 620, radius: 110, color: '#ffffff', blip: '+' },
  plaza:      { name: 'Marina Plaza',     x: 1420, y: 1420, radius: 120, color: '#a7c957', blip: ' ' },
};

// Car models: top-down rectangles with their own colour, speed and price.
export const CAR_MODELS = {
  sedan:   { name: 'Marlin Sedan',   color: '#4a90d9', dark: '#2c5f8f', length: 46, width: 22, top: 240, accel: 300, price: 0 },
  coupe:   { name: 'Vela Coupe',     color: '#d94a4a', dark: '#8f2c2c', length: 44, width: 21, top: 270, accel: 340, price: 800 },
  pickup:  { name: 'Dune Pickup',    color: '#e0a458', dark: '#96691f', length: 50, width: 23, top: 220, accel: 280, price: 800 },
  taxi:    { name: 'Bay Taxi',       color: '#f2c531', dark: '#a8871a', length: 46, width: 22, top: 230, accel: 300, price: 0 },
  sport:   { name: 'Comet GT',       color: '#7b2fbe', dark: '#4c1a78', length: 45, width: 22, top: 330, accel: 420, price: 2500 },
  van:     { name: 'Harbor Van',     color: '#8d99ae', dark: '#5a6478', length: 52, width: 24, top: 200, accel: 250, price: 1500 },
  police:  { name: 'SPPD Cruiser',   color: '#1d3557', dark: '#0d1b2e', length: 47, width: 22, top: 320, accel: 380, price: 0 },
};

// Prices in dollars.
export const PRICES = {
  ammoBox: 50,      // 24 pistol rounds
  ammoRounds: 24,
  heal: 80,         // full heal at the hospital
  repaint: 150,     // clear the whole wanted level
  bustedFine: 150,  // paid when the police catch you
  hospitalBill: 100,// paid when you wake up after being wasted
  saveFee: 0,
};

// The five story missions, in order. Each has a title, a briefing from Rico,
// a reward, and the place key it revolves around.
export const MISSIONS = [
  {
    id: 1, title: 'First Wheels', place: 'paint', reward: 250,
    brief: 'Rico: "Fresh off the ferry, huh? Grab any car on the street and bring it to Paint & Repair. I need it clean."',
    hint: 'Walk up to a parked car, press E to take it, then drive to the purple marker.',
  },
  {
    id: 2, title: 'The Pickup', place: 'pier', reward: 400,
    brief: 'Rico: "A package is waiting at the Old Pier. Pick it up and bring it to the Safehouse. No questions, no peeking."',
    hint: 'Reach the Old Pier, press E for the package, then deliver it.',
  },
  {
    id: 3, title: 'Hot Delivery', place: 'docks', reward: 600, timeLimit: 90,
    brief: 'Rico: "North Docks, ninety seconds. The buyer does not wait. Drive fast, and try not to collect the whole SPPD on the way."',
    hint: 'You have 90 seconds to reach the North Docks. Police will join the chase halfway there.',
  },
  {
    id: 4, title: 'The Getaway', place: 'safehouse', reward: 800, survive: 45,
    brief: 'Rico: "Three stars, Vex. The whole department is awake. Lose them, then get back to the Safehouse in one piece."',
    hint: 'Stay out of sight until the heat dies down, then reach the Safehouse. Getting caught ends the job.',
  },
  {
    id: 5, title: 'Bayfront Job', place: 'bank', reward: 1500,
    brief: 'Rico: "The big one. Bayfront Bank. Hold the floor, take the gold, and outrun every cruiser in Solmar Bay."',
    hint: 'Stand inside the bank and hold E to crack the vault. Then lose a three-star chase and reach the Safehouse.',
  },
];

export const PLAYER_START = { x: 320, y: 2060, angle: -Math.PI / 2 };
export const PLAYER = {
  walkSpeed: 175, runSpeed: 265, radius: 13,
  maxHealth: 100, startMoney: 120, startAmmo: 24,
  pistolDamage: 34, pistolRange: 420, fireDelay: 0.22,
};

export const WANTED = {
  maxStars: 5,
  decayPerSecond: 0.055,   // heat falls when no cop can see you
  decaySeen: 0.012,        // heat falls slower while a cop sees you
  heatPerStar: 20,
  bustedHoldSeconds: 1.4,  // a cop must stay this close this long to bust you
  bustedRange: 46,
};

export const VIEW = { width: 1280, height: 720 };
export const SAVE_KEY = 'solmar-bay-save-v1';

// Sun-soaked coastal palette: warm asphalt, pale sand, turquoise sea.
export const PALETTE = {
  grass: '#7fae5a', grassDark: '#6f9c4e', sand: '#e8d5a3', sea: '#2e86ab',
  seaDeep: '#1d5f7a', boardwalk: '#b08954', asphalt: '#3d3d46', asphaltDark: '#34343c',
  sidewalk: '#9a9a92', line: '#e8e3c8', curb: '#c9c9bd', roofA: '#b5654a',
  roofB: '#4a6b8a', roofC: '#7a5c8a', roofD: '#5a7a52', roofE: '#c08a3e',
};
