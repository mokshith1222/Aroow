import { DifficultyPresetName } from './LevelGeneratorPresets';

export interface LevelPerformance {
  moves: number;
  optimalMoves: number;
  livesRemaining: number;
  timeSeconds: number;
  targetTime?: number; // Not all levels have strict target times
  hintsUsed: number;
}

export interface RewardBreakdown {
  basePoints: number;
  perfectPathBonus: number;
  noLivesLostBonus: number;
  fastCompletionBonus: number;
  noHintsBonus: number;
  totalPoints: number;
}

export class EconomyService {
  private static readonly BASE_REWARDS: Record<DifficultyPresetName, number> = {
    TUTORIAL: 25,
    EASY: 50,
    NORMAL: 75,
    MEDIUM: 100,
    HARD: 150,
    VERY_HARD: 175,
    EXPERT: 200,
    MASTER: 300,
  };

  /**
   * Calculate points and bonuses for a completed level.
   */
  public static calculateReward(preset: DifficultyPresetName, performance: LevelPerformance): RewardBreakdown {
    const basePoints = this.BASE_REWARDS[preset] || 50; // Fallback if preset is missing

    let perfectPathBonus = 0;
    let noLivesLostBonus = 0;
    let fastCompletionBonus = 0;
    let noHintsBonus = 0;

    // Bonus: Perfect Shortest Path (+25%)
    // Allow if optimalMoves is calculated and the player matched or beat it
    if (performance.optimalMoves > 0 && performance.moves <= performance.optimalMoves) {
      perfectPathBonus = Math.floor(basePoints * 0.25);
    }

    // Bonus: No Life Lost (+20%)
    if (performance.livesRemaining === 3) {
      noLivesLostBonus = Math.floor(basePoints * 0.20);
    }

    // Bonus: Fast Completion (+15%)
    if (performance.targetTime && performance.targetTime > 0) {
      if (performance.timeSeconds <= performance.targetTime) {
        fastCompletionBonus = Math.floor(basePoints * 0.15);
      }
    } else {
      // If there's no explicitly defined targetTime, we can apply an implicit logic based on optimal moves:
      // roughly 1 move per second + a bit of thinking time.
      const implicitTargetTime = performance.optimalMoves * 1.5 + 5;
      if (performance.timeSeconds <= implicitTargetTime) {
        fastCompletionBonus = Math.floor(basePoints * 0.15);
      }
    }

    // Bonus: No Hints Used (+10%)
    if (performance.hintsUsed === 0) {
      noHintsBonus = Math.floor(basePoints * 0.10);
    }

    const totalPoints = basePoints + perfectPathBonus + noLivesLostBonus + fastCompletionBonus + noHintsBonus;

    return {
      basePoints,
      perfectPathBonus,
      noLivesLostBonus,
      fastCompletionBonus,
      noHintsBonus,
      totalPoints,
    };
  }
}
