// Solmar Bay — the economy: shops, the car lot, repairs and payoffs.
// Walk (or drive) into a shop's zone and press E. Every purchase is instant
// and honest: if you cannot afford it, the shopkeeper tells you so.

import { PLACES, PRICES, CAR_MODELS } from './config.js';
import { dist } from './random.js';
import { clearWanted } from './police.js';
import { makeCar } from './vehicles.js';

// Find the shop whose zone the player is standing in right now.
export function shopAt(state) {
  const p = state.player;
  for (const key of ['motors', 'arms', 'hospital', 'paint', 'safehouse']) {
    const place = PLACES[key];
    if (dist(p.x, p.y, place.x, place.y) < place.radius) return key;
  }
  return null;
}

// The one-line prompt shown when the player stands in a shop zone.
export function shopPrompt(state, key) {
  const p = state.player;
  switch (key) {
    case 'motors': return 'E — Browse Rico\'s Motors (Coupe $800 · Van $1500 · Comet GT $2500)';
    case 'arms': return 'E — Buy ammo: 24 rounds for $' + PRICES.ammoBox + ' (you have ' + p.ammo + ')';
    case 'hospital': return 'E — Full treatment for $' + PRICES.heal + ' (health ' + Math.round(p.health) + '/100)';
    case 'paint': return 'E — Repaint & lose the heat: $' + PRICES.repaint + ' (wanted: ' + state.wanted + '★)';
    case 'safehouse': return 'E — Save game & rest (free, restores health)';
    default: return '';
  }
}

// The car lot menu: which models the player can buy right now.
export function lotOptions(state) {
  const p = state.player;
  return ['coupe', 'van', 'sport'].map((key) => ({
    key,
    name: CAR_MODELS[key].name,
    price: CAR_MODELS[key].price,
    owned: state.ownedCars.includes(key),
    afford: p.money >= CAR_MODELS[key].price,
  }));
}

// Buy a car from the lot: it spawns beside the shop, owned, ready to drive.
export function buyCar(state, modelKey) {
  const p = state.player;
  const model = CAR_MODELS[modelKey];
  if (!model || model.price === 0) return false;
  if (state.ownedCars.includes(modelKey)) {
    state.toast('You already own the ' + model.name + '. It is parked at the lot.', 'good');
    return true;
  }
  if (p.money < model.price) {
    state.toast('Not enough cash for the ' + model.name + ' — need $' + model.price + '.', 'bad');
    state.sound.fail();
    return false;
  }
  p.money -= model.price;
  state.ownedCars.push(modelKey);
  const car = makeCar(modelKey, PLACES.motors.x + 60, PLACES.motors.y + 40, 0, 'parked');
  car.owned = true;
  state.cars.push(car);
  state.sound.cash();
  state.toast('You bought the ' + model.name + ' for $' + model.price + '!', 'good');
  state.saveGame();
  return true;
}

// The E-key interaction for whichever shop the player is in. Returns true
// when something happened (so the caller can refresh the HUD).
export function interactShop(state) {
  const key = shopAt(state);
  if (!key) return false;
  const p = state.player;
  if (key === 'motors') {
    state.shopMenu = 'motors';
    state.screen = 'shop';
    state.sound.click();
    return true;
  }
  if (key === 'arms') {
    if (p.money < PRICES.ammoBox) {
      state.toast('Harbor Arms: 24 rounds cost $' + PRICES.ammoBox + '. You are short.', 'bad');
      return true;
    }
    p.money -= PRICES.ammoBox;
    p.ammo += PRICES.ammoRounds;
    state.sound.pickup();
    state.toast('Bought 24 rounds. Ammo: ' + p.ammo + '.', 'good');
    return true;
  }
  if (key === 'hospital') {
    if (p.health >= 100) {
      state.toast('St. Marina: you are already in perfect health.', 'good');
      return true;
    }
    if (p.money < PRICES.heal) {
      state.toast('Treatment costs $' + PRICES.heal + '. Come back with cash.', 'bad');
      return true;
    }
    p.money -= PRICES.heal;
    p.health = 100;
    state.sound.chime();
    state.toast('St. Marina patched you up. Health 100.', 'good');
    return true;
  }
  if (key === 'paint') {
    if (state.wanted === 0) {
      state.toast('Paint & Repair: no heat on you — nothing to paint over.', 'good');
      return true;
    }
    if (p.money < PRICES.repaint) {
      state.toast('A new paint job costs $' + PRICES.repaint + '. You are short.', 'bad');
      return true;
    }
    p.money -= PRICES.repaint;
    clearWanted(state);
    state.sound.chime();
    state.toast('Fresh paint, clean plates. The SPPD lost you.', 'good');
    return true;
  }
  if (key === 'safehouse') {
    p.health = 100;
    state.saveGame();
    state.sound.chime();
    state.toast('Game saved at the Safehouse. Health restored.', 'good');
    return true;
  }
  return false;
}

// Being busted: lose the fine, lose the heat, wake up at the Safehouse.
export function payBustedFine(state) {
  const p = state.player;
  const fine = Math.min(p.money, PRICES.bustedFine);
  p.money -= fine;
  state.lastFine = fine;
  clearWanted(state);
  p.health = 100;
  if (p.inCar) { p.inCar.driver = 'parked'; p.inCar = null; }
  p.x = PLACES.safehouse.x;
  p.y = PLACES.safehouse.y;
  state.rivals = [];
  state.toast('Busted! The SPPD took $' + fine + ' and dropped you at the Safehouse.', 'bad');
}

// Being wasted: hospital bill, wake up at St. Marina.
export function payHospitalBill(state) {
  const p = state.player;
  const bill = Math.min(p.money, PRICES.hospitalBill);
  p.money -= bill;
  state.lastFine = bill;
  clearWanted(state);
  p.health = 100;
  if (p.inCar) { p.inCar.driver = 'parked'; p.inCar = null; }
  p.x = PLACES.hospital.x;
  p.y = PLACES.hospital.y;
  state.rivals = [];
  state.toast('You woke up at St. Marina. Bill: $' + bill + '.', 'bad');
}
