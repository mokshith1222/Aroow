import type { TileType } from './types';

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
  uniquenessMode?: 'A' | 'B' | 'C' | 'D';
}

export const DIFFICULTY_PRESETS: Record<DifficultyPresetName, LevelPresetConfig> = {
  TUTORIAL: {
    name: 'TUTORIAL',
    worldId: 1,
    gridWidth: 5,
    gridHeight: 5,
    wallDensityMin: 0.15,
    wallDensityMax: 0.25,
    minMoves: 4,
    maxMoves: 12,
    minTurns: 1,
    minDeadEnds: 0,
    minBranching: 0,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS'],
    minDifficultyScore: 1,
    maxDifficultyScore: 20,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT'],
    maxMechanicTiles: 1,
    uniquenessMode: 'A',
  },
  EASY: {
    name: 'EASY',
    worldId: 1,
    gridWidth: 6,
    gridHeight: 6,
    wallDensityMin: 0.20,
    wallDensityMax: 0.30,
    minMoves: 6,
    maxMoves: 20,
    minTurns: 2,
    minDeadEnds: 0,
    minBranching: 0,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS', 'CENTRAL_PILLARS'],
    minDifficultyScore: 10,
    maxDifficultyScore: 35,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL'],
    maxMechanicTiles: 2,
    uniquenessMode: 'A',
  },
  NORMAL: {
    name: 'NORMAL',
    worldId: 2,
    gridWidth: 7,
    gridHeight: 7,
    wallDensityMin: 0.25,
    wallDensityMax: 0.35,
    minMoves: 8,
    maxMoves: 30,
    minTurns: 3,
    minDeadEnds: 1,
    minBranching: 1,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE'],
    minDifficultyScore: 20,
    maxDifficultyScore: 55,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE'],
    maxMechanicTiles: 3,
    uniquenessMode: 'A',
  },
  MEDIUM: {
    name: 'MEDIUM',
    worldId: 3,
    gridWidth: 8,
    gridHeight: 8,
    wallDensityMin: 0.30,
    wallDensityMax: 0.40,
    minMoves: 10,
    maxMoves: 40,
    minTurns: 3,
    minDeadEnds: 1,
    minBranching: 2,
    allowedLayouts: ['CORRIDORS', 'CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE', 'ASYMMETRIC_MAZE'],
    minDifficultyScore: 30,
    maxDifficultyScore: 85,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE'],
    maxMechanicTiles: 4,
    uniquenessMode: 'B',
  },
  HARD: {
    name: 'HARD',
    worldId: 4,
    gridWidth: 9,
    gridHeight: 9,
    wallDensityMin: 0.32,
    wallDensityMax: 0.42,
    minMoves: 12,
    maxMoves: 50,
    minTurns: 4,
    minDeadEnds: 2,
    minBranching: 2,
    allowedLayouts: ['CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE', 'ASYMMETRIC_MAZE', 'CORRIDORS'],
    minDifficultyScore: 40,
    maxDifficultyScore: 115,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP'],
    maxMechanicTiles: 6,
    uniquenessMode: 'B',
  },
  VERY_HARD: {
    name: 'VERY_HARD',
    worldId: 5,
    gridWidth: 10,
    gridHeight: 10,
    wallDensityMin: 0.34,
    wallDensityMax: 0.44,
    minMoves: 14,
    maxMoves: 60,
    minTurns: 5,
    minDeadEnds: 3,
    minBranching: 3,
    allowedLayouts: ['CHAMBERS', 'CENTRAL_PILLARS', 'SERPENTINE', 'ASYMMETRIC_MAZE'],
    minDifficultyScore: 60,
    maxDifficultyScore: 145,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 8,
    uniquenessMode: 'C',
  },
  EXPERT: {
    name: 'EXPERT',
    worldId: 6,
    gridWidth: 11,
    gridHeight: 11,
    wallDensityMin: 0.35,
    wallDensityMax: 0.45,
    minMoves: 16,
    maxMoves: 70,
    minTurns: 6,
    minDeadEnds: 3,
    minBranching: 3,
    allowedLayouts: ['ASYMMETRIC_MAZE', 'SERPENTINE', 'CENTRAL_PILLARS', 'CHAMBERS'],
    minDifficultyScore: 80,
    maxDifficultyScore: 175,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 10,
    uniquenessMode: 'D',
  },
  MASTER: {
    name: 'MASTER',
    worldId: 7,
    gridWidth: 12,
    gridHeight: 12,
    wallDensityMin: 0.38,
    wallDensityMax: 0.48,
    minMoves: 20,
    maxMoves: 85,
    minTurns: 7,
    minDeadEnds: 4,
    minBranching: 4,
    allowedLayouts: ['ASYMMETRIC_MAZE', 'SERPENTINE', 'CHAMBERS', 'CENTRAL_PILLARS'],
    minDifficultyScore: 100,
    maxDifficultyScore: 210,
    allowedMechanics: ['ONE_WAY_UP', 'ONE_WAY_DOWN', 'ONE_WAY_LEFT', 'ONE_WAY_RIGHT', 'PORTAL', 'ICE', 'SPIKE_TRAP', 'MOVING_SAW'],
    maxMechanicTiles: 12,
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
