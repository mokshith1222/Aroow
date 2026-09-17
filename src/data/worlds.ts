export interface World {
  id: number;
  name: string;
  description: string;
  icon: string;
  startLevel: number;
  endLevel: number;
}

export const initialWorlds: World[] = [
  {
    id: 1,
    name: 'Introduction',
    description: 'Learn the core mechanics of movement',
    icon: '✦',
    startLevel: 1,
    endLevel: 25
  },
  {
    id: 2,
    name: 'Beginner',
    description: 'Basic mazes and corridors',
    icon: '❖',
    startLevel: 26,
    endLevel: 75
  },
  {
    id: 3,
    name: 'Path Master',
    description: 'Navigate forks and find optimal routes',
    icon: '◈',
    startLevel: 76,
    endLevel: 150
  },
  {
    id: 4,
    name: 'Tricky Routes',
    description: 'Deceptive paths and dead ends',
    icon: '⬡',
    startLevel: 151,
    endLevel: 225
  },
  {
    id: 5,
    name: 'Advanced',
    description: 'Dense obstacles and complex layouts',
    icon: '▲',
    startLevel: 226,
    endLevel: 300
  },
  {
    id: 6,
    name: 'Expert',
    description: 'High difficulty puzzles with long routes',
    icon: '◆',
    startLevel: 301,
    endLevel: 375
  },
  {
    id: 7,
    name: 'Master',
    description: 'Intense planning required to succeed',
    icon: '★',
    startLevel: 376,
    endLevel: 450
  },
  {
    id: 8,
    name: 'Grandmaster',
    description: 'Peak puzzle complexity and zero margin for error',
    icon: '♛',
    startLevel: 451,
    endLevel: 500
  }
];

export class WorldManager {
  private static worlds: World[] = [...initialWorlds];

  /**
   * Returns all active worlds, generating beyond 500 dynamically if requested.
   */
  public static getAllWorlds(maxLevel: number = 500): World[] {
    const list = [...this.worlds];
    let currentEnd = list[list.length - 1].endLevel;

    // Dynamically extend worlds beyond level 500 in 100-level chunks
    let nextId = list.length + 1;
    while (currentEnd < maxLevel) {
      const start = currentEnd + 1;
      const end = start + 99;
      list.push({
        id: nextId,
        name: `Dimension ${nextId}`,
        description: `Infinite vector puzzles (Levels ${start}–${end})`,
        icon: '∞',
        startLevel: start,
        endLevel: end
      });
      currentEnd = end;
      nextId++;
    }

    return list;
  }

  /**
   * Get world definition by ID
   */
  public static getWorld(worldId: number): World | null {
    if (worldId >= 1 && worldId <= this.worlds.length) {
      return this.worlds[worldId - 1];
    }
    // For future dynamic worlds beyond 7
    if (worldId > this.worlds.length) {
      const prevEnd = this.worlds[this.worlds.length - 1].endLevel;
      const offset = worldId - this.worlds.length - 1;
      const start = prevEnd + 1 + offset * 100;
      return {
        id: worldId,
        name: `Dimension ${worldId}`,
        description: `Infinite vector puzzles (Levels ${start}–${start + 99})`,
        icon: '∞',
        startLevel: start,
        endLevel: start + 99
      };
    }
    return null;
  }

  /**
   * Get which world a specific level belongs to
   */
  public static getWorldForLevel(levelId: number): World {
    for (const world of this.worlds) {
      if (levelId >= world.startLevel && levelId <= world.endLevel) {
        return world;
      }
    }
    // Dynamic world beyond 500
    if (levelId > 500) {
      const offset = Math.floor((levelId - 501) / 100);
      const worldId = 9 + offset;
      const start = 501 + offset * 100;
      return {
        id: worldId,
        name: `Dimension ${worldId}`,
        description: `Infinite vector puzzles (Levels ${start}–${start + 99})`,
        icon: '∞',
        startLevel: start,
        endLevel: start + 99
      };
    }
    return this.worlds[0];
  }

  /**
   * Checks if a world is unlocked given player's highest unlocked level.
   * World 1 is unlocked initially (startLevel: 1).
   * Subsequent worlds unlock when the player has unlocked or completed the final level of the preceding world.
   */
  public static isWorldUnlocked(worldId: number, unlockedLevel: number): boolean {
    const world = this.getWorld(worldId);
    if (!world) return false;
    return unlockedLevel >= world.startLevel;
  }

  /**
   * Compute completion stats for a world
   */
  public static getWorldStats(
    worldId: number,
    unlockedLevel: number,
    levelRecords: Record<number, { stars: number }>
  ): {
    totalLevels: number;
    completedLevels: number;
    totalStars: number;
    maxPossibleStars: number;
    isCompleted: boolean;
    isUnlocked: boolean;
  } {
    const world = this.getWorld(worldId);
    if (!world) {
      return {
        totalLevels: 0,
        completedLevels: 0,
        totalStars: 0,
        maxPossibleStars: 0,
        isCompleted: false,
        isUnlocked: false
      };
    }

    const total = world.endLevel - world.startLevel + 1;
    let completed = 0;
    let stars = 0;

    for (let id = world.startLevel; id <= world.endLevel; id++) {
      const rec = levelRecords[id];
      if (rec && rec.stars > 0) {
        completed++;
        stars += rec.stars;
      }
    }

    return {
      totalLevels: total,
      completedLevels: completed,
      totalStars: stars,
      maxPossibleStars: total * 3,
      isCompleted: completed === total,
      isUnlocked: unlockedLevel >= world.startLevel
    };
  }
}

// Backward compatibility export
export const worlds = initialWorlds;