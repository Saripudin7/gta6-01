// Solmar Bay — Streets of Gold: the entry program (Node 22, stdlib only).
// It hands the game in: copies game/ and screenshots/ from beside this file
// into /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, exactly as the
// kit's starter does. The game itself is plain static files — no build step,
// no network, nothing installed.
//
// Run it locally to check the entry before submitting:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Then `out/` holds game/, screenshots/ and dossier.json, ready for the
// kit's `makefun check` command.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the folder this file lives in.
const here = fileURLToPath(new URL('.', import.meta.url));
// The grader writes to /output; local runs use MAKEFUN_OUTPUT_DIR.
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// A quick pre-flight check, so a broken entry fails loudly here instead of
// silently in the grader: the page must exist, and there must be 3 or 4
// screenshots (the first by name is the cover).
const indexPath = join(here, 'game', 'index.html');
if (!existsSync(indexPath) || !statSync(indexPath).isFile()) {
  throw new Error('game/index.html is missing — nothing to hand in.');
}
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error('expected 3 or 4 screenshots, found ' + shots.length + '.');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse — more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files in all; a path under game/ over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Say what was handed in, so a local run can be eyeballed at a glance.
console.log('Solmar Bay handed in: ' + shots.length + ' screenshots, game/ + dossier.json in ' + out);
