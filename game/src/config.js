// Solmar Bay — configuration and constants for the open-world crime game.
// Everything here is original: a fictional sun-soaked coastal city.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 76; // road width in world px
export const BLOCK = 400; // grid pitch: road + block
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Colours — a warm, sun-soaked palette: sand, teal sea, terracotta roofs.
export const PALETTE = {
  grass: '#7fae5a',
  grassDark: '#6f9d4e',
  sand: '#e8cf9a',
  sea: '#2e7f9e',
  seaDeep: '#256b87',
  road: '#3d3a38',
  roadEdge: '#2c2a29',
  sidewalk: '#b9b3a4',
  lane: '#e8d44d',
  buildingRoof: ['#c96f4a', '#b85c3e', '#d99a5b', '#8fa3b8', '#a87c5f', '#7d9b76'],
  buildingWall: '#e8ddc9',
  park: '#5d9b4a',
  plaza: '#cbb98f',
};

export const GAME_TITLE = 'SOLMAR BAY';
export const GAME_SUBTITLE = 'Streets of Gold';

// Named places in the city (all original names).
export const PLACES = {
  safehouse: { name: 'Safehouse', x: 560, y: 560 },
  paintShop: { name: 'Paint & Repair', x: 2440, y: 560 },
  pier: { name: 'Old Pier', x: 600, y: 2130 },
  docks: { name: 'North Docks', x: 2760, y: 320 },
  bank: { name: 'Bayfront Bank', x: 1640, y: 1240 },
  carLot: { name: 'Rico\'s Motors', x: 1240, y: 2040 },
  gunShop: { name: 'Harbor Arms', x: 2040, y: 1640 },
  hospital: { name: 'St. Marina Hospital', x: 840, y: 1640 },
  club: { name: 'Club Neon', x: 2440, y: 1240 },
  market: { name: 'Fish Market', x: 1640, y: 320 },
};

export const CAR_MODELS = [
  { id: 'sedan', name: 'Marina Sedan', color: '#5b7fa6', topSpeed: 340, accel: 210, price: 0 },
  { id: 'taxi', name: 'Bay Cab', color: '#e8b93a', topSpeed: 330, accel: 200, price: 0 },
  { id: 'coupe', name: 'Vento Coupe', color: '#b03a3a', topSpeed: 420, accel: 260, price: 800 },
  { id: 'sport', name: 'Falco GT', color: '#d97b2b', topSpeed: 520, accel: 330, price: 2000 },
  { id: 'van', name: 'Dock Van', color: '#7a7f85', topSpeed: 280, accel: 170, price: 0 },
  { id: 'police', name: 'SPPD Cruiser', color: '#2f4d6e', topSpeed: 470, accel: 300, price: 0 },
];

export const MISSION_DEFS = [
  {
    id: 'first-wheels',
    title: 'Mission 1 — First Wheels',
    brief: 'You are new in Solmar Bay. Steal any car and drive it to Paint & Repair so Rico can fit a clean plate.',
    payout: 250,
  },
  {
    id: 'the-pickup',
    title: 'Mission 2 — The Pickup',
    brief: 'A package is waiting at the Old Pier. Go on foot or by car, pick it up and bring it back to the Safehouse.',
    payout: 400,
  },
  {
    id: 'hot-delivery',
    title: 'Mission 3 — Hot Delivery',
    brief: 'The package is hot. Deliver it to the North Docks within 90 seconds. The cops are already sniffing around.',
    payout: 700,
  },
  {
    id: 'the-getaway',
    title: 'Mission 4 — The Getaway',
    brief: 'You tripped an alarm. Lose the cops — get your wanted level to zero — then reach the Safehouse.',
    payout: 900,
  },
  {
    id: 'bayfront-job',
    title: 'Mission 5 — Bayfront Job',
    brief: 'The big one. Hold up Bayfront Bank, then outrun a 3-star response and reach the Safehouse. Do not get caught.',
    payout: 1500,
  },
];

export const SAVE_KEY = 'solmar-bay-save-v1';
