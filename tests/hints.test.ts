import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import { LevelSolver } from '../src/game/LevelSolver';
import type { LevelData, Position } from '../src/game/types';

describe('Phase 37 — Intelligent Hint System', () => {
  let engine: GameEngine;

  const mockLevel: LevelData = {
    id: 1,
    worldId: 1,
    name: 'Hint Test',
    difficulty: 1,
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    goal: { x: 4, y: 4 },
    walls: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 }
    ],
    gates: [],
    keys: []
  };

  beforeEach(() => {
    GameEngine.resetInstance();
    engine = GameEngine.getInstance();
    engine._resetCooldownForTesting();
  });

  describe('LevelSolver getOptimalPath', () => {
    it('returns the full shortest path including start pos', () => {
      const path = LevelSolver.getOptimalPath(mockLevel, { x: 0, y: 0 });
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 4, y: 4 });
    });
  });

  describe('GameEngine Hint Integration', () => {
    beforeEach(() => {
      engine.startLevel(mockLevel);
    });

    it('sets activeHintCells for Level 1 hint (Next Step)', () => {
      engine.requestHint(1);
      const snapshot = engine.getSnapshot();
      expect(snapshot.hintsUsedLevel).toBe(1);
      expect(snapshot.activeHintCells).toHaveLength(1);
      expect(snapshot.activeHintCells[0]).toEqual({ x: 0, y: 1 }); // The first step in the path
    });

    it('sets activeHintCells for Level 2 hint (Next Few Steps)', () => {
      engine.requestHint(2);
      const snapshot = engine.getSnapshot();
      expect(snapshot.hintsUsedLevel).toBe(2);
      expect(snapshot.activeHintCells.length).toBeGreaterThan(1);
      expect(snapshot.activeHintCells.length).toBeLessThanOrEqual(3);
    });

    it('sets activeHintCells for Level 3 hint (Full Path)', () => {
      engine.requestHint(3);
      const snapshot = engine.getSnapshot();
      expect(snapshot.hintsUsedLevel).toBe(3);
      expect(snapshot.activeHintCells.length).toBeGreaterThan(3);
      expect(snapshot.activeHintCells[snapshot.activeHintCells.length - 1]).toEqual({ x: 4, y: 4 });
    });

    it('clears activeHintCells on valid move', () => {
      engine.requestHint(1);
      expect(engine.getSnapshot().activeHintCells).toHaveLength(1);
      
      // Move DOWN (valid)
      engine.move('DOWN');
      expect(engine.getSnapshot().activeHintCells).toHaveLength(0);
    });

    it('tracks the maximum hint level used', () => {
      engine.requestHint(1);
      expect(engine.getSnapshot().hintsUsedLevel).toBe(1);
      
      engine.requestHint(3);
      expect(engine.getSnapshot().hintsUsedLevel).toBe(3);
      
      engine.requestHint(2); // Should not downgrade the max penalty
      expect(engine.getSnapshot().hintsUsedLevel).toBe(3);
    });
  });
});
