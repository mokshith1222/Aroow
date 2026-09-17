import type { LevelData } from './types';

/**
 * Star Rating System
 * 
 * Stars are calculated based on three weighted factors:
 *   1. Move efficiency   (50% weight) — moves vs optimal/target
 *   2. Mistake penalty   (30% weight) — number of invalid move attempts
 *   3. Time performance  (20% weight) — completion time vs target time
 * 
 * Design constraints:
 *   - Later levels MUST NOT be impossible to 3-star. Thresholds scale
 *     with difficulty so that a skilled player can always earn 3 stars.
 *   - Stars are never downgraded; StorageService persists the max.
 *   - Players can replay any unlocked level to improve their rating.
 */

export interface StarThresholds {
  threeStarMoves: number;
  twoStarMoves: number;
  threeStarTime: number;
  twoStarTime: number;
  maxMistakesForThree: number;
  maxMistakesForTwo: number;
}

export class DifficultyManager {

  /**
   * Calculate the star rating (1–3) for a completed level.
   */
  public static calculateStars(
    moves: number,
    parMoves: number,
    mistakes: number = 0,
    elapsedSeconds: number = 0,
    level?: LevelData | null
  ): number {
    if (moves <= 0) return 1;
    if (parMoves <= 0) return 3;

    const thresholds = this.getThresholds(parMoves, level);

    // --- Factor 1: Move efficiency (0–100) ---
    let moveScore: number;
    if (moves <= thresholds.threeStarMoves) {
      moveScore = 100;
    } else if (moves <= thresholds.twoStarMoves) {
      // Linear interpolation between 3-star and 2-star boundary
      const range = thresholds.twoStarMoves - thresholds.threeStarMoves;
      const over = moves - thresholds.threeStarMoves;
      moveScore = 100 - (over / Math.max(range, 1)) * 34;
    } else {
      // Beyond 2-star threshold, decay toward 0
      const beyondTwo = moves - thresholds.twoStarMoves;
      moveScore = Math.max(0, 66 - beyondTwo * 8);
    }

    // --- Factor 2: Mistake penalty (0–100) ---
    let mistakeScore: number;
    if (mistakes <= thresholds.maxMistakesForThree) {
      mistakeScore = 100;
    } else if (mistakes <= thresholds.maxMistakesForTwo) {
      const range = thresholds.maxMistakesForTwo - thresholds.maxMistakesForThree;
      const over = mistakes - thresholds.maxMistakesForThree;
      mistakeScore = 100 - (over / Math.max(range, 1)) * 34;
    } else {
      mistakeScore = Math.max(0, 66 - (mistakes - thresholds.maxMistakesForTwo) * 15);
    }

    // --- Factor 3: Time performance (0–100) ---
    let timeScore = 100;
    if (elapsedSeconds > 0 && thresholds.threeStarTime > 0) {
      if (elapsedSeconds <= thresholds.threeStarTime) {
        timeScore = 100;
      } else if (elapsedSeconds <= thresholds.twoStarTime) {
        const range = thresholds.twoStarTime - thresholds.threeStarTime;
        const over = elapsedSeconds - thresholds.threeStarTime;
        timeScore = 100 - (over / Math.max(range, 1)) * 34;
      } else {
        const beyond = elapsedSeconds - thresholds.twoStarTime;
        timeScore = Math.max(0, 66 - beyond * 2);
      }
    }

    // --- Weighted composite ---
    const composite = moveScore * 0.50 + mistakeScore * 0.30 + timeScore * 0.20;

    if (composite >= 85) return 3;
    if (composite >= 55) return 2;
    return 1;
  }

  /**
   * Compute adaptive thresholds based on level properties.
   * Later/harder levels get more generous margins so 3 stars remains achievable.
   */
  public static getThresholds(parMoves: number, level?: LevelData | null): StarThresholds {
    // Difficulty from 1–10 (default based on level id, clamped)
    const difficulty = level?.difficulty ?? Math.min(10, Math.ceil((level?.id ?? 1) / 50));
    const difficultyFactor = 1 + difficulty * 0.06; // 1.06 at d=1, 1.60 at d=10

    // Optimal solution length from BFS solver, or fall back to parMoves
    const optimal = level?.optimalSolutionLength ?? parMoves;

    // Target moves: explicit override, else optimal with difficulty-scaled tolerance
    const targetMoves = level?.targetMoves ?? optimal;
    const moveTolerance = Math.max(1, Math.ceil(targetMoves * 0.15 * difficultyFactor));

    const threeStarMoves = targetMoves + moveTolerance;
    const twoStarMoves = Math.ceil(threeStarMoves * 1.4 * difficultyFactor);

    // Target time: explicit override, else generous estimate
    const baseTime = level?.targetTime ?? Math.max(10, parMoves * 3);
    const threeStarTime = Math.ceil(baseTime * difficultyFactor);
    const twoStarTime = Math.ceil(threeStarTime * 1.8);

    // Mistakes: later levels allow more mistakes for 3 stars
    const maxMistakesForThree = Math.floor(difficultyFactor); // 1 at d=1, up to 1 at d=10
    const maxMistakesForTwo = maxMistakesForThree + 2;

    return {
      threeStarMoves,
      twoStarMoves,
      threeStarTime,
      twoStarTime,
      maxMistakesForThree,
      maxMistakesForTwo
    };
  }

  /**
   * Get human-readable target info for the UI.
   */
  public static getTargetMoves(parMoves: number, level?: LevelData | null): {
    threeStars: number;
    twoStars: number;
  } {
    const t = this.getThresholds(parMoves, level);
    return {
      threeStars: t.threeStarMoves,
      twoStars: t.twoStarMoves
    };
  }

  /**
   * Derive difficulty from level id if not explicitly set.
   */
  public static deriveDifficulty(levelId: number): number {
    // Smooth ramp: levels 1–50 = difficulty 1, 51–100 = 2, etc.
    return Math.min(10, Math.ceil(levelId / 50));
  }
}