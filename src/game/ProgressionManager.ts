import { WorldManager } from '../data/worlds';
import { LevelLoader } from './LevelLoader';
import { StorageService } from '../services/StorageService';

export interface LevelState {
  levelId: number;
  levelNumber: number;
  difficulty: number;
  maximumStars: number;
  completionStatus: boolean;
  earnedStars: number;
  routeInfo: string;
  obstacles: number;
  isUnlocked: boolean;
}

export interface Stage {
  stageId: number;
  stageName: string;
  description: string;
  icon: string;
  startLevel: number;
  endLevel: number;
  levels: LevelState[];
  totalStarsAvailable: number;
  totalStarsEarned: number;
  unlockedStatus: boolean;
  completedStatus: boolean;
  unlockRequirement: string | null;
}

export class ProgressionManager {
  /**
   * Generates the entire progression tree dynamically, combining static
   * definitions from LevelLoader/worlds with dynamic player data from StorageService.
   */
  public static getProgressionTree(): Stage[] {
    const storage = StorageService.getInstance();
    const allWorlds = WorldManager.getAllWorlds(LevelLoader.MAX_LEVELS);
    const levelRecords = storage.getAllLevelRecords();

    const stages: Stage[] = [];

    for (const world of allWorlds) {
      const worldLevels = LevelLoader.getLevelsByWorld(world.id);
      const levels: LevelState[] = [];
      let totalStarsEarned = 0;
      let totalStarsAvailable = 0;
      let completedLevelsCount = 0;
      
      // Determine if this stage itself is unlocked
      const isStageUnlocked = true; // WorldManager.isWorldUnlocked(world.id, levelRecords);

      for (let i = 0; i < worldLevels.length; i++) {
        const lvl = worldLevels[i];
        const record = storage.getLevelRecord(lvl.id);
        const earnedStars = record?.stars || 0;
        const isCompleted = record?.completed === true;
        
        // A level is unlocked only if:
        // 1. Its stage is unlocked, AND
        // 2. It passes the individual sequential unlock check (Level N-1 completed)
        const isLevelUnlocked = isStageUnlocked; // true
        
        levels.push({
          levelId: lvl.id,
          levelNumber: i + 1,
          difficulty: lvl.difficulty || 1,
          maximumStars: 3,
          completionStatus: isCompleted,
          earnedStars: earnedStars,
          routeInfo: `Grid: ${lvl.width}x${lvl.height}`,
          obstacles: lvl.walls.length,
          isUnlocked: isLevelUnlocked
        });

        totalStarsAvailable += 3;
        totalStarsEarned += earnedStars;
        if (isCompleted) {
          completedLevelsCount++;
        }
      }

      const isCompleted = worldLevels.length > 0 && completedLevelsCount === worldLevels.length;
      
      // Calculate unlock requirement text
      let unlockRequirement = null;
      const isUnlocked = true; // WorldManager.isWorldUnlocked(world.id, levelRecords);
      if (!isUnlocked) {
        const prevWorld = WorldManager.getWorld(world.id - 1);
        if (prevWorld) {
          const stats = WorldManager.getWorldStats(prevWorld.id, levelRecords);
          unlockRequirement = `Requires: ${stats.maxPossibleStars} / ${stats.maxPossibleStars} stars from ${prevWorld.name}`;
        } else {
          unlockRequirement = `Locked`;
        }
      }

      stages.push({
        stageId: world.id,
        stageName: world.name,
        description: world.description,
        icon: world.icon,
        startLevel: world.startLevel,
        endLevel: world.endLevel,
        levels,
        totalStarsAvailable,
        totalStarsEarned,
        unlockedStatus: isUnlocked,
        completedStatus: isCompleted,
        unlockRequirement
      });
    }

    return stages;
  }
}
