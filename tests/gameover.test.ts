import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';

describe('Game Over System', () => {
  let engine: GameEngine;

  const wallTrapLevel: LevelData = {
    id: 994,
    worldId: 1,
    name: 'Game Over Test',
    width: 3,
    height: 3,
    start: { x: 0, y: 0 },
    goal: { x: 2, y: 2 },
    walls: [{ x: 1, y: 0 }] // Wall to the right
  };

  beforeEach(() => {
    engine = new GameEngine();
    engine.startLevel(wallTrapLevel);
  });

  it('transitions to GAME_OVER after 3 collisions', () => {
    engine.move('RIGHT'); // 1
    engine.move('RIGHT'); // 2
    engine.move('RIGHT'); // 3
    expect(engine.getSnapshot().state).toBe('GAME_OVER');
    expect(engine.getSnapshot().lives).toBe(0);
  });

  it('prevents all further movement when in GAME_OVER state', () => {
    engine.move('RIGHT');
    engine.move('RIGHT');
    engine.move('RIGHT');
    expect(engine.getSnapshot().state).toBe('GAME_OVER');

    // Attempt valid move down
    const res = engine.move('DOWN');
    expect(res).toBe(false);
    expect(engine.getSnapshot().playerPos).toEqual({ x: 0, y: 0 });
  });

  it('resets to start position, 3 lives, and PLAYING state upon restart after game over', () => {
    engine.move('RIGHT');
    engine.move('RIGHT');
    engine.move('RIGHT');
    expect(engine.getSnapshot().state).toBe('GAME_OVER');

    engine.restart();
    const snap = engine.getSnapshot();
    expect(snap.state).toBe('PLAYING');
    expect(snap.lives).toBe(3);
    expect(snap.playerPos).toEqual({ x: 0, y: 0 });
    expect(snap.moves).toBe(0);
  });
});
