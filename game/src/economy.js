// The Solmar Bay economy: shops, the car lot, the paint shop payoff, and
// the safehouse. Money comes from missions and from rivals; spending it is
// how the player stays alive and stays free.
import { PLACES, CAR_MODELS } from './config.js';
import { dist2 } from './random.js';
import { makeCar } from './vehicles.js';

const SHOP_RADIUS = 95;

export function nearShop(state) {
  const p = state.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  const shops = [
    { id: 'carLot', place: PLACES.carLot },
    { id: 'paintShop', place: PLACES.paintShop },
    { id: 'gunShop', place: PLACES.gunShop },
    { id: 'hospital', place: PLACES.hospital },
    { id: 'safehouse', place: PLACES.safehouse },
  ];
  for (const s of shops) {
    if (dist2(px, py, s.place.x, s.place.y) < SHOP_RADIUS * SHOP_RADIUS) return s;
  }
  return null;
}

export function shopPrompt(state, shop) {
  const p = state.player;
  switch (shop.id) {
    case 'carLot': {
      const next = CAR_MODELS.find((m) => m.price > 0 && !state.ownedModels.includes(m.id));
      if (!next) return 'Rico\'s Motors — you own every car for sale.';
      return `E — Buy ${next.name} for $${next.price}  (you have $${state.money})`;
    }
    case 'paintShop':
      return state.wantedStars > 0
        ? `E — Pay off the cops $150  (wanted ${state.wantedStars}★, you have $${state.money})`
        : 'Paint & Repair — no heat to lose right now.';
    case 'gunShop':
      return `E — Buy ammo +48 for $50  (you have $${state.money}, ${p.ammo} rounds)`;
    case 'hospital':
      return p.health < p.maxHealth
        ? `E — Full treatment $80  (health ${Math.round(p.health)}/100, you have $${state.money})`
        : 'St. Marina Hospital — you are in perfect health.';
    case 'safehouse':
      return 'E — Save game at the Safehouse';
    default:
      return '';
  }
}

// Returns true when the keypress was consumed by a shop.
export function tryShop(state) {
  const shop = nearShop(state);
  if (!shop) return false;
  const p = state.player;
  switch (shop.id) {
    case 'carLot': {
      const next = CAR_MODELS.find((m) => m.price > 0 && !state.ownedModels.includes(m.id));
      if (!next) {
        state.showToast('You already own every car Rico sells.');
        return true;
      }
      if (state.money < next.price) {
        state.showToast(`You need $${next.price} for the ${next.name}.`);
        return true;
      }
      state.money -= next.price;
      state.ownedModels.push(next.id);
      const car = makeCar(next.id, PLACES.carLot.x + 60, PLACES.carLot.y, 0, {});
      state.cars.push(car);
      state.ownedCars.push(car.id);
      state.showToast(`Bought the ${next.name}! It is parked at Rico's.`);
      state.audio.pickup();
      return true;
    }
    case 'paintShop': {
      if (state.wantedStars === 0) {
        state.showToast('No heat to lose — the cops are not after you.');
        return true;
      }
      if (state.money < 150) {
        state.showToast('The payoff costs $150.');
        return true;
      }
      state.money -= 150;
      state.heat = 0;
      state.wantedStars = 0;
      state.audio.pickup();
      state.showToast('Paid off. The heat is gone — this time.');
      return true;
    }
    case 'gunShop': {
      if (state.money < 50) {
        state.showToast('Ammo costs $50.');
        return true;
      }
      state.money -= 50;
      p.ammo += 48;
      state.audio.pickup();
      state.showToast('Ammo +48');
      return true;
    }
    case 'hospital': {
      if (p.health >= p.maxHealth) {
        state.showToast('You are already at full health.');
        return true;
      }
      if (state.money < 80) {
        state.showToast('Treatment costs $80.');
        return true;
      }
      state.money -= 80;
      p.health = p.maxHealth;
      state.audio.pickup();
      state.showToast('Patched up — full health.');
      return true;
    }
    case 'safehouse': {
      state.saveGame();
      state.showToast('Game saved at the Safehouse.');
      state.audio.pickup();
      return true;
    }
    default:
      return false;
  }
}
