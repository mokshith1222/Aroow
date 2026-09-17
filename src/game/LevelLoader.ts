import type { LevelData } from './types';
import levelsDb from '../data/levels_db.json';
import { LevelSolver } from './LevelSolver';
import { DifficultyManager } from './DifficultyManager';
import { WorldManager } from '../data/worlds';
import { routeOverrides } from './routeOverrides';

export class LevelLoader {
  private static levelMap: Map<number, LevelData> = new Map();
  private static enriched: Set<number> = new Set();
  public static readonly MAX_LEVELS = 500;

  // Initialize from static DB on first access
  private static ensureInit(): void {
    if (this.levelMap.size === 0) {
      const db = levelsDb as LevelData[];
      
      for (const lvl of db) {
        if (routeOverrides[lvl.id]) {
          this.levelMap.set(lvl.id, routeOverrides[lvl.id]);
        } else {
          this.levelMap.set(lvl.id, lvl);
        }
      }
    }
  }

  /**
   * Enrich a level with computed star-system fields if not already set.
   * This runs the BFS solver once per level to populate optimalSolutionLength,
   * difficulty, targetMoves, and targetTime.
   */
  private static enrichLevel(level: LevelData): LevelData {
    if (this.enriched.has(level.id)) return level;

    // Compute optimal via BFS solver if missing
    if (level.optimalSolutionLength == null) {
      const solution = LevelSolver.solve(level);
      if (solution.solvable) {
        level.optimalSolutionLength = solution.optimalMoves;
      }
    }

    // Derive difficulty from level id if not explicitly set
    if (level.difficulty == null) {
      level.difficulty = DifficultyManager.deriveDifficulty(level.id);
    }

    // Set targetMoves to optimal if not explicitly provided
    if (level.targetMoves == null) {
      level.targetMoves = level.optimalSolutionLength ?? level.parMoves;
    }

    // Set targetTime: generous estimate based on optimal moves and difficulty
    if (level.targetTime == null && level.targetMoves != null) {
      const base = level.targetMoves * 3;
      const diffFactor = 1 + (level.difficulty ?? 1) * 0.06;
      level.targetTime = Math.ceil(base * diffFactor);
    }

    // Ensure parMoves is set
    if (level.parMoves == null && level.optimalSolutionLength != null) {
      level.parMoves = level.optimalSolutionLength;
    }

    this.enriched.add(level.id);
    return level;
  }

  public static getLevel(id: number): LevelData | null {
    this.ensureInit();
    if (this.levelMap.has(id)) {
      return this.enrichLevel(this.levelMap.get(id)!);
    }
    return null;
  }

  /**
   * Stub preload method - generation is no longer runtime, but keeping this
   * to satisfy existing callers cleanly.
   */
  public static preloadLevelAsync(_id: number): void {
    // No-op because levels are statically loaded from JSON
  }

  public static getAllLevels(): LevelData[] {
    this.ensureInit();
    const all: LevelData[] = [];
    for (let i = 1; i <= this.MAX_LEVELS; i++) {
      const lvl = this.getLevel(i);
      if (lvl) all.push(lvl);
    }
    return all;
  }

  public static getLevelsByWorld(worldId: number): LevelData[] {
    const world = WorldManager.getWorld(worldId);
    if (!world) return [];
    const worldLevels: LevelData[] = [];

    for (let i = world.startLevel; i <= world.endLevel; i++) {
      const lvl = this.getLevel(i);
      if (lvl) worldLevels.push(lvl);
    }
    return worldLevels;
  }

  public static getTotalLevels(): number {
    return this.MAX_LEVELS;
  }

  public static getNextLevel(currentId: number): LevelData | null {
    return this.getLevel(currentId + 1);
  }

  public static getPrevLevel(currentId: number): LevelData | null {
    return this.getLevel(currentId - 1);
  }

  public static isLastLevel(currentId: number): boolean {
    return currentId >= this.MAX_LEVELS;
  }
}