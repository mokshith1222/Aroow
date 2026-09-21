/**
 * PHASE 15 — Level Integrity Tests
 *
 * Independent QA review: validates every structural guarantee that a level must
 * satisfy before it can be shown to a player. Tests are written from the
 * perspective of a separate reviewer who treats the game engine as a black box.
 *
 * Coverage:
 *  - Valid start position (in-bounds, not on wall, has open neighbour)
 *  - Valid goal position (in-bounds, not on wall, has open neighbour)
 *  - Start ≠ Goal
 *  - Grid dimensions ≥ 2×2 and ≤ 50×50
 *  - No wall placed on start or goal
 *  - No out-of-bounds walls
 *  - No duplicate wall entries
 *  - A solution exists (BFS reachability)
 *  - Solution length is ≥ 1
 *  - All handcrafted levels (src/data/levels) pass validation
 *  - A representative sample of generated levels pass validation
 */

import { describe, it, expect } from 'vitest';
import { LevelValidator } from '../src/game/LevelValidator';
import { LevelLoader } from '../src/game/LevelLoader';
import { LevelGenerator } from '../src/game/LevelGenerator';
import { LevelSolver } from '../src/game/LevelSolver';
import type { LevelData } from '../src/game/types';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeLevel(overrides: Partial<LevelData> = {}): LevelData {
  return {
    id: 1,
    worldId: 1,
    name: 'QA Base Level',
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    goal: { x: 3, y: 3 },
    walls: [],
    ...overrides,
  };
}

// ─── structural checks ─────────────────────────────────────────────────────

describe('Level Integrity — structural validation', () => {
  it('accepts a minimal 2×2 level with distinct start/goal', () => {
    const level = makeLevel({ width: 2, height: 2, goal: { x: 1, y: 1 } });
    const result = LevelValidator.validate(level);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects grid dimensions of 1×1', () => {
    const result = LevelValidator.validate(
      makeLevel({ width: 1, height: 1, goal: { x: 0, y: 0 } })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('dimensions'))).toBe(true);
  });

  it('rejects grid dimensions exceeding 50×50', () => {
    const result = LevelValidator.validate(
      makeLevel({ width: 51, height: 51, goal: { x: 50, y: 50 } })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('dimensions'))).toBe(true);
  });

  it('rejects start position outside grid bounds (negative x)', () => {
    const result = LevelValidator.validate(makeLevel({ start: { x: -1, y: 0 } }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Start position'))).toBe(true);
  });

  it('rejects goal position outside grid bounds (y overflow)', () => {
    const result = LevelValidator.validate(makeLevel({ goal: { x: 0, y: 99 } }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Goal position'))).toBe(true);
  });

  it('rejects start placed directly on a wall', () => {
    const result = LevelValidator.validate(
      makeLevel({ start: { x: 1, y: 1 }, walls: [{ x: 1, y: 1 }] })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Start position cannot be on a wall'))).toBe(true);
  });

  it('rejects goal placed directly on a wall', () => {
    const result = LevelValidator.validate(
      makeLevel({ goal: { x: 3, y: 3 }, walls: [{ x: 3, y: 3 }] })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Goal position cannot be on a wall'))).toBe(true);
  });

  it('rejects start and goal at the same cell', () => {
    const result = LevelValidator.validate(
      makeLevel({ start: { x: 2, y: 2 }, goal: { x: 2, y: 2 } })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('same location'))).toBe(true);
  });

  it('rejects a wall defined outside grid bounds', () => {
    const result = LevelValidator.validate(makeLevel({ walls: [{ x: 100, y: 100 }] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('outside grid bounds'))).toBe(true);
  });

  it('rejects duplicate wall definitions at the same coordinate', () => {
    const result = LevelValidator.validate(
      makeLevel({ walls: [{ x: 1, y: 1 }, { x: 1, y: 1 }] })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });
});

// ─── solvability ───────────────────────────────────────────────────────────

describe('Level Integrity — solvability', () => {
  it('rejects a level where start is completely boxed in by walls', () => {
    // Start at (1,1) surrounded on all four sides
    const level = makeLevel({
      width: 5,
      height: 5,
      start: { x: 1, y: 1 },
      goal: { x: 4, y: 4 },
      walls: [
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 0, y: 1 },
      ],
    });
    const result = LevelValidator.validate(level);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('impossible'))).toBe(true);
  });

  it('BFS reports correct solution length on a known path', () => {
    // 4×1 corridor: start (0,0) → goal (3,0), no walls → 3 moves
    const level = makeLevel({
      width: 4,
      height: 1,
      start: { x: 0, y: 0 },
      goal: { x: 3, y: 0 },
      walls: [],
    });
    const sol = LevelSolver.solve(level);
    expect(sol.solvable).toBe(true);
    expect(sol.optimalMoves).toBe(3);
    expect(sol.directions).toEqual(['RIGHT', 'RIGHT', 'RIGHT']);
  });

  it('BFS solution always has minMoves ≥ 1 for any accepted level', () => {
    const level = makeLevel({ goal: { x: 3, y: 0 }, walls: [] });
    const result = LevelValidator.validate(level);
    if (result.valid && result.solution) {
      expect(result.solution.optimalMoves).toBeGreaterThanOrEqual(1);
    }
  });

  it('BFS detects when a wall configuration creates a no-path situation', () => {
    // 3×3, start (0,0), goal (2,2), walls form a complete vertical barrier
    const level = makeLevel({
      width: 3,
      height: 3,
      start: { x: 0, y: 0 },
      goal: { x: 2, y: 2 },
      walls: [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
    });
    const sol = LevelSolver.solve(level);
    expect(sol.solvable).toBe(false);
    expect(sol.optimalMoves).toBe(-1);
  });

  it('BFS direction sequence actually leads from start to goal', () => {
    const level = makeLevel({
      width: 4,
      height: 4,
      start: { x: 0, y: 0 },
      goal: { x: 3, y: 3 },
      walls: [{ x: 1, y: 1 }],
    });
    const sol = LevelSolver.solve(level);
    expect(sol.solvable).toBe(true);

    // Replay the solution manually
    let pos = { ...level.start };
    const offsets: Record<string, { dx: number; dy: number }> = {
      UP: { dx: 0, dy: -1 },
      DOWN: { dx: 0, dy: 1 },
      LEFT: { dx: -1, dy: 0 },
      RIGHT: { dx: 1, dy: 0 },
    };
    for (const dir of sol.directions) {
      const o = offsets[dir];
      pos = { x: pos.x + o.dx, y: pos.y + o.dy };
    }
    expect(pos).toEqual(level.goal);
  });
});

// ─── LevelLoader: handcrafted levels ─────────────────────────────────────

describe('Level Integrity — LevelLoader handcrafted levels', () => {
  it('LevelLoader.getLevel(1) is a valid level', () => {
    const level = LevelLoader.getLevel(1);
    expect(level).not.toBeNull();
    const result = LevelValidator.validate(level!);
    expect(result.valid).toBe(true);
  });

  it('LevelLoader levels 1–10 all pass validation individually', () => {
    for (let id = 1; id <= 10; id++) {
      const level = LevelLoader.getLevel(id);
      expect(level).not.toBeNull();
      const result = LevelValidator.validate(level!);
      expect(result.valid, `Level ${id}: ${result.errors.join(', ')}`).toBe(true);
      expect(result.solution?.solvable, `Level ${id} should be solvable`).toBe(true);
    }
  });

  it('LevelLoader returns null for level id 0', () => {
    expect(LevelLoader.getLevel(0)).toBeNull();
  });

  it('LevelLoader returns null for level id exceeding MAX_LEVELS', () => {
    expect(LevelLoader.getLevel(LevelLoader.MAX_LEVELS + 1)).toBeNull();
  });

  it('LevelLoader enriches late campaign levels with extreme challenge rules', () => {
    const level = LevelLoader.getLevel(500);
    expect(level?.challenge?.maxLives).toBe(3);
    expect(level?.challenge?.allowUndo).toBe(false);
    expect(level?.timeLimit).toBeDefined();
  });

  it('LevelLoader level ids are sequential and unique for world 1', () => {
    const world1Levels = LevelLoader.getLevelsByWorld(1);
    const ids = world1Levels.map(l => l.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length); // no duplicates
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(25);
  });
});

// ─── LevelGenerator: procedural levels ────────────────────────────────────

describe('Level Integrity — procedural generation sample', () => {
  it('10 procedurally generated levels from different difficulty bands all pass validation', () => {
    const sampleIds = [30, 50, 80, 120, 160, 200, 280, 360, 420, 490];

    for (const id of sampleIds) {
      LevelGenerator.clearRegistry();
      const level = LevelGenerator.generate(id);
      const result = LevelValidator.validate(level);
      expect(
        result.valid,
        `Generated level ${id} failed: ${result.errors.join(', ')}`
      ).toBe(true);
      expect(
        result.solution?.solvable,
        `Generated level ${id} should be solvable`
      ).toBe(true);
      expect(
        result.solution!.optimalMoves,
        `Generated level ${id} should require ≥ 1 move`
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('generated levels have valid integer width and height', () => {
    LevelGenerator.clearRegistry();
    const level = LevelGenerator.generate(100);
    expect(Number.isInteger(level.width)).toBe(true);
    expect(Number.isInteger(level.height)).toBe(true);
    expect(level.width).toBeGreaterThanOrEqual(2);
    expect(level.height).toBeGreaterThanOrEqual(2);
  });

  it('generated level for id 500 (MASTER) has a harder solution than id 1 (TUTORIAL)', () => {
    LevelGenerator.clearRegistry();
    const tutorial = LevelGenerator.generate(1, 'TUTORIAL');
    LevelGenerator.clearRegistry();
    const master = LevelGenerator.generate(500, 'MASTER');

    expect(master.optimalSolutionLength!).toBeGreaterThan(tutorial.optimalSolutionLength!);
    expect(master.width).toBeGreaterThan(tutorial.width);
  });
});
