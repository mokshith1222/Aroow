import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';
import { DifficultyManager } from '../src/game/DifficultyManager';

describe('Level Completion & Star System', () => {
  let engine: GameEngine;

  const simpleLevel: LevelData = {
    id: 1,
    worldId: 1,
    name: 'Simple Completion Level',
    width: 3,
    height: 3,
    start: { x: 0, y: 0 },
    goal: { x: 2, y: 0 },
    walls: [],
    parMoves: 2,
    targetMoves: 2,
    targetTime: 10,
    optimalSolutionLength: 2,
    difficulty: 1
  };

  beforeEach(() => {
    engine = new GameEngine();
    engine.startLevel(simpleLevel); engine.startPlaying();
  });

  it('triggers LEVEL_COMPLETE when player reaches goal', () => {
    engine.move('RIGHT');
    expect(engine.getSnapshot().state).toBe('PLAYING');

    engine.move('RIGHT');
    const snap = engine.getSnapshot();
    expect(snap.state).toBe('LEVEL_COMPLETE');
    expect(snap.playerPos).toEqual({ x: 2, y: 0 });
    expect(snap.moves).toBe(2);
    expect(snap.stars).toBeGreaterThanOrEqual(1);
  });

  it('stops player movement once level is completed', () => {
    engine.move('RIGHT');
    engine.move('RIGHT');
    expect(engine.getSnapshot().state).toBe('LEVEL_COMPLETE');

    const nextRes = engine.move('DOWN');
    expect(nextRes).toBe(false);
    expect(engine.getSnapshot().playerPos).toEqual({ x: 2, y: 0 });
    expect(engine.getSnapshot().moves).toBe(2);
  });

  it('records full completed path upon winning', () => {
    engine.move('RIGHT');
    engine.move('RIGHT');
    const snap = engine.getSnapshot();
    expect(snap.completedPath).toHaveLength(3);
    expect(snap.completedPath[0]).toEqual({ x: 0, y: 0 });
    expect(snap.completedPath[1]).toEqual({ x: 1, y: 0 });
    expect(snap.completedPath[2]).toEqual({ x: 2, y: 0 });
  });

  it('awards 3 stars for an optimal solution with no mistakes', () => {
    const stars = DifficultyManager.calculateStars(2, 2, 0, 3, simpleLevel);
    expect(stars).toBe(3);
  });

  it('penalizes stars if many extra moves and mistakes are made', () => {
    const stars = DifficultyManager.calculateStars(15, 2, 2, 45, simpleLevel);
    expect(stars).toBeLessThanOrEqual(2);
  });
});
