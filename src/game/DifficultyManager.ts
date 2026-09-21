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
    _moves: number,
    _parMoves: number,
    mistakes: number = 0,
    _elapsedSeconds: number = 0,
    _level?: LevelData | null
  ): number {
    let stars = 0;
    // 0 collisions = 3 stars
    if (mistakes === 0) stars = 3;
    // 1 collision = 2 stars
    else if (mistakes === 1) stars = 2;
    // 2 collisions = 1 star
    else if (mistakes === 2) stars = 1;
    // 3 or more collisions (if somehow survived) = 0 stars
    else stars = 0;
    
    // Phase 3 Route constraint
    if (_level?.longRouteMinMoves && _moves >= _level.longRouteMinMoves) {
      stars = Math.min(stars, 2);
    }
    
    return stars;
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

    // Target moves: explicit override, else optimal
    const targetMoves = level?.targetMoves ?? optimal;
    const moveTolerance = Math.max(2, Math.ceil(targetMoves * 0.15 * difficultyFactor));

    const threeStarMoves = targetMoves;
    const twoStarMoves = targetMoves + moveTolerance;

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