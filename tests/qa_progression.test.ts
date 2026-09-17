/**
 * PHASE 15 — Progression System Tests (Independent QA Review)
 *
 * Validates the full player-progression contract:
 *  - Completing level N unlocks level N+1
 *  - Completing the final level of a world unlocks the next world
 *  - Stars are saved per level and never downgraded
 *  - Best moves / best time only update on improvement
 *  - unlockedLevel never decreases when replaying old levels
 *  - Total stars aggregate correctly across all completed levels
 *  - Persistence: all progress survives a simulated "app reload" (resetInstance)
 *
 * Uses only StorageService and WorldManager — no engine needed.
 */

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../src/services/StorageService';
import { WorldManager } from '../src/data/worlds';
import { LevelLoader } from '../src/game/LevelLoader';

function storage(): StorageService {
  return StorageService.getInstance();
}

beforeEach(() => {
  window.localStorage.clear();
  StorageService.resetInstance();
});

// ─── unlock next level ─────────────────────────────────────────────────────

describe('Progression — unlock next level', () => {
  it('level 1 is unlocked on a fresh save', () => {
    expect(storage().getUnlockedLevel()).toBe(1);
  });

  it('completing level 1 unlocks level 2', () => {
    storage().saveLevelCompletion(1, 5, 10, 3);
    expect(storage().getUnlockedLevel()).toBe(2);
  });

  it('completing level 24 unlocks level 25 (within same world)', () => {
    for (let i = 1; i < 24; i++) storage().saveLevelCompletion(i, 5, 10, 3);
    storage().saveLevelCompletion(24, 6, 15, 2);
    expect(storage().getUnlockedLevel()).toBe(25);
  });

  it('completing each level advances unlocked level sequentially', () => {
    for (let id = 1; id <= 5; id++) {
      storage().saveLevelCompletion(id, 4, 8, 3);
      expect(storage().getUnlockedLevel()).toBe(id + 1);
    }
  });
});

// ─── unlock world ──────────────────────────────────────────────────────────

describe('Progression — unlock world', () => {
  it('World 1 is unlocked initially', () => {
    expect(WorldManager.isWorldUnlocked(1, storage().getAllLevelRecords())).toBe(true);
  });

  it('World 2 is locked initially', () => {
    expect(WorldManager.isWorldUnlocked(2, storage().getAllLevelRecords())).toBe(false);
  });

  it('completing World 1 final level (25) unlocks World 2', () => {
    for (let i = 1; i <= 25; i++) storage().saveLevelCompletion(i, 5, 10, 3);
    const levelRecords = storage().getAllLevelRecords();
    expect(WorldManager.isWorldUnlocked(1, levelRecords)).toBe(true);
    expect(WorldManager.isWorldUnlocked(2, levelRecords)).toBe(true);
  });

  it('completing World 2 final level (75) unlocks World 3', () => {
    for (let i = 1; i <= 75; i++) storage().saveLevelCompletion(i, 5, 10, 3);
    expect(WorldManager.isWorldUnlocked(3, storage().getAllLevelRecords())).toBe(true);
  });

  it('completing World 3 final level (150) unlocks World 4', () => {
    for (let i = 1; i <= 150; i++) storage().saveLevelCompletion(i, 5, 10, 3);
    expect(WorldManager.isWorldUnlocked(4, storage().getAllLevelRecords())).toBe(true);
  });

  it('completing all 7 worlds sequentially unlocks them all', () => {
    const worldEnds = [25, 75, 150, 225, 300, 375, 450];
    let prev = 1;
    for (const endLevel of worldEnds) {
      for (let i = prev; i <= endLevel; i++) {
        storage().saveLevelCompletion(i, 5, 10, 3);
      }
      prev = endLevel + 1;
    }
    for (let w = 1; w <= 7; w++) {
      expect(
        WorldManager.isWorldUnlocked(w, storage().getAllLevelRecords()),
        `World ${w} should be unlocked`
      ).toBe(true);
    }
  });
});

// ─── save stars ───────────────────────────────────────────────────────────

describe('Progression — save stars', () => {
  it('saves 3 stars for a level', () => {
    storage().saveLevelCompletion(1, 3, 5, 3);
    expect(storage().getLevelRecord(1)?.stars).toBe(3);
  });

  it('saves 1 star for a poor run', () => {
    storage().saveLevelCompletion(2, 50, 120, 1);
    expect(storage().getLevelRecord(2)?.stars).toBe(1);
  });

  it('returns null record for a level that was never completed', () => {
    expect(storage().getLevelRecord(99)).toBeNull();
  });

  it('bestMoves is saved correctly on first completion', () => {
    storage().saveLevelCompletion(3, 7, 14, 2);
    expect(storage().getLevelRecord(3)?.bestMoves).toBe(7);
  });

  it('bestTime is saved correctly on first completion', () => {
    storage().saveLevelCompletion(4, 6, 18.5, 2);
    expect(storage().getLevelRecord(4)?.bestTime).toBe(18.5);
  });
});

// ─── upgrade stars ────────────────────────────────────────────────────────

describe('Progression — upgrade stars (never downgrade)', () => {
  it('stars are upgraded from 1 to 3 on replay', () => {
    storage().saveLevelCompletion(1, 20, 60, 1);
    expect(storage().getLevelRecord(1)?.stars).toBe(1);
    storage().saveLevelCompletion(1, 4, 8, 3);
    expect(storage().getLevelRecord(1)?.stars).toBe(3);
  });

  it('stars are NOT downgraded on a worse replay', () => {
    storage().saveLevelCompletion(1, 4, 8, 3);
    storage().saveLevelCompletion(1, 25, 90, 1);
    expect(storage().getLevelRecord(1)?.stars).toBe(3);
  });

  it('stars stay the same when replaying with equal performance', () => {
    storage().saveLevelCompletion(1, 4, 8, 2);
    storage().saveLevelCompletion(1, 4, 8, 2);
    expect(storage().getLevelRecord(1)?.stars).toBe(2);
  });

  it('bestMoves updates when a better run is achieved', () => {
    storage().saveLevelCompletion(2, 10, 20, 2);
    storage().saveLevelCompletion(2, 6, 15, 2);
    expect(storage().getLevelRecord(2)?.bestMoves).toBe(6);
  });

  it('bestMoves is NOT updated when the new run is worse', () => {
    storage().saveLevelCompletion(2, 6, 15, 2);
    storage().saveLevelCompletion(2, 12, 30, 2);
    expect(storage().getLevelRecord(2)?.bestMoves).toBe(6);
  });

  it('bestTime updates when a faster run is achieved', () => {
    storage().saveLevelCompletion(3, 5, 20, 2);
    storage().saveLevelCompletion(3, 5, 10, 2);
    expect(storage().getLevelRecord(3)?.bestTime).toBe(10);
  });

  it('bestTime is NOT updated when the new run is slower', () => {
    storage().saveLevelCompletion(3, 5, 10, 2);
    storage().saveLevelCompletion(3, 5, 25, 2);
    expect(storage().getLevelRecord(3)?.bestTime).toBe(10);
  });

  it('unlockedLevel is never regressed when replaying an old level', () => {
    for (let i = 1; i <= 10; i++) storage().saveLevelCompletion(i, 5, 10, 3);
    expect(storage().getUnlockedLevel()).toBe(11);
    
    // Replay level 3 with a worse run
    storage().saveLevelCompletion(3, 20, 60, 1);
    expect(storage().getUnlockedLevel()).toBe(11); // Must NOT drop back to 4
  });

  it('total stars aggregates correctly across many levels', () => {
    storage().saveLevelCompletion(1, 4, 8, 3);   // 3
    storage().saveLevelCompletion(2, 7, 14, 2);   // 2
    storage().saveLevelCompletion(3, 6, 12, 1);   // 1
    storage().saveLevelCompletion(4, 5, 10, 3);   // 3
    expect(storage().getTotalStars()).toBe(9);
  });
});

// ─── persistence after reload ─────────────────────────────────────────────

describe('Progression — persistence after reload', () => {
  it('unlockedLevel persists after simulated app reload', () => {
    for (let i = 1; i <= 5; i++) storage().saveLevelCompletion(i, 4, 8, 3);
    expect(storage().getUnlockedLevel()).toBe(6);

    // Simulate reload
    StorageService.resetInstance();
    expect(StorageService.getInstance().getUnlockedLevel()).toBe(6);
  });

  it('star records persist after simulated app reload', () => {
    storage().saveLevelCompletion(1, 4, 8, 3);
    storage().saveLevelCompletion(2, 6, 14, 2);

    StorageService.resetInstance();
    const reloaded = StorageService.getInstance();
    expect(reloaded.getLevelRecord(1)?.stars).toBe(3);
    expect(reloaded.getLevelRecord(2)?.stars).toBe(2);
  });

  it('bestMoves and bestTime persist after reload', () => {
    storage().saveLevelCompletion(3, 7, 12.5, 2);
    StorageService.resetInstance();
    const reloaded = StorageService.getInstance();
    expect(reloaded.getLevelRecord(3)?.bestMoves).toBe(7);
    expect(reloaded.getLevelRecord(3)?.bestTime).toBe(12.5);
  });

  it('sound, music, haptics settings persist after reload', () => {
    storage().setSoundEnabled(false);
    storage().setMusicEnabled(false);
    storage().setHapticsEnabled(false);

    StorageService.resetInstance();
    const reloaded = StorageService.getInstance();
    expect(reloaded.getSoundEnabled()).toBe(false);
    expect(reloaded.getMusicEnabled()).toBe(false);
    expect(reloaded.getHapticsEnabled()).toBe(false);
  });

  it('resetAllProgress wipes all records and reverts to defaults', () => {
    storage().saveLevelCompletion(1, 4, 8, 3);
    storage().setSoundEnabled(false);
    storage().resetAllProgress();

    expect(storage().getUnlockedLevel()).toBe(1);
    expect(storage().getLevelRecord(1)).toBeNull();
    expect(storage().getSoundEnabled()).toBe(true);
    expect(storage().getTotalStars()).toBe(0);
  });

  it('progress from many levels survives reload without data loss', () => {
    for (let i = 1; i <= 15; i++) {
      storage().saveLevelCompletion(i, 4 + i, 8 + i, i % 3 === 0 ? 3 : 2);
    }
    const beforeReload = storage().getUnlockedLevel();
    const beforeStars = storage().getTotalStars();

    StorageService.resetInstance();
    const reloaded = StorageService.getInstance();
    expect(reloaded.getUnlockedLevel()).toBe(beforeReload);
    expect(reloaded.getTotalStars()).toBe(beforeStars);
  });

  it('LevelLoader exposes all 500 levels without gap', () => {
    // Spot check: every 50th level loads successfully
    for (let id = 1; id <= 500; id += 50) {
      const level = LevelLoader.getLevel(id);
      expect(level, `Level ${id} should not be null`).not.toBeNull();
      expect(level?.id).toBe(id);
    }
  });
});
