// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../src/services/StorageService';
import { WorldManager } from '../src/data/worlds';
import { GameEngine } from '../src/game/GameEngine';
import { LevelLoader } from '../src/game/LevelLoader';
import { DifficultyManager } from '../src/game/DifficultyManager';

describe('Level 76 & Locked Level Fixes', () => {
  let storage: StorageService;
  let engine: GameEngine;

  beforeEach(() => {
    window.localStorage.clear();
    StorageService.resetInstance();
    GameEngine.resetInstance();
    storage = StorageService.getInstance();
    engine = GameEngine.getInstance();
  });

  it('Level 76 awards 3 stars for an optimal solution (10 moves) with 0 mistakes', () => {
    const level76 = LevelLoader.getLevel(76);
    expect(level76).not.toBeNull();
    
    // 10 moves, 0 mistakes on Level 76
    const stars = DifficultyManager.calculateStars(10, 10, 0, 15, level76);
    expect(stars).toBe(3);
  });

  it('Level 76 caps at 2 stars when taking the long route (>= 12 moves)', () => {
    const level76 = LevelLoader.getLevel(76);
    expect(level76).not.toBeNull();

    // 12 moves, 0 mistakes on Level 76
    const stars = DifficultyManager.calculateStars(12, 10, 0, 20, level76);
    expect(stars).toBe(2);
  });

  it('Level 76 remains locked if World 2 is completed without all stars', () => {
    // Complete Level 1 to 74 with 3 stars, but Level 75 with only 1 star
    for (let i = 1; i <= 74; i++) {
      storage.saveLevelCompletion(i, 5, 10, 3, 10);
    }
    storage.saveLevelCompletion(75, 10, 20, 1, 10);

    // World 2 stats: 50 levels * 3 = 150 stars needed. Current: 74*3 + 1 = 223 - 75 = 148 < 150
    const records = storage.getAllLevelRecords();
    expect(WorldManager.isWorldUnlocked(3, records)).toBe(false);

    // Level 76 must be locked
    expect(storage.isLevelUnlocked(76)).toBe(false);
    expect(storage.getUnlockedLevel()).toBe(75);

    // GameEngine must refuse to start locked Level 76
    const startResult = engine.startLevel(76);
    expect(startResult).toBe(false);
  });

  it('engine.nextLevel() does not enter a locked world', () => {
    // Complete up to level 74 with 3 stars
    for (let i = 1; i <= 74; i++) {
      storage.saveLevelCompletion(i, 5, 10, 3, 10);
    }
    // Level 75 is completed with 1 star (World 3 locked)
    storage.saveLevelCompletion(75, 10, 20, 1, 10);

    // Start level 75
    engine.startLevel(75);
    expect(engine.getSnapshot().level?.id).toBe(75);

    // Calling nextLevel must not start level 76
    const nextResult = engine.nextLevel();
    expect(nextResult).toBe(false);
    expect(engine.getSnapshot().state).toBe('LEVEL_SELECT');
  });

  it('Level 76 unlocks once World 2 has all 150 stars', () => {
    for (let i = 1; i <= 75; i++) {
      storage.saveLevelCompletion(i, 5, 10, 3, 10);
    }

    const records = storage.getAllLevelRecords();
    expect(WorldManager.isWorldUnlocked(3, records)).toBe(true);
    expect(storage.isLevelUnlocked(76)).toBe(true);
    expect(storage.getUnlockedLevel()).toBe(76);

    const startResult = engine.startLevel(76);
    expect(startResult).toBe(true);
    expect(engine.getSnapshot().level?.id).toBe(76);
  });
});
