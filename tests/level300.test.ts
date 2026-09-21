import { describe, it, expect } from 'vitest';
import levelsDb from '../src/data/levels_db.json';
import { LevelSolver } from '../src/game/LevelSolver';
import type { LevelData } from '../src/game/types';

describe('Level 300 Solvability', () => {
  it('should solve level 300 and print path', () => {
    const levels = levelsDb as LevelData[];
    const level300 = levels.find(l => l.id === 300);
    if (!level300) throw new Error("Not found");
    const result = LevelSolver.solve(level300);
    console.log("Level 300 solvable:", result.solvable, "optimalMoves:", result.optimalMoves);
    console.log("Path:", JSON.stringify(result.optimalPath));
    expect(result.solvable).toBe(true);
  });
});
