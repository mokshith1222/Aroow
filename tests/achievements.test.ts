// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { ACHIEVEMENTS, getAchievementById } from '../src/data/achievements';
import { StorageService } from '../src/services/StorageService';
import { AchievementService } from '../src/services/AchievementService';

describe('Phase 34 — Achievement System', () => {
  beforeEach(() => {
    window.localStorage.clear();
    StorageService.resetInstance();
    AchievementService.resetInstance();
  });

  describe('Achievement Definitions', () => {
    it('has all 10 required achievements with valid metadata', () => {
      expect(ACHIEVEMENTS).toHaveLength(10);

      const expectedIds = [
        'first_step',
        'getting_started',
        'puzzle_master',
        'dedicated',
        'grandmaster',
        'perfect_player',
        'untouchable',
        'speed_runner',
        'no_help_needed',
        'daily_player',
      ];

      expectedIds.forEach(id => {
        const ach = getAchievementById(id);
        expect(ach).toBeDefined();
        expect(ach?.title).toBeTruthy();
        expect(ach?.description).toBeTruthy();
        expect(ach?.target).toBeGreaterThan(0);
      });
    });

    it('has correct target thresholds matching requirements', () => {
      expect(getAchievementById('first_step')?.target).toBe(1);
      expect(getAchievementById('getting_started')?.target).toBe(10);
      expect(getAchievementById('puzzle_master')?.target).toBe(100);
      expect(getAchievementById('dedicated')?.target).toBe(250);
      expect(getAchievementById('grandmaster')?.target).toBe(500);
      expect(getAchievementById('perfect_player')?.target).toBe(50);
      expect(getAchievementById('untouchable')?.target).toBe(10);
      expect(getAchievementById('speed_runner')?.target).toBe(1);
      expect(getAchievementById('no_help_needed')?.target).toBe(50);
      expect(getAchievementById('daily_player')?.target).toBe(7);
    });
  });

  describe('StorageService Integration', () => {
    it('initializes with empty unlocked achievements and zeroed stats', () => {
      const storage = StorageService.getInstance();
      expect(storage.getUnlockedAchievements()).toEqual([]);
      expect(storage.getAchievementStats()).toEqual({
        flawlessLevelsCount: 0,
        noHintLevelsCount: 0,
        speedRunLevelsCount: 0,
        dailyChallengesCount: 0,
      });
    });

    it('persists unlocked achievements and prevents duplicate unlocking', () => {
      const storage = StorageService.getInstance();
      expect(storage.unlockAchievement('first_step')).toBe(true);
      expect(storage.hasAchievement('first_step')).toBe(true);
      expect(storage.getUnlockedAchievements()).toContain('first_step');

      // Duplicate unlock returns false
      expect(storage.unlockAchievement('first_step')).toBe(false);
      expect(storage.getUnlockedAchievements()).toHaveLength(1);
    });

    it('records level achievement stats properly', () => {
      const storage = StorageService.getInstance();
      storage.recordLevelAchievementStats({
        noLivesLost: true,
        noHints: true,
        underTargetTime: true,
        isDaily: false,
      });

      const stats = storage.getAchievementStats();
      expect(stats.flawlessLevelsCount).toBe(1);
      expect(stats.noHintLevelsCount).toBe(1);
      expect(stats.speedRunLevelsCount).toBe(1);
      expect(stats.dailyChallengesCount).toBe(0);
    });
  });

  describe('AchievementService Progression & Triggers', () => {
    it('unlocks "First Step" and "Speed Runner" upon first flawless fast level win', () => {
      const storage = StorageService.getInstance();
      const achievementService = AchievementService.getInstance();

      const unlockedToasts: string[] = [];
      achievementService.subscribe(ach => {
        unlockedToasts.push(ach.id);
      });

      // Complete level 1
      storage.saveLevelCompletion(1, 4, 3.2, 3, 100);

      const newlyUnlocked = achievementService.checkLevelWin({
        levelId: 1,
        moves: 4,
        elapsedSeconds: 3.2,
        stars: 3,
        livesRemaining: 3,
        maxLives: 3,
        hintsUsed: 0,
        targetTime: 10,
        isDailyMode: false,
      });

      const unlockedIds = newlyUnlocked.map(a => a.id);
      expect(unlockedIds).toContain('first_step');
      expect(unlockedIds).toContain('speed_runner');
      expect(unlockedToasts).toContain('first_step');
      expect(unlockedToasts).toContain('speed_runner');
    });

    it('unlocks "Untouchable" after 10 flawless level completions', () => {
      const storage = StorageService.getInstance();
      const achievementService = AchievementService.getInstance();

      for (let i = 1; i <= 9; i++) {
        storage.saveLevelCompletion(i, 5, 5, 2, 50);
        achievementService.checkLevelWin({
          levelId: i,
          moves: 5,
          elapsedSeconds: 5,
          stars: 2,
          livesRemaining: 3,
          maxLives: 3,
          hintsUsed: 1,
          isDailyMode: false,
        });
      }

      expect(storage.hasAchievement('untouchable')).toBe(false);

      // 10th flawless completion
      storage.saveLevelCompletion(10, 5, 5, 2, 50);
      const newly = achievementService.checkLevelWin({
        levelId: 10,
        moves: 5,
        elapsedSeconds: 5,
        stars: 2,
        livesRemaining: 3,
        maxLives: 3,
        hintsUsed: 1,
        isDailyMode: false,
      });

      expect(newly.map(a => a.id)).toContain('untouchable');
      expect(storage.hasAchievement('untouchable')).toBe(true);
    });

    it('tracks progress percentages correctly in getAllProgress()', () => {
      const storage = StorageService.getInstance();
      const achievementService = AchievementService.getInstance();

      // Complete 5 levels with 3 stars
      for (let i = 1; i <= 5; i++) {
        storage.saveLevelCompletion(i, 4, 5, 3, 100);
      }

      const progress = achievementService.getAllProgress();
      const gettingStarted = progress.find(p => p.achievement.id === 'getting_started');
      expect(gettingStarted?.current).toBe(5);
      expect(gettingStarted?.target).toBe(10);
      expect(gettingStarted?.percentage).toBe(50);
      expect(gettingStarted?.isUnlocked).toBe(false);

      const firstStep = progress.find(p => p.achievement.id === 'first_step');
      expect(firstStep?.current).toBe(1);
      expect(firstStep?.percentage).toBe(100);
      expect(firstStep?.isUnlocked).toBe(true);
    });

    it('unlocks "Daily Player" after 7 daily challenge wins', () => {
      const storage = StorageService.getInstance();
      const achievementService = AchievementService.getInstance();

      for (let day = 1; day <= 7; day++) {
        achievementService.checkLevelWin({
          levelId: 1000 + day,
          moves: 5,
          elapsedSeconds: 15,
          stars: 3,
          livesRemaining: 2, // lost a life, so untouchable doesn't advance
          maxLives: 3,
          hintsUsed: 0,
          isDailyMode: true,
        });
      }

      expect(storage.hasAchievement('daily_player')).toBe(true);
      expect(storage.getAchievementStats().dailyChallengesCount).toBe(7);
    });
  });
});
