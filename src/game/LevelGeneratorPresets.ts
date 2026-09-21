import type { ChallengePolicy, TileType } from './types';

export type DifficultyPresetName =
  | 'TUTORIAL'
  | 'EASY'
  | 'NORMAL'
  | 'MEDIUM'
  | 'HARD'
  | 'VERY_HARD'
  | 'EXPERT'
  | 'MASTER';

export type LayoutStyle =
  | 'CORRIDORS'
  | 'CHAMBERS'
  | 'CENTRAL_PILLARS'
  | 'ASYMMETRIC_MAZE'
  | 'SERPENTINE';

export interface LevelPresetConfig {
  name: DifficultyPresetName;
  worldId: number;
  gridWidth: number;
  gridHeight: number;
  wallDensityMin: number;
  wallDensityMax: number;
  minMoves: number;
  maxMoves: number;
  minTurns: number;
  minDeadEnds: number;
  minBranching: number;
  allowedLayouts: LayoutStyle[];
  minDifficultyScore: number;
  maxDifficultyScore: number;
  allowedMechanics: TileType[];
  maxMechanicTiles: number;
  challenge: ChallengePolicy;
  minDecisionPoints?: number;
  minMisleadingRoutes?: number;
  minDecisionDepth?: number;
  maxShortestPathCount?: number;
  uniquenessMode?: 'A' | 'B' | 'C' | 'D';
}

const CLASSIC_CHALLENGE: ChallengePolicy = {
  maxLives: 3,
  allowUndo: true,
  maxUndoUses: undefined,
  hazardSpeedMultiplier: 1,
  timeLimitMultiplier: undefined,
  hintsReduceMastery: true
};

const STRICT_CHALLENGE: ChallengePolicy = {
  maxLives: 3,
  allowUndo: true,
  maxUndoUses: 3,
  hazardSpeedMultiplier: 1.15,
  timeLimitMultiplier: 1.5,
  hintsReduceMastery: true
};

const EXTREME_CHALLENGE: ChallengePolicy = {
  maxLives: 3,
  allowUndo: false,
  maxUndoUses: 0,
  hazardSpeedMultiplier: 1.35,
  timeLimitMultiplier: 1.1,
  hintsReduceMastery: true
};

export const DIFFICULTY_PRESETS: Record<DifficultyPresetName, LevelPresetConfig> = {
  TUTORIAL: {
    name: 'TUTORIAL',
    worldId: 1,
    gridWidth: 6,
    gridHeight: 6,
    wallDensityMin: 0.28,
    wallDensityMax: 0.40,
    minMoves: 8,
    maxMoves: 25,
    minTurns: 3,
    minDeadEnds: 1,
    minBranching: 1,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS', 'CENTRAL_PILLARS'],
    minDifficultyScore: 8,
    maxDifficultyScore: 30,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'SPIKE_TRAP'],
    maxMechanicTiles: 2,
    challenge: CLASSIC_CHALLENGE,
    minDecisionPoints: 1,
    uniquenessMode: 'A',
  },
  EASY: {
    name: 'EASY',
    worldId: 1,
    gridWidth: 8,
    gridHeight: 8,
    wallDensityMin: 0.32,
    wallDensityMax: 0.45,
    minMoves: 15,
    maxMoves: 35,
    minTurns: 4,
    minDeadEnds: 1,
    minBranching: 1,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE'],
    minDifficultyScore: 18,
    maxDifficultyScore: 45,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'SPIKE_TRAP', 'ICE'],
    maxMechanicTiles: 3,
    challenge: CLASSIC_CHALLENGE,
    minDecisionPoints: 1,
    uniquenessMode: 'A',
  },
  NORMAL: {
    name: 'NORMAL',
    worldId: 2,
    gridWidth: 9,
    gridHeight: 9,
    wallDensityMin: 0.35,
    wallDensityMax: 0.45,
    minMoves: 20,
    maxMoves: 50,
    minTurns: 5,
    minDeadEnds: 2,
    minBranching: 2,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE'],
    minDifficultyScore: 35,
    maxDifficultyScore: 70,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP'],
    maxMechanicTiles: 4,
    challenge: CLASSIC_CHALLENGE,
    minDecisionPoints: 2,
    uniquenessMode: 'A',
  },
  MEDIUM: {
    name: 'MEDIUM',
    worldId: 3,
    gridWidth: 10,
    gridHeight: 10,
    wallDensityMin: 0.35,
    wallDensityMax: 0.45,
    minMoves: 25,
    maxMoves: 60,
    minTurns: 6,
    minDeadEnds: 2,
    minBranching: 3,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE', 'ASYMMETRIC_MAZE'],
    minDifficultyScore: 50,
    maxDifficultyScore: 100,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 5,
    challenge: STRICT_CHALLENGE,
    minDecisionPoints: 0,
    minMisleadingRoutes: 0,
    uniquenessMode: 'B',
  },
  HARD: {
    name: 'HARD',
    worldId: 4,
    gridWidth: 11,
    gridHeight: 11,
    wallDensityMin: 0.38,
    wallDensityMax: 0.48,
    minMoves: 30,
    maxMoves: 75,
    minTurns: 7,
    minDeadEnds: 2,
    minBranching: 2,
    allowedLayouts: ['CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE', 'ASYMMETRIC_MAZE', 'CORRIDORS'],
    minDifficultyScore: 40,
    maxDifficultyScore: 115,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP'],
    maxMechanicTiles: 6,
    challenge: STRICT_CHALLENGE,
    minDecisionPoints: 0,
    minMisleadingRoutes: 0,
    uniquenessMode: 'B',
  },
  VERY_HARD: {
    name: 'VERY_HARD',
    worldId: 5,
    gridWidth: 12,
    gridHeight: 12,
    wallDensityMin: 0.40,
    wallDensityMax: 0.50,
    minMoves: 35,
    maxMoves: 90,
    minTurns: 8,
    minDeadEnds: 3,
    minBranching: 3,
    allowedLayouts: ['CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE', 'ASYMMETRIC_MAZE'],
    minDifficultyScore: 60,
    maxDifficultyScore: 145,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 8,
    challenge: STRICT_CHALLENGE,
    minDecisionPoints: 1,
    minMisleadingRoutes: 5,
    minDecisionDepth: 0,
    maxShortestPathCount: 8,
    uniquenessMode: 'C',
  },
  EXPERT: {
    name: 'EXPERT',
    worldId: 6,
    gridWidth: 13,
    gridHeight: 13,
    wallDensityMin: 0.42,
    wallDensityMax: 0.52,
    minMoves: 40,
    maxMoves: 110,
    minTurns: 9,
    minDeadEnds: 3,
    minBranching: 3,
    allowedLayouts: ['ASYMMETRIC_MAZE', 'SERPENTINE', 'CENTRAL_PILLARS', 'CHAMBERS'],
    minDifficultyScore: 80,
    maxDifficultyScore: 175,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 10,
    challenge: EXTREME_CHALLENGE,
    minDecisionPoints: 0,
    minMisleadingRoutes: 0,
    uniquenessMode: 'D',
  },
  MASTER: {
    name: 'MASTER',
    worldId: 7,
    gridWidth: 14,
    gridHeight: 14,
    wallDensityMin: 0.42,
    wallDensityMax: 0.52,
    minMoves: 45,
    maxMoves: 130,
    minTurns: 10,
    minDeadEnds: 4,
    minBranching: 4,
    allowedLayouts: ['ASYMMETRIC_MAZE', 'SERPENTINE', 'CENTRAL_PILLARS'],
    minDifficultyScore: 100,
    maxDifficultyScore: 210,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 12,
    challenge: EXTREME_CHALLENGE,
    minDecisionPoints: 0,
    minMisleadingRoutes: 0,
    uniquenessMode: 'D',
  }
};

export function getPresetForLevelId(levelId: number): LevelPresetConfig {
  if (levelId <= 10) return DIFFICULTY_PRESETS.TUTORIAL;       // Beginner
  if (levelId <= 20) return DIFFICULTY_PRESETS.EASY;           // Beginner
  if (levelId <= 50) return DIFFICULTY_PRESETS.NORMAL;         // Foundation
  if (levelId <= 100) return DIFFICULTY_PRESETS.MEDIUM;        // Strategic
  if (levelId <= 200) return DIFFICULTY_PRESETS.HARD;          // Hard
  if (levelId <= 300) return DIFFICULTY_PRESETS.VERY_HARD;     // Very Hard
  if (levelId <= 400) return DIFFICULTY_PRESETS.EXPERT;        // Expert
  return DIFFICULTY_PRESETS.MASTER;                            // Master (401+)
}
