import type { ChallengePolicy, TileType } from './types';

export type DifficultyPresetName =
  | 'TUTORIAL'
  | 'EASY'
  | 'NORMAL'
  | 'MEDIUM'
  | 'HARD'
  | 'VERY_HARD'
  | 'EXPERT'
  | 'MASTER'
  | 'EXTREME'
  | 'BRUTAL';

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
  maxUndoUses: 3,
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
  allowUndo: true,
  maxUndoUses: 3,
  hazardSpeedMultiplier: 1.35,
  timeLimitMultiplier: 1.1,
  hintsReduceMastery: true
};

const BRUTAL_CHALLENGE: ChallengePolicy = {
  maxLives: 3,
  allowUndo: true,
  maxUndoUses: 3,
  hazardSpeedMultiplier: 1.5,
  timeLimitMultiplier: 1.0,
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
    minMoves: 22,
    maxMoves: 55,
    minTurns: 6,
    minDeadEnds: 2,
    minBranching: 2,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE'],
    minDifficultyScore: 35,
    maxDifficultyScore: 75,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP'],
    maxMechanicTiles: 4,
    challenge: CLASSIC_CHALLENGE,
    minDecisionPoints: 2,
    minMisleadingRoutes: 3,
    uniquenessMode: 'A',
  },
  MEDIUM: {
    name: 'MEDIUM',
    worldId: 3,
    // Raised from 10x10 — more spatial complexity forces longer, multi-region paths
    gridWidth: 11,
    gridHeight: 11,
    // Higher wall density creates more complex internal structure
    wallDensityMin: 0.38,
    wallDensityMax: 0.48,
    // Longer minimum paths mean more decision opportunities
    minMoves: 30,
    maxMoves: 70,
    minTurns: 7,
    minDeadEnds: 3,
    minBranching: 3,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE', 'ASYMMETRIC_MAZE'],
    minDifficultyScore: 60,
    maxDifficultyScore: 115,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 6,
    challenge: STRICT_CHALLENGE,
    // Require real decision-making, not just length
    minDecisionPoints: 2,
    minMisleadingRoutes: 5,
    uniquenessMode: 'B',
  },
  HARD: {
    name: 'HARD',
    worldId: 4,
    // Raised from 11x11 — creates more route options and spatial complexity
    gridWidth: 12,
    gridHeight: 12,
    wallDensityMin: 0.40,
    wallDensityMax: 0.50,
    minMoves: 38,
    maxMoves: 85,
    minTurns: 9,
    minDeadEnds: 3,
    minBranching: 3,
    allowedLayouts: ['CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE', 'ASYMMETRIC_MAZE', 'CORRIDORS'],
    minDifficultyScore: 70,
    maxDifficultyScore: 140,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP'],
    maxMechanicTiles: 7,
    challenge: STRICT_CHALLENGE,
    // Hard levels must have real branching and ambiguous routes — not just be long
    minDecisionPoints: 3,
    minMisleadingRoutes: 8,
    uniquenessMode: 'B',
  },
  VERY_HARD: {
    name: 'VERY_HARD',
    worldId: 5,
    // Raised from 12x12
    gridWidth: 13,
    gridHeight: 13,
    wallDensityMin: 0.42,
    wallDensityMax: 0.52,
    minMoves: 45,
    maxMoves: 100,
    minTurns: 10,
    minDeadEnds: 4,
    minBranching: 4,
    allowedLayouts: ['CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE', 'ASYMMETRIC_MAZE'],
    minDifficultyScore: 85,
    maxDifficultyScore: 165,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 9,
    challenge: STRICT_CHALLENGE,
    minDecisionPoints: 4,
    minMisleadingRoutes: 12,
    minDecisionDepth: 2,
    maxShortestPathCount: 5,
    uniquenessMode: 'C',
  },
  EXPERT: {
    name: 'EXPERT',
    worldId: 6,
    // Raised from 13x13
    gridWidth: 14,
    gridHeight: 14,
    wallDensityMin: 0.43,
    wallDensityMax: 0.53,
    minMoves: 52,
    maxMoves: 120,
    minTurns: 11,
    minDeadEnds: 4,
    minBranching: 4,
    allowedLayouts: ['ASYMMETRIC_MAZE', 'SERPENTINE', 'CENTRAL_PILLARS', 'CHAMBERS'],
    minDifficultyScore: 100,
    maxDifficultyScore: 190,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    // More mechanic tiles to force key+gate+portal+one-way combos
    maxMechanicTiles: 12,
    challenge: EXTREME_CHALLENGE,
    minDecisionPoints: 5,
    minMisleadingRoutes: 18,
    minDecisionDepth: 3,
    uniquenessMode: 'D',
  },
  MASTER: {
    name: 'MASTER',
    worldId: 7,
    // Raised from 14x14 — significantly larger board for master difficulty
    gridWidth: 15,
    gridHeight: 15,
    wallDensityMin: 0.42,
    wallDensityMax: 0.52,
    minMoves: 62,
    maxMoves: 145,
    minTurns: 13,
    minDeadEnds: 5,
    minBranching: 5,
    allowedLayouts: ['ASYMMETRIC_MAZE', 'SERPENTINE', 'CENTRAL_PILLARS'],
    minDifficultyScore: 120,
    maxDifficultyScore: 220,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 14,
    challenge: EXTREME_CHALLENGE,
    minDecisionPoints: 6,
    minMisleadingRoutes: 25,
    minDecisionDepth: 4,
    uniquenessMode: 'D',
  },
  // EXTREME: 501-600. Large 16x16 board with high mechanic density.
  // Player must reason about portal chains, key+gate sequences, and one-way traps.
  EXTREME: {
    name: 'EXTREME',
    worldId: 8,
    gridWidth: 16,
    gridHeight: 16,
    wallDensityMin: 0.40,
    wallDensityMax: 0.52,
    minMoves: 72,
    maxMoves: 165,
    minTurns: 14,
    minDeadEnds: 6,
    minBranching: 5,
    allowedLayouts: ['ASYMMETRIC_MAZE', 'SERPENTINE', 'CENTRAL_PILLARS'],
    minDifficultyScore: 140,
    maxDifficultyScore: 240,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 16,
    challenge: BRUTAL_CHALLENGE,
    minDecisionPoints: 7,
    minMisleadingRoutes: 35,
    minDecisionDepth: 5,
    uniquenessMode: 'D',
  },
  // BRUTAL: 601+. The hardest tier. Near-expert level puzzle complexity.
  // Every route should feel like it could be correct, but only one is optimal.
  BRUTAL: {
    name: 'BRUTAL',
    worldId: 9,
    gridWidth: 17,
    gridHeight: 17,
    wallDensityMin: 0.40,
    wallDensityMax: 0.52,
    minMoves: 82,
    maxMoves: 190,
    minTurns: 16,
    minDeadEnds: 7,
    minBranching: 6,
    allowedLayouts: ['ASYMMETRIC_MAZE', 'SERPENTINE'],
    minDifficultyScore: 160,
    maxDifficultyScore: 260,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 18,
    challenge: BRUTAL_CHALLENGE,
    minDecisionPoints: 8,
    minMisleadingRoutes: 50,
    minDecisionDepth: 6,
    uniquenessMode: 'D',
  }
};

export function getPresetForLevelId(levelId: number): LevelPresetConfig {
  if (levelId <= 10) return DIFFICULTY_PRESETS.TUTORIAL;       // Levels 1-10: Learning
  if (levelId <= 20) return DIFFICULTY_PRESETS.EASY;           // Levels 11-20: Beginner
  if (levelId <= 50) return DIFFICULTY_PRESETS.NORMAL;         // Levels 21-50: Foundation
  if (levelId <= 100) return DIFFICULTY_PRESETS.MEDIUM;        // Levels 51-100: Strategic
  if (levelId <= 200) return DIFFICULTY_PRESETS.HARD;          // Levels 101-200: Hard
  if (levelId <= 300) return DIFFICULTY_PRESETS.VERY_HARD;     // Levels 201-300: Very Hard
  if (levelId <= 400) return DIFFICULTY_PRESETS.EXPERT;        // Levels 301-400: Expert
  if (levelId <= 500) return DIFFICULTY_PRESETS.MASTER;        // Levels 401-500: Master
  if (levelId <= 600) return DIFFICULTY_PRESETS.EXTREME;       // Levels 501-600: Extreme
  return DIFFICULTY_PRESETS.BRUTAL;                            // Levels 601+: Brutal
}
