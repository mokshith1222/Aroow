import { describe, it, expect } from 'vitest';
import { LevelValidator } from '../src/game/LevelValidator';
import { LevelGenerator } from '../src/game/LevelGenerator';
import { LevelSolver } from '../src/game/LevelSolver';
import type { LevelData } from '../src/game/types';
import { DIFFICULTY_PRESETS } from '../src/game/LevelGeneratorPresets';

describe('Level Validation & Procedural Generation', () => {
  const solverMetrics = {
    solvable: true,
    optimalMoves: 30,
    shortestPath: [],
    shortestPathCount: 1,
    secondBestMoves: 32,
    thirdBestMoves: 36,
    solutionComplexity: 100,
    branchingFactor: 2,
    deadEndCount: 8,
    pathEfficiency: 0.5,
    directions: [],
    turnsCount: 8,
    visitedNodesCount: 100,
    misleadingRoutes: 40,
    decisionPoints: 6,
    decisionDepth: 4,
    meaningfulBranches: 6,
    distanceBetweenDecisions: 3
  } as const;

  it('scores deceptive route pressure above a simple blocked route', () => {
    const simple = LevelGenerator.calculateDifficulty(
      { id: 1, worldId: 1, name: 'Simple', width: 12, height: 12, start: { x: 0, y: 0 }, goal: { x: 11, y: 11 }, walls: [] },
      { ...solverMetrics, misleadingRoutes: 0, decisionPoints: 0, decisionDepth: 0, meaningfulBranches: 0 },
      DIFFICULTY_PRESETS.MASTER
    );
    const deceptive = LevelGenerator.calculateDifficulty(
      { id: 2, worldId: 7, name: 'Deceptive', width: 12, height: 12, start: { x: 0, y: 0 }, goal: { x: 11, y: 11 }, walls: [] },
      solverMetrics,
      DIFFICULTY_PRESETS.MASTER
    );

    expect(deceptive).toBeGreaterThan(simple);
  });

  it('keeps MASTER layouts solvable-friendly instead of relying on chamber walls', () => {
    expect(DIFFICULTY_PRESETS.MASTER.allowedLayouts).not.toContain('CHAMBERS');
    expect(DIFFICULTY_PRESETS.MASTER.wallDensityMax).toBeLessThanOrEqual(0.32);
  });

  it('accepts a well-formed solvable level', () => {
    const validLevel: LevelData = {
      id: 100,
      worldId: 1,
      name: 'Valid Level',
      width: 4,
      height: 4,
      start: { x: 0, y: 0 },
      goal: { x: 3, y: 3 },
      walls: [{ x: 1, y: 1 }, { x: 2, y: 2 }]
    };

    const res = LevelValidator.validate(validLevel);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.solution?.solvable).toBe(true);
    expect(res.solution?.optimalMoves).toBe(6);
  });

  it('rejects invalid dimensions', () => {
    const invalidDimensions: LevelData = {
      id: 101,
      worldId: 1,
      name: 'Bad Dims',
      width: 1,
      height: 1,
      start: { x: 0, y: 0 },
      goal: { x: 0, y: 0 },
      walls: []
    };

    const res = LevelValidator.validate(invalidDimensions);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('dimensions'))).toBe(true);
  });

  it('rejects start or goal outside grid boundaries', () => {
    const badStart: LevelData = {
      id: 102,
      worldId: 1,
      name: 'Bad Start',
      width: 4,
      height: 4,
      start: { x: -1, y: 0 },
      goal: { x: 3, y: 5 },
      walls: []
    };

    const res = LevelValidator.validate(badStart);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('Start position'))).toBe(true);
    expect(res.errors.some(e => e.includes('Goal position'))).toBe(true);
  });

  it('rejects start or goal placed directly on a wall', () => {
    const wallOverlap: LevelData = {
      id: 103,
      worldId: 1,
      name: 'Wall Overlap',
      width: 4,
      height: 4,
      start: { x: 0, y: 0 },
      goal: { x: 3, y: 3 },
      walls: [{ x: 0, y: 0 }, { x: 3, y: 3 }]
    };

    const res = LevelValidator.validate(wallOverlap);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('Start position cannot be on a wall'))).toBe(true);
    expect(res.errors.some(e => e.includes('Goal position cannot be on a wall'))).toBe(true);
  });

  it('rejects start and goal placed at the exact same location', () => {
    const identicalPos: LevelData = {
      id: 104,
      worldId: 1,
      name: 'Same Start Goal',
      width: 4,
      height: 4,
      start: { x: 2, y: 2 },
      goal: { x: 2, y: 2 },
      walls: []
    };

    const res = LevelValidator.validate(identicalPos);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('same location'))).toBe(true);
  });

  it('rejects unsolvable level completely blocked by walls', () => {
    const impossibleLevel: LevelData = {
      id: 105,
      worldId: 1,
      name: 'Impossible Boxed In',
      width: 5,
      height: 5,
      start: { x: 0, y: 0 },
      goal: { x: 4, y: 4 },
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 } // completely seals (0,0)
      ]
    };

    const res = LevelValidator.validate(impossibleLevel);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('impossible'))).toBe(true);
  });

  it('ensures generator is strictly deterministic for identical seeds and presets', () => {
    LevelGenerator.clearRegistry();
    const levelA = LevelGenerator.generate(42, 'MEDIUM', 12345);
    LevelGenerator.clearRegistry();
    const levelB = LevelGenerator.generate(42, 'MEDIUM', 12345);

    expect(levelA.width).toBe(levelB.width);
    expect(levelA.height).toBe(levelB.height);
    expect(levelA.start).toEqual(levelB.start);
    expect(levelA.goal).toEqual(levelB.goal);
    expect(levelA.walls).toEqual(levelB.walls);
    expect(levelA.parMoves).toBe(levelB.parMoves);
  });

  it('scales grid sizes and solution lengths appropriately across difficulty presets', async () => {

    LevelGenerator.clearRegistry();
    const tutorial = LevelGenerator.generate(1, 'TUTORIAL');
    const master = LevelGenerator.generate(500, 'MASTER');

    expect(tutorial.width).toBe(DIFFICULTY_PRESETS.TUTORIAL.gridWidth);
    expect(master.width).toBe(DIFFICULTY_PRESETS.MASTER.gridWidth);
    expect(master.width).toBeGreaterThan(tutorial.width);

    expect(master.optimalSolutionLength!).toBeGreaterThan(tutorial.optimalSolutionLength!);
    expect(tutorial.challenge?.maxLives).toBe(3);
    expect(master.challenge?.maxLives).toBe(1);
    expect(master.challenge?.allowUndo).toBe(false);
    expect(master.timeLimit).toBeDefined();
    expect(master.timeLimit!).toBeGreaterThan(master.targetTime!);
  });

  it('BFS solver finds the exact shortest move count', () => {
    // 3x3 open grid from (0,0) to (2,2) with a wall at (1,1)
    const openWithCenterWall: LevelData = {
      id: 106,
      worldId: 1,
      name: 'Corner turn',
      width: 3,
      height: 3,
      start: { x: 0, y: 0 },
      goal: { x: 2, y: 2 },
      walls: [{ x: 1, y: 1 }]
    };

    const solution = LevelSolver.solve(openWithCenterWall);
    expect(solution.solvable).toBe(true);
    expect(solution.optimalMoves).toBe(4); // e.g. R, R, D, D or D, D, R, R
  });
});
