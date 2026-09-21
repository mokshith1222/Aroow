import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';

describe('Three-Chance / Lives System', () => {
  let engine: GameEngine;

  const testLevel: LevelData = {
    id: 1,
    worldId: 1,
    name: 'Lives Test Level',
    width: 3,
    height: 3,
    start: { x: 1, y: 1 },
    goal: { x: 2, y: 2 },
    walls: [{ x: 1, y: 0 }] // Wall UP
  };

  beforeEach(() => {
    engine = new GameEngine();
    engine.startLevel(testLevel); engine.startPlaying();
  });

  it('starts each level with exactly 3 lives', () => {
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(3);
    expect(snap.maxLives).toBe(3);
    expect(snap.mistakes).toBe(0);
  });

  it('decreases to 2 lives after the first mistake', () => {
    engine.move('UP'); // hits wall
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(2);
    expect(snap.mistakes).toBe(1);
    expect(snap.state).toBe('PLAYING');
  });

  it('decreases to 1 life after the second mistake', () => {
    engine.move('UP'); // 1st mistake
    engine.move('UP'); // 2nd mistake
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(1);
    expect(snap.mistakes).toBe(2);
    expect(snap.state).toBe('PLAYING');
  });

  it('triggers GAME_OVER after the third mistake and drops lives to 0', () => {
    engine.move('UP'); // 1st
    engine.move('UP'); // 2nd
    engine.move('UP'); // 3rd
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(0);
    expect(snap.mistakes).toBe(3);
    expect(snap.state).toBe('GAME_OVER');
  });

  it('never allows lives to become negative', () => {
    for (let i = 0; i < 6; i++) {
      engine.move('UP');
    }
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(0);
    expect(snap.lives).toBeGreaterThanOrEqual(0);
  });

  it('resets lives back to 3 upon restart', () => {
    engine.move('UP');
    engine.move('UP');
    expect(engine.getSnapshot().lives).toBe(1);

    engine.restart(); engine.startPlaying();
    expect(engine.getSnapshot().lives).toBe(3);
    expect(engine.getSnapshot().mistakes).toBe(0);
    expect(engine.getSnapshot().state).toBe('PLAYING');
  });

  it('resets lives back to 3 when starting a new level', () => {
    engine.move('UP');
    expect(engine.getSnapshot().lives).toBe(2);

    const level2: LevelData = { ...testLevel, id: 1 };
    engine.startLevel(level2); engine.startPlaying();
    expect(engine.getSnapshot().lives).toBe(3);
    expect(engine.getSnapshot().mistakes).toBe(0);
  });

  it('revives with 1 life after ad in GAME_OVER state', () => {
    engine.move('UP');
    engine.move('UP');
    engine.move('UP');
    expect(engine.getSnapshot().state).toBe('GAME_OVER');

    engine.reviveWithAd();
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(1);
    expect(snap.state).toBe('PLAYING');
  });
});
