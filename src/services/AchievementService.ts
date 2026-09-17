import { ACHIEVEMENTS, type Achievement, getAchievementById } from '../data/achievements';
import { StorageService } from './StorageService';
import { AudioService } from './AudioService';

export interface LevelWinContext {
  levelId: number;
  moves: number;
  elapsedSeconds: number;
  stars: number;
  livesRemaining: number;
  maxLives: number;
  hintsUsed: number;
  targetTime?: number;
  isDailyMode: boolean;
}

export interface AchievementProgress {
  achievement: Achievement;
  current: number;
  target: number;
  isUnlocked: boolean;
  percentage: number;
}

export type AchievementUnlockListener = (achievement: Achievement) => void;

export class AchievementService {
  private static instance: AchievementService;
  private storage = StorageService.getInstance();
  private audio = AudioService.getInstance();
  private listeners: Set<AchievementUnlockListener> = new Set();

  private constructor() {
    // Retroactive check on load to sync any completed levels
    this.evaluateAll();
  }

  public static getInstance(): AchievementService {
    if (!this.instance) {
      this.instance = new AchievementService();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = undefined as any;
  }

  public subscribe(listener: AchievementUnlockListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(achievement: Achievement): void {
    this.audio.playAchievement();
    this.listeners.forEach(cb => {
      try {
        cb(achievement);
      } catch (err) {
        console.error('Error in achievement listener', err);
      }
    });
  }

  /**
   * Evaluates all achievements without advancing level-specific run stats.
   * Useful on initialization or after data restore.
   */
  public evaluateAll(): Achievement[] {
    const newlyUnlocked: Achievement[] = [];
    const completedLevels = this.storage.getCompletedLevelsCount();
    const threeStarLevels = this.storage.getThreeStarLevelsCount();
    const stats = this.storage.getAchievementStats();

    const evaluate = (id: string, current: number, target: number) => {
      if (current >= target && !this.storage.hasAchievement(id)) {
        if (this.storage.unlockAchievement(id)) {
          const ach = getAchievementById(id);
          if (ach) newlyUnlocked.push(ach);
        }
      }
    };

    evaluate('first_step', completedLevels, 1);
    evaluate('getting_started', completedLevels, 10);
    evaluate('puzzle_master', completedLevels, 100);
    evaluate('dedicated', completedLevels, 250);
    evaluate('grandmaster', completedLevels, 500);
    evaluate('perfect_player', threeStarLevels, 50);
    evaluate('untouchable', stats.flawlessLevelsCount, 10);
    evaluate('speed_runner', stats.speedRunLevelsCount, 1);
    evaluate('no_help_needed', stats.noHintLevelsCount, 50);
    evaluate('daily_player', stats.dailyChallengesCount, 7);

    return newlyUnlocked;
  }

  /**
   * Called when a level is completed.
   * Updates stats and checks for any newly unlocked achievements.
   */
  public checkLevelWin(context: LevelWinContext): Achievement[] {
    const noLivesLost = context.livesRemaining === context.maxLives;
    const noHints = context.hintsUsed === 0;
    const underTargetTime = context.targetTime != null && context.elapsedSeconds <= context.targetTime;
    const isDaily = context.isDailyMode;

    // Record session stats
    this.storage.recordLevelAchievementStats({
      noLivesLost,
      noHints,
      underTargetTime,
      isDaily,
    });

    const newlyUnlocked: Achievement[] = [];
    const completedLevels = this.storage.getCompletedLevelsCount();
    const threeStarLevels = this.storage.getThreeStarLevelsCount();
    const stats = this.storage.getAchievementStats();

    const checkAndUnlock = (id: string, current: number, target: number) => {
      if (current >= target && !this.storage.hasAchievement(id)) {
        if (this.storage.unlockAchievement(id)) {
          const ach = getAchievementById(id);
          if (ach) {
            newlyUnlocked.push(ach);
            this.notify(ach);
          }
        }
      }
    };

    // Progression counts
    checkAndUnlock('first_step', completedLevels, 1);
    checkAndUnlock('getting_started', completedLevels, 10);
    checkAndUnlock('puzzle_master', completedLevels, 100);
    checkAndUnlock('dedicated', completedLevels, 250);
    checkAndUnlock('grandmaster', completedLevels, 500);

    // Mastery & Challenges
    checkAndUnlock('perfect_player', threeStarLevels, 50);
    checkAndUnlock('untouchable', stats.flawlessLevelsCount, 10);
    checkAndUnlock('speed_runner', stats.speedRunLevelsCount, 1);
    checkAndUnlock('no_help_needed', stats.noHintLevelsCount, 50);
    checkAndUnlock('daily_player', stats.dailyChallengesCount, 7);

    return newlyUnlocked;
  }

  /**
   * Retrieves progress details for all achievements.
   */
  public getAllProgress(): AchievementProgress[] {
    const completedLevels = this.storage.getCompletedLevelsCount();
    const threeStarLevels = this.storage.getThreeStarLevelsCount();
    const stats = this.storage.getAchievementStats();
    const unlockedIds = new Set(this.storage.getUnlockedAchievements());

    return ACHIEVEMENTS.map(achievement => {
      let current = 0;
      switch (achievement.id) {
        case 'first_step':
        case 'getting_started':
        case 'puzzle_master':
        case 'dedicated':
        case 'grandmaster':
          current = completedLevels;
          break;
        case 'perfect_player':
          current = threeStarLevels;
          break;
        case 'untouchable':
          current = stats.flawlessLevelsCount;
          break;
        case 'speed_runner':
          current = stats.speedRunLevelsCount;
          break;
        case 'no_help_needed':
          current = stats.noHintLevelsCount;
          break;
        case 'daily_player':
          current = stats.dailyChallengesCount;
          break;
      }

      const isUnlocked = unlockedIds.has(achievement.id) || current >= achievement.target;
      const cappedCurrent = Math.min(current, achievement.target);
      const percentage = Math.min(100, Math.round((cappedCurrent / achievement.target) * 100));

      return {
        achievement,
        current: cappedCurrent,
        target: achievement.target,
        isUnlocked,
        percentage,
      };
    });
  }

  public getUnlockedCount(): number {
    return this.storage.getUnlockedAchievements().length;
  }

  public getTotalCount(): number {
    return ACHIEVEMENTS.length;
  }
}
