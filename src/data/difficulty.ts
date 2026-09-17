export interface DifficultyConfig {
  starRatingThresholds: {
    threeStarRatio: number;
    twoStarRatio: number;
  };
  baseMoveTolerance: number;
}

export const difficulty: DifficultyConfig = {
  starRatingThresholds: {
    threeStarRatio: 1.0,
    twoStarRatio: 1.4
  },
  baseMoveTolerance: 2
};