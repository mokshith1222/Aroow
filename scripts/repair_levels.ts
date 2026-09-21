/**
 * repair_levels.ts
 * Regenerates the 5 levels confirmed unsolvable by the new portal-aware solver.
 * Levels: 277, 296, 407, 413, 445
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { LevelGenerator } from '../src/game/LevelGenerator';
import { LevelSolver } from '../src/game/LevelSolver';
import type { LevelData } from '../src/game/types';

const UNSOLVABLE_IDS = [277, 296, 407, 413, 445];
const DB_PATH = join(process.cwd(), 'src/data/levels_db.json');

const raw = readFileSync(DB_PATH, 'utf-8');
const levels: LevelData[] = JSON.parse(raw);

let repaired = 0;
let failed = 0;

for (const id of UNSOLVABLE_IDS) {
  const idx = levels.findIndex(l => l.id === id);
  if (idx === -1) { console.warn(`Level ${id} not found.`); continue; }

  const old = levels[idx];
  const presetName = (old.name?.split(' ')[0] ?? 'NORMAL') as any;

  console.log(`\nRepairing Level ${id} (${presetName})...`);

  // Try up to 20 different seeds to find a solvable replacement
  let success = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    LevelGenerator.clearRegistry();
    const seed = (id * 77777 + attempt * 999983) >>> 0;
    try {
      const newLevel = LevelGenerator.generate(id, presetName, seed);
      newLevel.id = id;
      newLevel.name = old.name; // preserve name
      const check = LevelSolver.solve(newLevel);
      if (check.solvable) {
        levels[idx] = newLevel;
        console.log(`  ✓ Level ${id} repaired! Moves: ${check.optimalMoves}, Turns: ${check.turnsCount}`);
        repaired++;
        success = true;
        break;
      }
    } catch (e) {
      // generation failed, try next seed
    }
  }

  if (!success) {
    console.error(`  ✗ Level ${id} could not be repaired — keeping original.`);
    failed++;
  }
}

// Final validation pass
const stillBroken = levels.filter(l => {
  const r = LevelSolver.solve(l);
  return !r.solvable;
});

if (stillBroken.length > 0) {
  console.error(`\n=== STILL UNSOLVABLE: ${stillBroken.map(l => l.id).join(', ')} ===`);
} else {
  console.log(`\n✓ All ${levels.length} levels now pass solvability check.`);
}

writeFileSync(DB_PATH, JSON.stringify(levels, null, 2));
console.log(`\nDone. Repaired: ${repaired}, Failed: ${failed}`);
