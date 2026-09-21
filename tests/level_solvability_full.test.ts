/**
 * tests/level_solvability_full.test.ts
 *
 * Full-database solvability regression test.
 * Loads all levels from levels_db.json and runs each through LevelSolver.solve().
 * Fails if ANY level is unsolvable.
 */
import { describe, it, expect } from 'vitest';
import levelsDb from '../src/data/levels_db.json';
import { LevelSolver } from '../src/game/LevelSolver';
import type { LevelData } from '../src/game/types';

describe('Full Database Solvability — ALL Levels', () => {
  const levels = levelsDb as LevelData[];

  it('every level in levels_db.json is solvable under actual game rules', () => {
    const unsolvable: { id: number; name: string }[] = [];

    for (const level of levels) {
      const result = LevelSolver.solve(level);
      if (!result.solvable) {
        unsolvable.push({ id: level.id, name: level.name ?? `Level ${level.id}` });
      }
    }

    if (unsolvable.length > 0) {
      console.error('\n=== UNSOLVABLE LEVELS ===');
      for (const l of unsolvable) console.error(`  LEVEL ${l.id} (${l.name}) — REJECT`);
      console.error(`Total: ${levels.length} levels, ${unsolvable.length} unsolvable.`);
    } else {
      console.log(`\n✓ All ${levels.length} levels PASS solvability.`);
    }

    expect(unsolvable.length).toBe(0);
  });

  it('level 277 specifically is solvable', () => {
    const level277 = levels.find(l => l.id === 277);
    if (!level277) { console.warn('Level 277 not in DB (procedural).'); return; }
    const result = LevelSolver.solve(level277);
    console.log(
      `\nLEVEL 277 | ${level277.width}x${level277.height}` +
      ` | Start(${level277.start.x},${level277.start.y})` +
      ` | Goal(${level277.goal.x},${level277.goal.y})` +
      ` | Solvable: ${result.solvable ? 'YES' : 'NO'}` +
      ` | Moves: ${result.solvable ? result.optimalMoves : '--'}` +
      ` | States: ${result.visitedNodesCount}`
    );
    expect(result.solvable).toBe(true);
  });
});
