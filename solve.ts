import { LevelLoader } from './src/game/LevelLoader.ts';
import { Movement } from './src/game/Movement.ts';
import { MechanicResolver } from './src/game/MechanicResolver.ts';
import { Grid } from './src/game/Grid.ts';
import type { Position, Direction } from './src/game/types.ts';

import * as fs from 'fs';
const level = LevelLoader.getLevel(273);
if (!level) {
  console.log("Level not found.");
  process.exit(1);
}

fs.writeFileSync('level_dump.json', JSON.stringify(level, null, 2));
process.exit(0);

const grid = new Grid(
  level.width,
  level.height,
  level.walls,
  level.gates ?? [],
  level.keys ?? []
);

const resolver = new MechanicResolver(level.tiles ?? []);

interface State {
  pos: Position;
  visited: string[]; // array of pos keys
  keysHeld: number; // bitmask of keys collected
  path: Direction[];
}

const queue: State[] = [{
  pos: level.start,
  visited: [Grid.posKey(level.start)],
  keysHeld: 0,
  path: []
}];

const goalKey = Grid.posKey(level.goal);
let minMoves = Infinity;
let bestPath: Direction[] | null = null;
const CARDINAL_DIRECTIONS: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

// Simple seen state to avoid infinite loops, but we must be careful since visited set matters.
// stateKey = x,y | keysHeld | sorted visited (or just let it run if state space is small)
// Actually, tracking visited exactly is hard for caching. We'll use:
// `x,y|keysHeld|${visited.sort().join(',')}`
const seen = new Set<string>();

while (queue.length > 0) {
  const current = queue.shift()!;

  if (current.path.length > 30) continue; // cap depth to prevent memory exhaustion

  const curKey = `${current.pos.x},${current.pos.y}|${current.keysHeld}|${[...current.visited].sort().join(',')}`;
  if (seen.has(curKey)) continue;
  seen.add(curKey);

  if (Grid.posKey(current.pos) === goalKey) {
    if (current.path.length < minMoves) {
      minMoves = current.path.length;
      bestPath = current.path;
      console.log("Found solution length", minMoves, bestPath.join(', '));
      // break; // continue to find shortest? Or BFS already finds shortest!
      break;
    }
  }

  const tempGrid = new Grid(
    level.width,
    level.height,
    level.walls,
    level.gates ?? [],
    level.keys ?? []
  );
  // unlock gates
  if (level.keys) {
    for (let i = 0; i < level.keys.length; i++) {
      if ((current.keysHeld & (1 << i)) !== 0) {
        tempGrid.collectKey(level.keys[i]);
      }
    }
  }

  for (const dir of CARDINAL_DIRECTIONS) {
    const visitedSet = new Set(current.visited);
    const result = Movement.attemptMove(
      current.pos,
      dir,
      tempGrid,
      level.goal,
      visitedSet,
      level.tiles,
      level.gates ?? []
    );

    if (result.success && !result.hitVisitedCell) {
      // Create new state
      const nextVisited = [...current.visited];
      nextVisited.push(Grid.posKey(result.newPosition));
      if (result.slidePositions) {
        for (const p of result.slidePositions) {
          nextVisited.push(Grid.posKey(p));
        }
      }

      let nextKeys = current.keysHeld;
      if (level.keys) {
        for (let i = 0; i < level.keys.length; i++) {
          if (Grid.posKey(level.keys[i]) === Grid.posKey(result.newPosition)) {
            nextKeys |= (1 << i);
          }
        }
      }

      queue.push({
        pos: result.newPosition,
        visited: nextVisited,
        keysHeld: nextKeys,
        path: [...current.path, dir]
      });
    }
  }
}

if (bestPath) {
  console.log("FINAL SOLUTION:", bestPath.join(', '));
  console.log("Goal is", level.goal);
  let pos = level.start;
  let curKeys = 0;
  console.log("Start at", pos);
  const simGrid = new Grid(level.width, level.height, level.walls, level.gates ?? [], level.keys ?? []);
  console.log("TEST PORTAL BEFORE LOOP:", resolver.getPortalTarget({x: 2, y: 4}));
  for (const dir of bestPath) {
    const res = Movement.attemptMove(pos, dir, simGrid, level.goal, new Set(), level.tiles, level.gates ?? []);
    console.log("res:", res);
    pos = res.newPosition;
    if (level.keys) {
      for (let i=0; i<level.keys.length; i++) {
         if (Grid.posKey(level.keys[i]) === Grid.posKey(pos)) {
           curKeys |= (1<<i);
           simGrid.collectKey(level.keys[i]);
         }
      }
    }
    console.log("Move", dir, "->", pos, "Keys:", curKeys);
  }
} else {
  console.log("NO SOLUTION FOUND THAT RESPECTS NO-REVISIT RULE!");
}
