import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../src/services/StorageService';

describe('Unlocking & Saving System', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = StorageService.getInstance();
    storage.resetAllProgress();
  });

  it('initializes with level 1 unlocked and 0 records', () => {
    expect(storage.getUnlockedLevel()).toBe(1);
    expect(storage.getTotalStars()).toBe(0);
    expect(storage.getLevelRecord(1)).toBeNull();
  });

  it('unlocks level 2 when level 1 is completed', () => {
    storage.saveLevelCompletion(1, 4, 12, 3);
    expect(storage.getUnlockedLevel()).toBe(2);
    const rec = storage.getLevelRecord(1);
    expect(rec).not.toBeNull();
    expect(rec?.stars).toBe(3);
    expect(rec?.bestMoves).toBe(4);
    expect(rec?.bestTime).toBe(12);
  });

  it('never downgrades star ratings on replay', () => {
    // Complete level 1 with 3 stars
    storage.saveLevelCompletion(1, 4, 10, 3);
    expect(storage.getLevelRecord(1)?.stars).toBe(3);

    // Replay level 1 with worse performance (1 star)
    storage.saveLevelCompletion(1, 10, 30, 1);
    expect(storage.getLevelRecord(1)?.stars).toBe(3); // Still 3!
  });

  it('upgrades bestMoves and bestTime only when performance improves', () => {
    storage.saveLevelCompletion(2, 8, 20, 2);
    expect(storage.getLevelRecord(2)?.bestMoves).toBe(8);
    expect(storage.getLevelRecord(2)?.bestTime).toBe(20);

    // Worse run: moves = 12, time = 25 -> should keep 8 and 20
    storage.saveLevelCompletion(2, 12, 25, 2);
    expect(storage.getLevelRecord(2)?.bestMoves).toBe(8);
    expect(storage.getLevelRecord(2)?.bestTime).toBe(20);

    // Better run: moves = 6, time = 15 -> should update to 6 and 15
    storage.saveLevelCompletion(2, 6, 15, 3);
    expect(storage.getLevelRecord(2)?.bestMoves).toBe(6);
    expect(storage.getLevelRecord(2)?.bestTime).toBe(15);
    expect(storage.getLevelRecord(2)?.stars).toBe(3);
  });

  it('tracks total stars across all completed levels', () => {
    storage.saveLevelCompletion(1, 3, 5, 3);
    storage.saveLevelCompletion(2, 5, 10, 2);
    storage.saveLevelCompletion(3, 7, 15, 3);
    expect(storage.getTotalStars()).toBe(8);
  });
});
