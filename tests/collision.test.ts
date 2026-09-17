import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';

describe('Collision System', () => {
  let engine: GameEngine;

  const wallLevel: LevelData = {
    id: 998,
    worldId: 1,
    name: 'Collision Test Level',
    width: 5,
    height: 5,
    start: { x: 1, y: 1 },
    goal: { x: 4, y: 4 },
    walls: [
      { x: 1, y: 0 }, // UP
      { x: 2, y: 1 }, // RIGHT
      { x: 1, y: 2 }, // DOWN
      { x: 0, y: 1 }  // LEFT
    ]
  };

  beforeEach(() => {
    engine = new GameEngine();
    engine.startLevel(wallLevel);
  });

  it('detects collision when moving UP into a wall and does not change player position', () => {
    const res = engine.move('UP');
    expect(res).toBe(false);
    expect(engine.getSnapshot().playerPos).toEqual({ x: 1, y: 1 });
    expect(engine.getSnapshot().moves).toBe(0);
    expect(engine.getSnapshot().invalidMoveAttempted).toBe(true);
  });

  it('detects collision when moving RIGHT into a wall and registers a mistake', () => {
    expect(engine.getSnapshot().mistakes).toBe(0);
    const res = engine.move('RIGHT');
    expect(res).toBe(false);
    expect(engine.getSnapshot().mistakes).toBe(1);
    expect(engine.getSnapshot().lives).toBe(2);
  });

  it('resets invalidMoveAttempted flag on subsequent valid move', () => {
    const openLevel: LevelData = {
      ...wallLevel,
      walls: [{ x: 1, y: 0 }]
    };
    engine.startLevel(openLevel);

    // Collide with wall UP
    engine.move('UP');
    expect(engine.getSnapshot().invalidMoveAttempted).toBe(true);

    // Move in open direction RIGHT
    engine.move('RIGHT');
    expect(engine.getSnapshot().invalidMoveAttempted).toBe(false);
  });
});
