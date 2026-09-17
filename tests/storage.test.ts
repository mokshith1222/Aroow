// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService, STORAGE_KEY, LEGACY_STORAGE_KEY, CURRENT_SCHEMA_VERSION, PlayerData } from '../src/services/StorageService';

describe('StorageService (Phase 9 - Local Progress)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    StorageService.resetInstance();
    // Spy on console.error to avoid noise in test output for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should initialize with default data if empty (reload page / fresh install)', () => {
    const storage = StorageService.getInstance();
    expect(storage.getUnlockedLevel()).toBe(1);
    expect(storage.getSoundEnabled()).toBe(true);
    expect(storage.getMusicEnabled()).toBe(true);
    expect(storage.getHapticsEnabled()).toBe(true);
    expect(storage.getTotalStars()).toBe(0);
  });

  it('should save and load completed level progress (complete level)', () => {
    const storage = StorageService.getInstance();
    // Complete level 1 with 3 stars
    storage.saveLevelCompletion(1, 15, 10.5, 3);
    
    expect(storage.getUnlockedLevel()).toBe(2);
    expect(storage.getTotalStars()).toBe(3);
    
    const record = storage.getLevelRecord(1);
    expect(record).not.toBeNull();
    expect(record?.stars).toBe(3);
    expect(record?.bestMoves).toBe(15);
    expect(record?.bestTime).toBe(10.5);

    // Simulate close/reopen app (reset instance and reload)
    StorageService.resetInstance();
    const newStorage = StorageService.getInstance();
    
    expect(newStorage.getUnlockedLevel()).toBe(2);
    expect(newStorage.getTotalStars()).toBe(3);
    const newRecord = newStorage.getLevelRecord(1);
    expect(newRecord?.stars).toBe(3);
    expect(newRecord?.bestMoves).toBe(15);
  });

  it('should update best stats but keep highest stars (replay level & upgrade rating)', () => {
    const storage = StorageService.getInstance();
    
    // Initial completion: 2 stars, 20 moves
    storage.saveLevelCompletion(1, 20, 15.0, 2);
    expect(storage.getLevelRecord(1)?.stars).toBe(2);
    expect(storage.getLevelRecord(1)?.bestMoves).toBe(20);

    // Replay with better stars but worse moves (should upgrade stars, keep best moves)
    storage.saveLevelCompletion(1, 25, 20.0, 3);
    expect(storage.getLevelRecord(1)?.stars).toBe(3);
    expect(storage.getLevelRecord(1)?.bestMoves).toBe(20); // Kept 20

    // Replay with better moves but worse stars (should keep 3 stars, upgrade moves)
    storage.saveLevelCompletion(1, 10, 8.0, 1);
    expect(storage.getLevelRecord(1)?.stars).toBe(3); // Kept 3
    expect(storage.getLevelRecord(1)?.bestMoves).toBe(10); // Upgraded to 10
  });

  it('should reset settings', () => {
    const storage = StorageService.getInstance();
    storage.setSoundEnabled(false);
    storage.setHapticsEnabled(false);
    storage.setMusicEnabled(false);
    
    expect(storage.getSoundEnabled()).toBe(false);
    expect(storage.getMusicEnabled()).toBe(false);

    // Simulate app reload
    StorageService.resetInstance();
    const loaded = StorageService.getInstance();
    expect(loaded.getSoundEnabled()).toBe(false);
    
    loaded.resetAllProgress();
    expect(loaded.getSoundEnabled()).toBe(true); // resetAllProgress resets to default
    expect(loaded.getUnlockedLevel()).toBe(1);
    expect(loaded.getTotalStars()).toBe(0);
  });

  it('should handle corrupted storage gracefully (fallback to default, backup data)', () => {
    window.localStorage.setItem(STORAGE_KEY, '{invalid json');
    const storage = StorageService.getInstance();
    
    expect(storage.getUnlockedLevel()).toBe(1); // Default
    
    // Check if backup exists
    let backupFound = false;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_KEY}_corrupted_`)) {
        backupFound = true;
        break;
      }
    }
    expect(backupFound).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it('should not lose existing progress when migrating from legacy version', () => {
    // Setup legacy data (v1, no schemaVersion, no musicEnabled)
    const legacyData = {
      unlockedLevel: 5,
      levelRecords: {
        '1': { stars: 3, bestMoves: 10, bestTime: 5, completedAt: new Date().toISOString() }
      },
      soundEnabled: false,
      hapticsEnabled: true
      // missing schemaVersion and musicEnabled
    };
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyData));

    const storage = StorageService.getInstance();
    
    expect(storage.getUnlockedLevel()).toBe(5);
    expect(storage.getSoundEnabled()).toBe(false);
    expect(storage.getMusicEnabled()).toBe(true); // Default applied
    expect(storage.getLevelRecord(1)?.stars).toBe(3);

    // Check if it saved to new key and deleted legacy
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    const newStored = window.localStorage.getItem(STORAGE_KEY);
    expect(newStored).not.toBeNull();
    const parsed = JSON.parse(newStored!);
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});
