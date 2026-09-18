import type { Position, Direction, LevelData, TileMeta, GateDef } from './types';
import { Grid } from './Grid';
import { Movement } from './Movement';
import { MechanicResolver } from './MechanicResolver';

export interface SolverResult {
  solvable: boolean;
  optimalMoves: number;
  shortestPath: Position[];
  shortestPathCount: number;
  secondBestMoves: number | null;
  thirdBestMoves: number | null;
  solutionComplexity: number;
  branchingFactor: number;
  deadEndCount: number;
  pathEfficiency: number;
  directions: Direction[]; 
  turnsCount: number;
  visitedNodesCount: number;
  misleadingRoutes: number;
  decisionPoints: number;
  decisionDepth: number;
  meaningfulBranches: number;
  distanceBetweenDecisions: number;
}

// Bitset for visited cells. Supports up to 12x12 = 144 cells.
export class VisitedMask {
  public mask: Uint32Array;

  constructor(existing?: Uint32Array) {
    if (existing) {
      this.mask = new Uint32Array(existing);
    } else {
      this.mask = new Uint32Array(7);
    }
  }

  public set(index: number) {
    this.mask[index >> 5] |= (1 << (index & 31));
  }

  public has(index: number): boolean {
    return (this.mask[index >> 5] & (1 << (index & 31))) !== 0;
  }
}

interface PathNode {
  pos: Position;
  keysHeld: number;
  visited: VisitedMask;
  moves: number;
  directions: Direction[];
  pathPositions: Position[];
}

export class LevelSolver {
  private static readonly CARDINAL_DIRECTIONS: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

  public static solve(level: LevelData, initialKeysHeld: number = 0): SolverResult {
    const tiles: TileMeta[] = level.tiles ?? [];
    const gates: GateDef[] = level.gates ?? [];
    const keys: Position[] = level.keys ?? [];
    const resolver = new MechanicResolver(tiles);

    const totalCells = level.width * level.height;
    const totalFreeCells = totalCells - level.walls.length;

    const startKey = Grid.posKey(level.start);
    const goalKey  = Grid.posKey(level.goal);

    if (startKey === goalKey) {
      return this.trivialResult(level);
    }

    const getIndex = (pos: Position) => pos.y * level.width + pos.x;

    const buckets: PathNode[][] = [];
    const startNode: PathNode = {
      pos: level.start,
      keysHeld: initialKeysHeld,
      visited: new VisitedMask(),
      moves: 0,
      directions: [],
      pathPositions: [level.start]
    };
    startNode.visited.set(getIndex(level.start));
    buckets[0] = [startNode];

    const foundPaths: { moves: number, path: Direction[], posPath: Position[] }[] = [];
    let currentMoves = 0;
    let maxMovesLimit = Infinity;
    const minMovesToState = new Map<string, number>();

    const gridCache = new Map<number, Grid>();
    const getGridWithKeys = (keysHeld: number) => {
      if (gridCache.has(keysHeld)) return gridCache.get(keysHeld)!;
      const g = this.buildGridWithKeys(level.width, level.height, level.walls, gates, keys, keysHeld);
      gridCache.set(keysHeld, g);
      return g;
    };

    let visitedNodesCount = 0;

    while (currentMoves <= maxMovesLimit && currentMoves < 200) {
      if (!buckets[currentMoves] || buckets[currentMoves].length === 0) {
        currentMoves++;
        continue;
      }
      
      let queue = buckets[currentMoves];
      
      // Beam Search: Prevent BFS memory explosion on complex levels
      if (queue.length > 20000) {
        queue.sort((a, b) => {
           const distA = Math.abs(a.pos.x - level.goal.x) + Math.abs(a.pos.y - level.goal.y);
           const distB = Math.abs(b.pos.x - level.goal.x) + Math.abs(b.pos.y - level.goal.y);
           return distA - distB;
        });
        queue = queue.slice(0, 20000);
        buckets[currentMoves] = queue;
      }

      for (let i = 0; i < queue.length; i++) {
        const node = queue[i];
        visitedNodesCount++;
        
        if (foundPaths.length >= 3) {
          maxMovesLimit = foundPaths[foundPaths.length - 1].moves + 5; 
          if (node.moves > maxMovesLimit) break;
        }

        const stateKey = `${node.pos.x},${node.pos.y}|${node.keysHeld}`;
        const knownMin = minMovesToState.get(stateKey) ?? Infinity;
        
        // Advanced pruning: if we are > 6 moves worse than the absolute best way to reach this state, prune.
        if (node.moves > knownMin + 6) continue;
        
        if (node.moves < knownMin) {
          minMovesToState.set(stateKey, node.moves);
        }

        if (node.pos.x === level.goal.x && node.pos.y === level.goal.y) {
          foundPaths.push({ moves: node.moves, path: [...node.directions], posPath: [...node.pathPositions] });
          if (foundPaths.length === 1) {
             maxMovesLimit = node.moves + 10;
          }
          if (foundPaths.length >= 15) {
             maxMovesLimit = Math.min(maxMovesLimit, node.moves);
          }
          continue;
        }

        const currentGrid = getGridWithKeys(node.keysHeld);

        for (const dir of this.CARDINAL_DIRECTIONS) {
          const offset = Movement.getOffset(dir);
          const rawNext = { x: node.pos.x + offset.dx, y: node.pos.y + offset.dy };
          
          if (!currentGrid.isTraversable(rawNext)) continue;
          if (resolver.isOneWayBlock(rawNext, dir)) continue;

          const portalDest = resolver.getPortalTarget(rawNext);
          let effectivePos = portalDest ?? rawNext;

          if (portalDest !== null && !currentGrid.isTraversable(portalDest)) continue;

          let slideIntermediates: Position[] = [];
          if (resolver.isIceTile(effectivePos)) {
            slideIntermediates = resolver.resolveSlide(
              effectivePos,
              dir,
              (p) => currentGrid.isTraversable(p) && !node.visited.has(getIndex(p))
            );
            if (slideIntermediates.length > 0) {
              effectivePos = slideIntermediates[slideIntermediates.length - 1];
            }
          }

          const effIndex = getIndex(effectivePos);
          if (node.visited.has(effIndex)) continue;

          let nextKeysHeld = node.keysHeld;
          const keyIdx = keys.findIndex(k => k.x === effectivePos.x && k.y === effectivePos.y);
          if (keyIdx >= 0 && !(node.keysHeld & (1 << keyIdx))) {
            nextKeysHeld |= (1 << keyIdx);
          }

          const nextVisited = new VisitedMask(node.visited.mask);
          if (portalDest === null) {
            nextVisited.set(getIndex(rawNext));
          }
          for (const sp of slideIntermediates) {
            nextVisited.set(getIndex(sp));
          }
          nextVisited.set(effIndex);

          const nextPathPos = [...node.pathPositions];
          for (const sp of slideIntermediates) nextPathPos.push(sp);
          nextPathPos.push(effectivePos);

          const nextNode: PathNode = {
            pos: effectivePos,
            keysHeld: nextKeysHeld,
            visited: nextVisited,
            moves: node.moves + 1,
            directions: [...node.directions, dir],
            pathPositions: nextPathPos
          };

          if (!buckets[nextNode.moves]) buckets[nextNode.moves] = [];
          buckets[nextNode.moves].push(nextNode);
        }
      }
      currentMoves++;
    }

    if (foundPaths.length === 0) {
      return {
        solvable: false,
        optimalMoves: -1,
        shortestPath: [],
        shortestPathCount: 0,
        secondBestMoves: null,
        thirdBestMoves: null,
        solutionComplexity: 0,
        branchingFactor: 0,
        deadEndCount: 0,
        pathEfficiency: 0,
        directions: [],
        turnsCount: 0,
        visitedNodesCount,
        misleadingRoutes: 0,
        decisionPoints: 0,
        decisionDepth: 0,
        meaningfulBranches: 0,
        distanceBetweenDecisions: 0
      };
    }

    // Process found paths
    foundPaths.sort((a, b) => a.moves - b.moves);
    const optimalMoves = foundPaths[0].moves;
    const shortestPathCount = foundPaths.filter(p => p.moves === optimalMoves).length;
    
    const uniqueDistances = Array.from(new Set(foundPaths.map(p => p.moves)));
    const secondBestMoves = uniqueDistances.length > 1 ? uniqueDistances[1] : null;
    const thirdBestMoves = uniqueDistances.length > 2 ? uniqueDistances[2] : null;

    const bestPathNode = foundPaths[0];
    const shortestPathPositions = bestPathNode.posPath;
    const directions = bestPathNode.path;
    const turnsCount = this.countTurns(directions);

    // Advanced Metrics
    // Calculate dead ends simply by looking at map structure
    const baseGrid = new Grid(level.width, level.height, level.walls);
    let deadEndCount = 0;
    for (let x = 0; x < level.width; x++) {
      for (let y = 0; y < level.height; y++) {
        const pos = { x, y };
        if (baseGrid.isTraversable(pos)) {
          const posK = Grid.posKey(pos);
          if (posK !== startKey && posK !== goalKey) {
            let validNeighbors = 0;
            for (const dir of this.CARDINAL_DIRECTIONS) {
              const offset = Movement.getOffset(dir);
              const neighbor = { x: pos.x + offset.dx, y: pos.y + offset.dy };
              if (baseGrid.isTraversable(neighbor)) validNeighbors++;
            }
            if (validNeighbors === 1) deadEndCount++;
          }
        }
      }
    }

    let totalBranchesOnPath = 0;
    let decisionPoints = 0;
    for (let i = 0; i < shortestPathPositions.length - 1; i++) {
      const pos = shortestPathPositions[i];
      let branches = 0;
      for (const dir of this.CARDINAL_DIRECTIONS) {
        const offset = Movement.getOffset(dir);
        if (baseGrid.isTraversable({ x: pos.x + offset.dx, y: pos.y + offset.dy })) branches++;
      }
      totalBranchesOnPath += Math.max(1, branches - 1);
      if (i === 0 && branches > 1) decisionPoints++;
      else if (i > 0 && branches > 2) decisionPoints++;
    }
    const branchingFactor = totalBranchesOnPath / Math.max(1, shortestPathPositions.length - 1);
    
    const decisionDepth = secondBestMoves ? Math.max(0, secondBestMoves - optimalMoves) : 0;
    const meaningfulBranches = foundPaths.length > 1 ? foundPaths.length : 0;
    const misleadingRoutes = Math.max(0, visitedNodesCount - shortestPathPositions.length);
    const pathEfficiency = optimalMoves / Math.max(1, totalFreeCells);
    const distanceBetweenDecisions = decisionPoints > 0 ? optimalMoves / decisionPoints : optimalMoves;
    
    // Higher complexity when multiple similar length paths exist (requires more thought to distinguish)
    const trapPenalty = (secondBestMoves && secondBestMoves <= optimalMoves + 2) ? 10 : 0;
    
    const solutionComplexity = (optimalMoves * 1.5) + (turnsCount * 2) + (branchingFactor * 3) + (decisionPoints * 2) + (misleadingRoutes * 0.1) + trapPenalty + (decisionDepth * 2);

    return {
      solvable: true,
      optimalMoves,
      shortestPath: shortestPathPositions,
      shortestPathCount,
      secondBestMoves,
      thirdBestMoves,
      solutionComplexity,
      branchingFactor,
      deadEndCount,
      pathEfficiency,
      directions,
      turnsCount,
      visitedNodesCount,
      misleadingRoutes,
      decisionPoints,
      decisionDepth,
      meaningfulBranches,
      distanceBetweenDecisions
    };
  }

  private static buildGridWithKeys(
    width: number,
    height: number,
    walls: Position[],
    gates: GateDef[],
    keys: Position[],
    keysHeld: number
  ): Grid {
    const lockedGates = gates.filter(g => !(keysHeld & (1 << g.keyIndex)));
    const remainingKeys = keys.filter((_, i) => !(keysHeld & (1 << i)));
    return new Grid(width, height, walls, lockedGates, remainingKeys);
  }

  private static trivialResult(level: LevelData): SolverResult {
    return {
      solvable: true,
      optimalMoves: 0,
      shortestPath: [level.start],
      shortestPathCount: 1,
      secondBestMoves: null,
      thirdBestMoves: null,
      solutionComplexity: 0,
      branchingFactor: 0,
      deadEndCount: 0,
      pathEfficiency: 0,
      directions: [],
      turnsCount: 0,
      visitedNodesCount: 1,
      misleadingRoutes: 0,
      decisionPoints: 0,
      decisionDepth: 0,
      meaningfulBranches: 0,
      distanceBetweenDecisions: 0
    };
  }

  public static countTurns(dirs: Direction[]): number {
    let turns = 0;
    for (let i = 1; i < dirs.length; i++) {
      if (dirs[i] !== dirs[i - 1]) turns++;
    }
    return turns;
  }

  public static getNextBestMove(level: LevelData, currentPos: Position, keysHeld: number = 0): Direction | null {
    const subLevel: LevelData = { ...level, start: currentPos };
    const solution = this.solve(subLevel, keysHeld);
    if (solution.solvable && solution.directions.length > 0) {
      return solution.directions[0];
    }
    return null;
  }

  public static getOptimalPath(level: LevelData, currentPos: Position, keysHeld: number = 0): Position[] {
    const subLevel: LevelData = { ...level, start: currentPos };
    const solution = this.solve(subLevel, keysHeld);
    if (solution.solvable && solution.shortestPath.length > 0) {
      return solution.shortestPath;
    }
    return [];
  }
}
