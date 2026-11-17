// Solmar Bay — a tiny seeded random generator.
// The whole city, traffic and pedestrian layout come from one seed, so the
// same seed always builds the same Solmar Bay (screenshots included).

// Mulberry32: small, fast, and good enough for a procedural city.
export class Rng {
  constructor(seed) {
    this.state = (seed >>> 0) || 1;
  }

  // Next float in [0, 1).
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Float in [min, max).
  range(min, max) {
    return min + this.next() * (max - min);
  }

  // Integer in [min, max] inclusive.
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  // Pick one element of an array.
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  // True with the given probability (0..1).
  chance(p) {
    return this.next() < p;
  }

  // A shuffled copy of an array (Fisher-Yates with this generator).
  shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }
}

// Turn an arbitrary seed string into a 32-bit number for the generator.
export function seedFromString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Clamp a value into [min, max].
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

// Linear interpolation.
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Shortest signed angle difference from a to b, in (-PI, PI].
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Euclidean distance between two points.
export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}
