import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';

describe('Movement System', () => {
  let engine: GameEngine;

  const testLevel: LevelData = {
    id: 1,
    worldId: 1,
    name: 'Movement Test Level',
    width: 5,
    height: 5,
    start: { x: 2, y: 2 },
    goal: { x: 4, y: 4 },
    walls: [
      { x: 2, y: 1 } // Wall immediately above start
    ],
    parMoves: 4
  };

  beforeEach(() => {
    engine = new GameEngine();
    engine.startLevel(testLevel); engine.startPlaying();
  });

  it('moves player RIGHT when valid and updates position', () => {
    const res = engine.move('RIGHT');
    expect(res).toBe(true);
    expect(engine.getSnapshot().playerPos).toEqual({ x: 3, y: 2 });
    expect(engine.getSnapshot().moves).toBe(1);
  });

  it('moves player DOWN when valid and updates position', () => {
    const res = engine.move('DOWN');
    expect(res).toBe(true);
    expect(engine.getSnapshot().playerPos).toEqual({ x: 2, y: 3 });
    expect(engine.getSnapshot().moves).toBe(1);
  });

  it('moves player LEFT when valid and updates position', () => {
    const res = engine.move('LEFT');
    expect(res).toBe(true);
    expect(engine.getSnapshot().playerPos).toEqual({ x: 1, y: 2 });
    expect(engine.getSnapshot().moves).toBe(1);
  });

  it('prevents movement past top grid boundary', () => {
    // Start at (0, 0)
    const cornerLevel: LevelData = {
      ...testLevel,
      start: { x: 0, y: 0 },
      walls: []
    };
    engine.startLevel(cornerLevel); engine.startPlaying();

    const res = engine.move('UP');
    expect(res).toBe(false);
    expect(engine.getSnapshot().playerPos).toEqual({ x: 0, y: 0 });
    expect(engine.getSnapshot().moves).toBe(0);
  });

  it('prevents movement past left grid boundary', () => {
    const cornerLevel: LevelData = {
      ...testLevel,
      start: { x: 0, y: 0 },
      walls: []
    };
    engine.startLevel(cornerLevel); engine.startPlaying();

    const res = engine.move('LEFT');
    expect(res).toBe(false);
    expect(engine.getSnapshot().playerPos).toEqual({ x: 0, y: 0 });
    expect(engine.getSnapshot().moves).toBe(0);
  });

  it('supports undoing a valid move', () => {
    engine.move('RIGHT');
    expect(engine.getSnapshot().playerPos).toEqual({ x: 3, y: 2 });
    expect(engine.getSnapshot().moves).toBe(1);
    expect(engine.getSnapshot().canUndo).toBe(true);

    const undoSuccess = engine.undo();
    expect(undoSuccess).toBe(true);
    expect(engine.getSnapshot().playerPos).toEqual({ x: 2, y: 2 });
    expect(engine.getSnapshot().moves).toBe(0);
  });
});
