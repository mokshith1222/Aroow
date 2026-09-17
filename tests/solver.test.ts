import { describe, it, expect } from 'vitest';
import { LevelSolver } from '../src/game/LevelSolver';
import type { LevelData, Position } from '../src/game/types';

describe('LevelSolver', () => {
  it('identifies an impossible level', () => {
    const level: LevelData = {
      id: 1,
      worldId: 1,
      width: 5,
      height: 5,
      start: { x: 0, y: 0 },
      goal: { x: 4, y: 4 },
      // Surround the start with walls to make it impossible
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: 1, y: 1 }
      ]
    };
    
    const result = LevelSolver.solve(level);
    expect(result.solvable).toBe(false);
    expect(result.optimalMoves).toBe(-1);
    expect(result.shortestPathCount).toBe(0);
    expect(result.shortestPath).toEqual([]);
  });

  it('solves a simple corridor with exactly 1 shortest path', () => {
    // 0 S W W
    // 0 0 W W
    // W 0 0 G
    const level: LevelData = {
      id: 2,
      worldId: 1,
      width: 4,
      height: 3,
      start: { x: 1, y: 0 },
      goal: { x: 3, y: 2 },
      walls: [
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 0, y: 2 }
      ]
    };

    const result = LevelSolver.solve(level);
    expect(result.solvable).toBe(true);
    expect(result.optimalMoves).toBe(4);
    // W 0 G
  });

  it('counts multiple shortest paths correctly on an open grid', () => {
    // Open 3x3 grid, start at top-left, goal at bottom-right
    // Paths could be R-R-D-D, R-D-R-D, R-D-D-R, D-R-R-D, D-R-D-R, D-D-R-R => 6 paths
    const level: LevelData = {
      id: 3,
      worldId: 1,
      width: 3,
      height: 3,
      start: { x: 0, y: 0 },
      goal: { x: 2, y: 2 },
      walls: []
    };
    
    const result = LevelSolver.solve(level);
    expect(result.solvable).toBe(true);
    expect(result.optimalMoves).toBe(4);
    expect(result.shortestPathCount).toBe(6);
  });

  it('calculates dead ends', () => {
    // S 0 W
    // W 0 0 (dead end at 2,1)
    // W G W
    const level: LevelData = {
      id: 4,
      worldId: 1,
      width: 3,
      height: 3,
      start: { x: 0, y: 0 },
      goal: { x: 1, y: 2 },
      walls: [
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 2, y: 2 }
      ]
    };
    
    const result = LevelSolver.solve(level);
    expect(result.solvable).toBe(true);
    expect(result.deadEndCount).toBe(1); // (2,1) only connects to (1,1)
  });
});
