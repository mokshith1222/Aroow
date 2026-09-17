import { describe, it, expect, beforeEach } from 'vitest';
import { WorldManager, initialWorlds } from '../src/data/worlds';
import { LevelLoader } from '../src/game/LevelLoader';
import { StorageService } from '../src/services/StorageService';

describe('PHASE 8 — World Progression System', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = StorageService.getInstance();
    storage.resetAllProgress();
  });

  it('defines the 8 initial worlds with correct level boundaries', () => {
    expect(initialWorlds).toHaveLength(8);

    expect(initialWorlds[0]).toMatchObject({ id: 1, startLevel: 1, endLevel: 25 });
    expect(initialWorlds[1]).toMatchObject({ id: 2, startLevel: 26, endLevel: 75 });
    expect(initialWorlds[2]).toMatchObject({ id: 3, startLevel: 76, endLevel: 150 });
    expect(initialWorlds[3]).toMatchObject({ id: 4, startLevel: 151, endLevel: 225 });
    expect(initialWorlds[4]).toMatchObject({ id: 5, startLevel: 226, endLevel: 300 });
    expect(initialWorlds[5]).toMatchObject({ id: 6, startLevel: 301, endLevel: 375 });
    expect(initialWorlds[6]).toMatchObject({ id: 7, startLevel: 376, endLevel: 450 });
    expect(initialWorlds[7]).toMatchObject({ id: 8, startLevel: 451, endLevel: 500 });
  });

  it('unlocks Level 1 and World 1 initially', () => {
    const unlockedLevel = storage.getUnlockedLevel();
    expect(unlockedLevel).toBe(1);
    const levelRecords = storage.getAllLevelRecords();
    expect(WorldManager.isWorldUnlocked(1, levelRecords)).toBe(true);
    expect(WorldManager.isWorldUnlocked(2, levelRecords)).toBe(false);
  });

  it('unlocks the next level upon level completion', () => {
    storage.saveLevelCompletion(1, 4, 10, 3);
    expect(storage.getUnlockedLevel()).toBe(2);

    storage.saveLevelCompletion(2, 5, 12, 3);
    expect(storage.getUnlockedLevel()).toBe(3);
  });

  it('completing the final level of World 1 (Level 25) with all stars unlocks World 2 (Level 26)', () => {
    // Fill all 25 levels with 3 stars to unlock World 2
    for (let i = 1; i <= 25; i++) {
      storage.saveLevelCompletion(i, 5, 10, 3, 10);
    }
    
    expect(storage.getUnlockedLevel()).toBe(26);
    expect(WorldManager.isWorldUnlocked(1, storage.getAllLevelRecords())).toBe(true);
    expect(WorldManager.isWorldUnlocked(2, storage.getAllLevelRecords())).toBe(true);
    expect(WorldManager.isWorldUnlocked(3, storage.getAllLevelRecords())).toBe(false);
  });

  it('completing the final level of World 2 (Level 75) with all stars unlocks World 3 (Level 76)', () => {
    for (let i = 26; i <= 75; i++) {
      storage.saveLevelCompletion(i, 5, 10, 3, 10);
    }
    
    expect(WorldManager.isWorldUnlocked(3, storage.getAllLevelRecords())).toBe(true);
    expect(WorldManager.isWorldUnlocked(4, storage.getAllLevelRecords())).toBe(false);
  });

  it('completing final levels unlocks subsequent worlds sequentially through World 8', () => {
    const endLevels = [25, 75, 150, 225, 300, 375, 450];
    let startLevel = 1;
    
    endLevels.forEach((end, idx) => {
      const nextWorldId = idx + 2;
      for (let i = startLevel; i <= end; i++) {
        storage.saveLevelCompletion(i, 5, 10, 3, 10);
      }
      startLevel = end + 1;
      expect(WorldManager.isWorldUnlocked(nextWorldId, storage.getAllLevelRecords())).toBe(true);
    });
  });

  it('dynamically extends worlds beyond level 500 for future expansion', () => {
    // Check level 501 belongs to World 9
    const world501 = WorldManager.getWorldForLevel(501);
    expect(world501.id).toBe(9);
    expect(world501.startLevel).toBe(501);
    expect(world501.endLevel).toBe(600);

    // Completing level 500 unlocks World 9
    for (let i = 1; i <= 500; i++) {
      storage.saveLevelCompletion(i, 5, 10, 3, 10);
    }
    expect(WorldManager.isWorldUnlocked(9, storage.getAllLevelRecords())).toBe(true);
  });

  it('never removes completed progress or downgrades unlockedLevel', () => {
    for (let i = 1; i <= 10; i++) storage.saveLevelCompletion(i, 5, 10, 3);
    expect(storage.getUnlockedLevel()).toBe(11);

    // Replay earlier level
    storage.saveLevelCompletion(3, 4, 8, 2);
    expect(storage.getUnlockedLevel()).toBe(11); // Still 11!
  });

  it('LevelLoader.getLevelsByWorld returns exactly the right levels for each world', () => {
    const w1Levels = LevelLoader.getLevelsByWorld(1);
    expect(w1Levels).toHaveLength(25);
    expect(w1Levels[0].id).toBe(1);
    expect(w1Levels[24].id).toBe(25);

    const w2Levels = LevelLoader.getLevelsByWorld(2);
    expect(w2Levels).toHaveLength(50); // 75 - 26 + 1 = 50
    expect(w2Levels[0].id).toBe(26);
    expect(w2Levels[49].id).toBe(75);

    const w7Levels = LevelLoader.getLevelsByWorld(7);
    expect(w7Levels).toHaveLength(75); // 450 - 376 + 1 = 75
    expect(w7Levels[0].id).toBe(376);
    expect(w7Levels[74].id).toBe(450);

    const w8Levels = LevelLoader.getLevelsByWorld(8);
    expect(w8Levels).toHaveLength(50); // 500 - 451 + 1 = 50
    expect(w8Levels[0].id).toBe(451);
    expect(w8Levels[49].id).toBe(500);
  });
});
