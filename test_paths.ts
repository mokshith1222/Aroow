import { LevelLoader } from './src/game/LevelLoader';
import { Grid } from './src/game/Grid';
import { Movement } from './src/game/Movement';

const levels = LevelLoader.getAllLevels();

let incompatible = 0;

for (const level of levels) {
  const grid = new Grid(level.width, level.height, level.walls);
  const startKey = Grid.posKey(level.start);
  const goalKey = Grid.posKey(level.goal);

  const dist = new Map<string, number>();
  const ways = new Map<string, number>();
  
  dist.set(startKey, 0);
  ways.set(startKey, 1);
  
  const queue = [level.start];
  
  let minMovesToGoal = Infinity;
  let waysToGoal = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = Grid.posKey(current);
    const currentDist = dist.get(currentKey)!;
    const currentWays = ways.get(currentKey)!;

    if (currentDist > minMovesToGoal) {
      break;
    }

    if (currentKey === goalKey) {
      minMovesToGoal = currentDist;
      waysToGoal += currentWays;
      continue;
    }

    const dirs = ['UP', 'RIGHT', 'DOWN', 'LEFT'] as const;
    for (const dir of dirs) {
      const offset = Movement.getOffset(dir);
      const nextPos = {
        x: current.x + offset.dx,
        y: current.y + offset.dy
      };
      
      if (grid.isTraversable(nextPos)) {
        const nextKey = Grid.posKey(nextPos);
        const nextDist = currentDist + 1;
        
        if (!dist.has(nextKey)) {
          dist.set(nextKey, nextDist);
          ways.set(nextKey, currentWays);
          queue.push(nextPos);
        } else if (dist.get(nextKey) === nextDist) {
          ways.set(nextKey, ways.get(nextKey)! + currentWays);
        }
      }
    }
  }

  if (waysToGoal !== 1) {
    console.log(`Level ${level.id} violates rule: ${waysToGoal} shortest paths (length ${minMovesToGoal})`);
    incompatible++;
  }
}

console.log(`\nTotal incompatible levels: ${incompatible} / ${levels.length}`);
