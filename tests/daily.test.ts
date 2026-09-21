import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import { StorageService } from '../src/services/StorageService';
import { LevelGenerator } from '../src/game/LevelGenerator';

describe('Daily Puzzle System', () => {
  let engine: GameEngine;
  let storage: StorageService;

  beforeEach(() => {
    // Reset singleton state for tests
    StorageService.resetInstance();
    // Use mock storage
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
    storage = StorageService.getInstance();
    engine = new GameEngine();
  });

  it('generates a deterministic level for the same date string', () => {
    engine.startDailyLevel('2026-09-17'); engine.startPlaying();
    const firstDailyLevel = engine.getSnapshot().level;
    expect(firstDailyLevel).not.toBeNull();
    
    // Create a new engine instance to ensure no leaked state
    const engine2 = new GameEngine();
    
    // Clear the duplicate prevention registry since we are intentionally generating the exact same level
    LevelGenerator.clearRegistry();

    engine2.startDailyLevel('2026-09-17');
    const secondDailyLevel = engine2.getSnapshot().level;

    // Both should be exactly the same
    expect(firstDailyLevel?.start).toEqual(secondDailyLevel?.start);
    expect(firstDailyLevel?.goal).toEqual(secondDailyLevel?.goal);
    expect(firstDailyLevel?.walls).toEqual(secondDailyLevel?.walls);
  });

  it('generates a different level for a different date string', () => {
    engine.startDailyLevel('2026-09-17'); engine.startPlaying();
    const firstDailyLevel = engine.getSnapshot().level;
    
    const engine2 = new GameEngine();
    engine2.startDailyLevel('2026-09-18');
    const secondDailyLevel = engine2.getSnapshot().level;

    // The levels should have some differences (e.g., walls or start/goal positions)
    const isSame = 
      firstDailyLevel?.start.x === secondDailyLevel?.start.x &&
      firstDailyLevel?.start.y === secondDailyLevel?.start.y &&
      firstDailyLevel?.walls.length === secondDailyLevel?.walls.length;

    expect(isSame).toBe(false);
  });

  it('sets isDailyMode and changes level name to Daily Puzzle', () => {
    engine.startDailyLevel('2026-09-17'); engine.startPlaying();
    const snapshot = engine.getSnapshot();
    expect(snapshot.isDailyMode).toBe(true);
    expect(snapshot.level?.name).toBe('Daily Puzzle');
  });

  it('StorageService tracks daily completion', () => {
    expect(storage.getDailyCompletedDate()).toBeUndefined();
    storage.setDailyCompleted('2026-09-17');
    expect(storage.getDailyCompletedDate()).toBe('2026-09-17');
  });
});
