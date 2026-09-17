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
    const unlockedLevel = storage.getUnlockedLevel();

    const stages: Stage[] = [];

    for (const world of allWorlds) {
      const worldLevels = LevelLoader.getLevelsByWorld(world.id);
      const levels: LevelState[] = [];
      let totalStarsEarned = 0;
      let totalStarsAvailable = 0;
      let completedLevelsCount = 0;

      for (let i = 0; i < worldLevels.length; i++) {
        const lvl = worldLevels[i];
        const record = storage.getLevelRecord(lvl.id);
        const earnedStars = record?.stars || 0;
        
        levels.push({
          levelId: lvl.id,
          levelNumber: i + 1,
          difficulty: lvl.difficulty || 1,
          maximumStars: 3,
          completionStatus: earnedStars > 0,
          earnedStars: earnedStars,
          routeInfo: `Grid: ${lvl.width}x${lvl.height}`,
          obstacles: lvl.walls.length
        });

        totalStarsAvailable += 3;
        totalStarsEarned += earnedStars;
        if (earnedStars > 0) {
          completedLevelsCount++;
        }
      }

      const isCompleted = worldLevels.length > 0 && completedLevelsCount === worldLevels.length;
      
      // Calculate unlock requirement text
      let unlockRequirement = null;
      const isUnlocked = WorldManager.isWorldUnlocked(world.id, unlockedLevel);
      if (!isUnlocked) {
        unlockRequirement = `Reach Level ${world.startLevel} to unlock`;
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
