import type { LevelData, Position, TileType } from './types';
import { PRNG } from './PRNG';
import { Grid } from './Grid';
import { LevelSolver, type SolverResult } from './LevelSolver';
import {
  DIFFICULTY_PRESETS,
  type DifficultyPresetName,
  type LevelPresetConfig,
  type LayoutStyle,
  getPresetForLevelId
} from './LevelGeneratorPresets';

export interface GenerationMetrics {
  attempts: number;
  layout: LayoutStyle;
  solvable: boolean;
  minMoves: number;
  turns: number;
  deadEnds: number;
  branching: number;
  difficultyRating: number;
  fingerprint: string;
}

export interface GenerationResult {
  success: boolean;
  level: LevelData | null;
  metrics?: GenerationMetrics;
  rejectReason?: string;
}

export class LevelGenerator {
  // Global canonical registry of generated level fingerprints to prevent duplicates
  private static registeredFingerprints: Set<string> = new Set();
  // Rolling buffer of the last 20 generated levels to prevent structural clones
  private static recentLevels: LevelData[] = [];

  /**
   * Clears the duplicate fingerprint registry (useful for testing or full regeneration).
   */
  public static clearRegistry(): void {
    this.registeredFingerprints.clear();
    this.recentLevels = [];
  }

  /**
   * Number of registered unique levels
   */
  public static getRegisteredCount(): number {
    return this.registeredFingerprints.size;
  }

  public static generateEndless(endlessLevel: number): LevelData {
    const preset = getPresetForLevelId(endlessLevel);
    
    // Use a distinct seed sequence for endless mode to avoid overlap with campaign
    const baseSeed = (endlessLevel * 31337 + 42069) >>> 0;
    
    // Use a negative ID to easily distinguish endless levels from campaign levels
    const virtualId = -(100000 + endlessLevel);
    
    const level = this.generate(virtualId, preset.name, baseSeed);
    level.name = `Endless ${endlessLevel}`;
    return level;
  }

  public static generate(
    id: number,
    presetName?: DifficultyPresetName,
    seedOverride?: number
  ): LevelData {
    const preset = presetName ? DIFFICULTY_PRESETS[presetName] : getPresetForLevelId(id);
    const baseSeed = seedOverride ?? (id * 10007 + 7919);

    const targetDifficulty = (preset.minDifficultyScore + preset.maxDifficultyScore) / 2;
    const candidates: Array<{ level: LevelData; difficultyDelta: number; solution: SolverResult; isPerfect: boolean }> = [];

    // Try up to 200 times to find a level that satisfies all difficulty criteria
    const isRuntimeLevel = id < 0;
    const MAX_ATTEMPTS = isRuntimeLevel ? 60 : 200;
    const POOL_SIZE = isRuntimeLevel ? 3 : 10;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const attemptSeed = (baseSeed + attempt * 2654435761) >>> 0;
      const rng = new PRNG(attemptSeed);

      // 1. Choose layout style
      const layout = rng.choice(preset.allowedLayouts);

      // 2. Generate candidate puzzle using maze-carving approach
      const candidate = this.generateCandidate(id, preset, layout, rng);

      // 3. Ensure start and goal are valid
      if (!this.isValidStartAndGoal(candidate)) continue;

      const solution: SolverResult = LevelSolver.solve(candidate);

      const debug = (attempt > MAX_ATTEMPTS - 10);
      if (debug && !solution.solvable) {
        console.log(`[Attempt ${attempt}] Rejected: Unsolvable`);
        console.log('Candidate:', JSON.stringify(candidate));
      }

      // 5. Verify solution exists & not impossible
      if (!solution.solvable || solution.optimalMoves < 0) continue;

      // Relax shortest path for higher difficulties to make generation possible
      const allowedPaths = solution.optimalMoves >= 30 ? 1000 : (solution.optimalMoves >= 20 ? 100 : (solution.optimalMoves >= 10 ? 15 : 3));
      const emergencyAttempt = attempt >= MAX_ATTEMPTS - 20;
      if (solution.shortestPathCount > allowedPaths && !emergencyAttempt) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Shortest paths (${solution.shortestPathCount}) > ${allowedPaths}`);
        continue;
      }

      // Dynamic fallback to prevent impossible generation loops
      const relaxFactor = attempt > (MAX_ATTEMPTS - 20) ? 0.1 : 1.0;
      
      const dynamicMinMoves = Math.floor(preset.minMoves * relaxFactor);
      const dynamicMinTurns = Math.floor(preset.minTurns * relaxFactor);

      // 6. Reject trivial levels
      if (this.isTrivial(candidate, solution, dynamicMinMoves, dynamicMinTurns) && !emergencyAttempt) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Trivial (moves: ${solution.optimalMoves} < ${dynamicMinMoves} or turns: ${solution.turnsCount} < ${dynamicMinTurns})`);
        continue;
      }

      if (!this.meetsRouteDifficulty(solution, preset, relaxFactor) && !emergencyAttempt) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Route is too obvious`);
        continue;
      }

      // NEW: Spatial balance check — reject levels with obstacles concentrated on one side
      if (!this.isSpatiallyBalanced(candidate, solution) && !emergencyAttempt) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Spatially imbalanced (obstacle cluster)`);
        continue;
      }

      // NEW: Boundary bypass check — reject levels with a trivial path along the edge
      if (this.hasBoundaryBypass(candidate, solution) && !emergencyAttempt) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Boundary bypass route exists`);
        continue;
      }

      // 7. Calculate difficulty & complexity
      const difficultyRating = this.calculateDifficulty(candidate, solution, {
        ...preset,
        minDeadEnds: Math.floor(preset.minDeadEnds * relaxFactor),
        minBranching: Math.floor(preset.minBranching * relaxFactor),
        minDifficultyScore: Math.floor(preset.minDifficultyScore * relaxFactor)
      });
      
      const fingerprint = this.computeCanonicalFingerprint(candidate, solution);
      if (this.registeredFingerprints.has(fingerprint)) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Duplicate fingerprint`);
        continue;
      }
      
      // 8.5 Reject structural clones from recent history
      if (this.isStructurallySimilar(candidate) && !emergencyAttempt) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Structurally similar to a recent level`);
        continue;
      }

      // It's a valid candidate!
      candidate.optimalSolutionLength = solution.optimalMoves;
      candidate.parMoves = solution.optimalMoves;
      candidate.targetMoves = solution.optimalMoves;
      candidate.difficulty = difficultyRating;
      const baseTime = Math.max(5, solution.optimalMoves * 1.2 + solution.turnsCount * 0.5);
      candidate.targetTime = Math.ceil(baseTime);
      if (preset.challenge.timeLimitMultiplier !== undefined) {
        candidate.timeLimit = Math.ceil(candidate.targetTime * preset.challenge.timeLimitMultiplier);
      }

      const difficultyDelta = Math.abs(difficultyRating - targetDifficulty);
      
      // Check if it's perfectly in bounds
      const isPerfect = difficultyRating >= preset.minDifficultyScore && difficultyRating <= preset.maxDifficultyScore;
      
      if (debug) console.log(`[Attempt ${attempt}] Pushed candidate! isPerfect: ${isPerfect} (Score: ${difficultyRating}, Target bounds: ${preset.minDifficultyScore}-${preset.maxDifficultyScore})`);
      
      candidates.push({ level: candidate, difficultyDelta, solution, isPerfect });
      
      // We want at least POOL_SIZE *perfect* candidates
      const perfectCount = candidates.filter(c => c.isPerfect).length;
      if (perfectCount >= POOL_SIZE) {
        break; // We have enough perfect candidates to choose from
      }
    }

    if (candidates.length === 0) {
      throw new Error(`Failed to generate a valid level for ID ${id} after ${MAX_ATTEMPTS} attempts.`);
    }

    // Select the best candidate (closest to target difficulty)
    candidates.sort((a, b) => a.difficultyDelta - b.difficultyDelta);
    const best = candidates[0];

    // Place mechanic tiles for worlds that allow them
    if (preset.allowedMechanics.length > 0 && preset.maxMechanicTiles > 0) {
      const mechSeed = (baseSeed ^ 0xDEADBEEF) >>> 0;
      const mechRng = new PRNG(mechSeed);
      
      let bestMechLevel = best.level;
      let bestMechSolution = best.solution;

      // Try applying mechanics 5 times and keep the one that gives the highest valid complexity
      for (let m = 0; m < 5; m++) {
        const testLevel = JSON.parse(JSON.stringify(best.level));
        testLevel.tiles = [];
        testLevel.keys = [];
        testLevel.gates = [];
        
        this.placeMechanicTiles(testLevel, preset, mechRng);
        
        const testSolution = LevelSolver.solve(testLevel);
        if (testSolution.solvable && testSolution.optimalMoves >= bestMechSolution.optimalMoves) {
           bestMechLevel = testLevel;
           bestMechSolution = testSolution;
        }
      }
      
      best.level = bestMechLevel;
      best.solution = bestMechSolution;
      best.level.optimalSolutionLength = bestMechSolution.optimalMoves;
      best.level.parMoves = bestMechSolution.optimalMoves;
      best.level.targetMoves = bestMechSolution.optimalMoves;
    }

    const bestCandidate = best.level;
    this.registeredFingerprints.add(this.computeCanonicalFingerprint(bestCandidate, best.solution));
    
    this.recentLevels.push(bestCandidate);
    if (this.recentLevels.length > 20) {
      this.recentLevels.shift();
    }

    return bestCandidate;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAZE-CARVING GENERATION ENGINE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate candidate using a recursive-backtracker maze carver.
   *
   * Algorithm:
   * 1. Start with every cell WALLED (full grid of obstacles).
   * 2. Carve a perfect maze using recursive backtracker (DFS). This creates a
   *    spanning tree of passages covering 100% of the grid — no isolated areas.
   * 3. Remove extra walls to open up the maze according to the density setting,
   *    adding branches and alternative routes. Removals are spread across all
   *    regions (3×3 zone grid) to guarantee spatial balance.
   * 4. Place START in the top-left quadrant, GOAL in the bottom-right quadrant
   *    (or diagonally opposite corners) to force traversal of the full board.
   */
  private static generateCandidate(
    id: number,
    preset: LevelPresetConfig,
    _layout: LayoutStyle,
    rng: PRNG
  ): LevelData {
    const width = preset.gridWidth;
    const height = preset.gridHeight;

    // ── Step 1: Generate a perfect maze via recursive backtracker ──────────
    // The maze operates on "cells" separated by walls.
    // We work in a full-grid model: every cell can be wall or open.
    // Carve starting from (0,0) in a DFS pattern to guarantee full connectivity.

    const wallGrid: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      wallGrid.push(new Array(width).fill(true)); // all walls initially
    }

    const visited: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      visited.push(new Array(width).fill(false));
    }

    // DFS maze carver — carves a perfect spanning tree
    const carve = (x: number, y: number) => {
      visited[y][x] = true;
      wallGrid[y][x] = false; // open this cell

      // Randomise direction order
      const dirs = rng.shuffle([
        { dx: 0, dy: -2 }, // up
        { dx: 2, dy: 0  }, // right
        { dx: 0, dy: 2  }, // down
        { dx: -2, dy: 0 }, // left
      ]);

      for (const { dx, dy } of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx]) {
          // Open the wall between current and next cell
          const mx = x + dx / 2;
          const my = y + dy / 2;
          wallGrid[my][mx] = false;
          carve(nx, ny);
        }
      }
    };

    // Start carving from a random odd-coordinate cell to create a proper maze grid
    const startCarvX = rng.range(0, Math.floor((width - 1) / 2)) * 2;
    const startCarvY = rng.range(0, Math.floor((height - 1) / 2)) * 2;
    carve(startCarvX, startCarvY);

    // ── Step 2: Open extra passages to add branching / multiple routes ──────
    // This controls how "open" the maze is. More removals = more routes = harder decisions.
    // We distribute removals EVENLY across 3×3 zones to guarantee spatial balance.

    const density = rng.floatRange(preset.wallDensityMin, preset.wallDensityMax);
    const totalCells = width * height;
    // Target: density% of cells should be walls AFTER carving
    // Count how many walls we have already and how many we should keep
    let currentWallCount = wallGrid.flat().filter(w => w).length;
    const targetWallCount = Math.floor(totalCells * density);
    const wallsToRemove = Math.max(0, currentWallCount - targetWallCount);

    // Collect interior walls (not on boundary) that can be removed, grouped by zone
    const zones: Position[][] = Array.from({ length: 9 }, () => []);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (wallGrid[y][x]) {
          const zx = Math.floor((x / width) * 3);
          const zy = Math.floor((y / height) * 3);
          zones[zy * 3 + zx].push({ x, y });
        }
      }
    }

    // Remove walls zone-by-zone in a round-robin fashion to balance the board
    const shuffledZones = zones.map(z => rng.shuffle(z));
    let removed = 0;
    let zoneIdx = 0;
    const zonePointers = new Array(9).fill(0);
    while (removed < wallsToRemove) {
      const zone = shuffledZones[zoneIdx % 9];
      const ptr = zonePointers[zoneIdx % 9];
      if (ptr < zone.length) {
        const pos = zone[ptr];
        wallGrid[pos.y][pos.x] = false;
        zonePointers[zoneIdx % 9]++;
        removed++;
      }
      zoneIdx++;
      // Safety: break if we've cycled all zones with nothing left to remove
      if (zoneIdx > wallsToRemove * 9 + 100) break;
    }

    // ── Step 3: Convert wall grid to walls array ─────────────────────────────
    const walls: Position[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (wallGrid[y][x]) walls.push({ x, y });
      }
    }

    // ── Step 4: Place START and GOAL in diagonally opposite quadrants ────────
    // This FORCES the player to cross the entire board.
    // START is in one corner quadrant, GOAL is in the diagonally opposite quadrant.

    const wallSet = new Set(walls.map(w => `${w.x},${w.y}`));
    const isOpen = (x: number, y: number) => !wallSet.has(`${x},${y}`);

    // Choose quadrant pair: top-left→bottom-right or top-right→bottom-left
    const flipDiag = rng.chance(0.5);
    const qW = Math.floor(width / 2);
    const qH = Math.floor(height / 2);

    // Collect open cells from each quadrant
    const startQuadCells: Position[] = [];
    const goalQuadCells: Position[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isOpen(x, y)) continue;
        if (!flipDiag) {
          if (x < qW && y < qH) startQuadCells.push({ x, y });
          if (x >= width - qW && y >= height - qH) goalQuadCells.push({ x, y });
        } else {
          if (x >= width - qW && y < qH) startQuadCells.push({ x, y });
          if (x < qW && y >= height - qH) goalQuadCells.push({ x, y });
        }
      }
    }

    let start: Position;
    let goal: Position;

    if (startQuadCells.length > 0 && goalQuadCells.length > 0) {
      // Pick cells toward the outer edge of each quadrant for maximum path length
      start = rng.choice(startQuadCells);
      goal = rng.choice(goalQuadCells);
    } else {
      // Fallback: use corners
      const corners: Position[] = [
        { x: 0, y: 0 },
        { x: width - 1, y: 0 },
        { x: 0, y: height - 1 },
        { x: width - 1, y: height - 1 },
      ];
      // Find a pair of open corners
      let found = false;
      for (const c1 of corners) {
        if (!isOpen(c1.x, c1.y)) continue;
        // Ensure corner cell is open; if not, make it open
        for (const c2 of corners) {
          if (c1.x === c2.x && c1.y === c2.y) continue;
          if (!isOpen(c2.x, c2.y)) continue;
          const manhattan = Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y);
          if (manhattan >= Math.floor((width + height) * 0.6)) {
            start = c1;
            goal = c2;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        // Last resort: open top-left and bottom-right corners
        wallGrid[0][0] = false;
        wallGrid[height - 1][width - 1] = false;
        start = { x: 0, y: 0 };
        goal = { x: width - 1, y: height - 1 };
        // Rebuild walls array
        walls.length = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (wallGrid[y][x]) walls.push({ x, y });
          }
        }
      }
    }

    // Guarantee start and goal cells are open
    const removeWall = (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      if (wallSet.has(key)) {
        wallSet.delete(key);
        const idx = walls.findIndex(w => w.x === pos.x && w.y === pos.y);
        if (idx >= 0) walls.splice(idx, 1);
      }
    };
    removeWall(start!);
    removeWall(goal!);

    return {
      id,
      worldId: preset.worldId,
      name: `${preset.name} ${id}`,
      width,
      height,
      start: start!,
      goal: goal!,
      walls,
      challenge: { ...preset.challenge }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SPATIAL BALANCE VALIDATOR
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Checks that walls are spread throughout the board, not clustered on one side.
   *
   * Divides the board into a 3×3 grid of 9 zones. Counts the number of OPEN cells
   * in each zone. Rejects if any single zone contains more than 45% of all open cells
   * (meaning the rest of the board is packed with walls while one zone is empty).
   *
   * Also checks path coverage: the solution must traverse at least 3 distinct zones.
   */
  private static isSpatiallyBalanced(level: LevelData, solution: SolverResult): boolean {
    const { width, height, walls } = level;
    const wallSet = new Set(walls.map(w => `${w.x},${w.y}`));

    // Count open cells per zone
    const openPerZone = new Array(9).fill(0);
    let totalOpen = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!wallSet.has(`${x},${y}`)) {
          const zx = Math.floor((x / width) * 3);
          const zy = Math.floor((y / height) * 3);
          openPerZone[zy * 3 + zx]++;
          totalOpen++;
        }
      }
    }

    if (totalOpen === 0) return false;

    // Reject if any single zone hogs more than 45% of all open cells
    const maxFraction = 0.45;
    for (const count of openPerZone) {
      if (count / totalOpen > maxFraction) return false;
    }

    // Check that solution path traverses at least 3 different zones
    const solutionPath = solution.shortestPath;
    if (solutionPath.length === 0) return false;

    const zonesTraversed = new Set<number>();
    for (const pos of solutionPath) {
      const zx = Math.floor((pos.x / width) * 3);
      const zy = Math.floor((pos.y / height) * 3);
      zonesTraversed.add(zy * 3 + zx);
    }

    const minZonesRequired = width >= 12 ? 4 : 3;
    if (zonesTraversed.size < minZonesRequired) return false;

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BOUNDARY BYPASS DETECTOR
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Detects if a player can easily bypass the puzzle by running along the outer edge.
   *
   * Uses a simplified BFS restricted to boundary cells (x=0, x=W-1, y=0, y=H-1).
   * If start→goal can be reached using ONLY boundary cells, the level is rejected
   * because a player would never need to engage with the interior puzzle.
   */
  private static hasBoundaryBypass(level: LevelData, _solution: SolverResult): boolean {
    const { width, height, walls, start, goal } = level;
    const wallSet = new Set(walls.map(w => `${w.x},${w.y}`));

    const isBoundary = (x: number, y: number) =>
      x === 0 || x === width - 1 || y === 0 || y === height - 1;

    const isOpen = (x: number, y: number) => !wallSet.has(`${x},${y}`);

    // Only check bypass if both start and goal are near the boundary
    const startOnBoundary = isBoundary(start.x, start.y);
    const goalOnBoundary = isBoundary(goal.x, goal.y);
    if (!startOnBoundary || !goalOnBoundary) return false;

    // BFS along boundary only
    const visited = new Set<string>();
    const queue: Position[] = [start];
    visited.add(`${start.x},${start.y}`);

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.x === goal.x && cur.y === goal.y) return true; // bypass found!

      for (const { dx, dy } of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (
          nx >= 0 && nx < width && ny >= 0 && ny < height &&
          isBoundary(nx, ny) && isOpen(nx, ny) && !visited.has(key)
        ) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    return false; // no boundary bypass
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXISTING VALIDATORS (unchanged)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validate that start and goal are inside bounds, not walls, and not trapped.
   */
  private static isValidStartAndGoal(level: LevelData): boolean {
    const grid = new Grid(level.width, level.height, level.walls);

    // In bounds
    if (!grid.isInBounds(level.start) || !grid.isInBounds(level.goal)) return false;

    // Not walls
    if (grid.hasWall(level.start) || grid.hasWall(level.goal)) return false;

    // Distinct positions
    if (level.start.x === level.goal.x && level.start.y === level.goal.y) return false;

    // Manhattan distance check (ensure start and goal aren't trivially adjacent)
    const manhattan = Math.abs(level.goal.x - level.start.x) + Math.abs(level.goal.y - level.start.y);
    const minRequiredDistance = Math.max(2, Math.floor((level.width + level.height) * 0.3));
    if (manhattan < minRequiredDistance) return false;

    // Degree check (must have at least one open neighbor)
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];
    const startOpen = dirs.some(d =>
      grid.isTraversable({ x: level.start.x + d.dx, y: level.start.y + d.dy })
    );
    const goalOpen = dirs.some(d =>
      grid.isTraversable({ x: level.goal.x + d.dx, y: level.goal.y + d.dy })
    );

    return startOpen && goalOpen;
  }

  /**
   * Rejects trivial levels (too short, zero turns, straight path with no obstacles)
   */
  private static isTrivial(
    level: LevelData,
    solution: SolverResult,
    minMovesThreshold: number,
    minTurnsThreshold: number
  ): boolean {
    // 1. Path too short for preset
    if (solution.optimalMoves < minMovesThreshold) return true;

    // 2. Not enough turns for preset
    if (solution.turnsCount < minTurnsThreshold) return true;

    // 3. Trivial straight line: start to goal on same row or column with 0 turns
    if (
      (level.start.x === level.goal.x || level.start.y === level.goal.y) &&
      solution.turnsCount === 0
    ) {
      return true;
    }

    return false;
  }

  private static meetsRouteDifficulty(
    solution: SolverResult,
    preset: LevelPresetConfig,
    relaxFactor: number
  ): boolean {
    const minDecisionPoints = Math.floor((preset.minDecisionPoints ?? 0) * relaxFactor);
    const minMisleadingRoutes = Math.floor((preset.minMisleadingRoutes ?? 0) * relaxFactor);
    const minDecisionDepth = Math.floor((preset.minDecisionDepth ?? 0) * relaxFactor);

    if (solution.decisionPoints < minDecisionPoints) return false;
    if (solution.misleadingRoutes < minMisleadingRoutes) return false;
    if (solution.decisionDepth < minDecisionDepth) return false;
    if (
      preset.maxShortestPathCount !== undefined &&
      solution.shortestPathCount > preset.maxShortestPathCount
    ) {
      return false;
    }

    return true;
  }

  /**
   * Calculate numerical difficulty rating (1 to 100)
   */
  public static calculateDifficulty(
    level: LevelData,
    solution: SolverResult,
    _preset: LevelPresetConfig
  ): number {
    const totalCells = level.width * level.height;
    const wallRatio = level.walls.length / totalCells;

    const diagonal = Math.sqrt(level.width * level.width + level.height * level.height);
    const lengthScore = Math.min(45, (solution.optimalMoves / diagonal) * 6);
    const densityScore = Math.min(15, wallRatio * 30);
    const turnsScore = Math.min(30, solution.turnsCount * 2.5);

    // Advanced Metrics
    const branchingScore = Math.min(40, (solution.meaningfulBranches * 5) + (solution.branchingFactor * 2));
    
    // Near-Optimal Traps Score
    let trapScore = 0;
    if (solution.secondBestMoves && solution.secondBestMoves <= solution.optimalMoves + 2) {
      trapScore += 20; // High score for extremely close near-optimal trap
    } else if (solution.secondBestMoves && solution.secondBestMoves <= solution.optimalMoves + 4) {
      trapScore += 10;
    }
    
    // Decision Depth Score
    const depthScore = Math.min(30, solution.decisionDepth * 4);

    // Route pressure rewards puzzles that look navigable but require careful planning.
    const routePressureScore = Math.min(
      50,
      solution.misleadingRoutes * 0.35 +
        solution.decisionPoints * 4 +
        solution.decisionDepth * 5 +
        (solution.shortestPathCount <= 2 ? 10 : 0)
    );

    let compositeScore = lengthScore + densityScore + turnsScore + trapScore + branchingScore + depthScore + routePressureScore;

    // Give a slight boost if the shortest path is highly obfuscated
    if (solution.decisionPoints > 0 && solution.distanceBetweenDecisions < 3) {
      compositeScore += 10;
    }
    
    // Penalty if uniqueness mode is violated
    const mode = _preset.uniquenessMode || 'A';
    if (mode === 'A' && solution.shortestPathCount > 1) {
      compositeScore -= Math.min(25, solution.shortestPathCount * 10);
    } else if (mode === 'B' && solution.shortestPathCount > 3) {
      compositeScore -= Math.min(20, (solution.shortestPathCount - 3) * 5);
    } else if ((mode === 'C' || mode === 'D') && solution.shortestPathCount > 10) {
      // Allow many but not totally degenerate
      compositeScore -= Math.min(15, (solution.shortestPathCount - 10) * 2);
    }

    // Clamp between 1 and 200
    const finalScore = Math.round(compositeScore);
    
    return Math.max(1, Math.min(200, finalScore));
  }

  /**
   * Computes a canonical hash fingerprint to reject duplicate or isomorphic levels.
   */
  public static computeCanonicalFingerprint(
    level: LevelData,
    solution: SolverResult
  ): string {
    const sortedWalls = [...level.walls]
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
      .map(w => `${w.x}:${w.y}`)
      .join('|');
    const dirSignature = solution.directions.join('-');
    return `${level.width}x${level.height}_S${level.start.x},${level.start.y}_G${level.goal.x},${level.goal.y}_W[${sortedWalls}]_P[${dirSignature}]`;
  }

  /**
   * Checks if a candidate level is structurally highly similar to any of the last 20 generated levels.
   */
  private static isStructurallySimilar(candidate: LevelData): boolean {
    if (this.recentLevels.length === 0) return false;

    // Build a 3x3 macro grid signature for the candidate
    const getSignature = (level: LevelData) => {
      const sig = new Array(9).fill(0);
      for (const w of level.walls) {
        const zoneX = Math.floor((w.x / level.width) * 3);
        const zoneY = Math.floor((w.y / level.height) * 3);
        sig[zoneY * 3 + zoneX]++;
      }
      return sig;
    };

    const candSig = getSignature(candidate);

    for (const recent of this.recentLevels) {
      if (recent.width !== candidate.width || recent.height !== candidate.height) continue;
      
      const recSig = getSignature(recent);
      let diff = 0;
      for (let i = 0; i < 9; i++) {
        diff += Math.abs(candSig[i] - recSig[i]);
      }
      
      // If the macro structure differs by less than 4 blocks total, reject as clone
      if (diff < 4) return true;
    }

    return false;
  }

  /**
   * Places mechanic tiles on a generated level.
   * Tiles are placed only on traversable, non-start, non-goal cells.
   * Portal tiles are always placed in pairs.
   * After placement the caller re-validates solvability.
   */
  private static placeMechanicTiles(
    level: LevelData,
    preset: LevelPresetConfig,
    rng: PRNG
  ): void {
    const grid = new Grid(level.width, level.height, level.walls);
    const startKey = Grid.posKey(level.start);
    const goalKey = Grid.posKey(level.goal);

    // Collect all candidate positions (traversable, not start, not goal)
    const candidatePositions: Position[] = [];
    for (let x = 0; x < level.width; x++) {
      for (let y = 0; y < level.height; y++) {
        const pos = { x, y };
        const key = Grid.posKey(pos);
        if (grid.isTraversable(pos) && key !== startKey && key !== goalKey) {
          candidatePositions.push(pos);
        }
      }
    }

    if (candidatePositions.length < 2) return;

    level.tiles = [];
    level.keys = [];
    level.gates = [];
    const usedPositions = new Set<string>();
    let placed = 0;
    const maxTiles = preset.maxMechanicTiles;

    // KEY & GATE Logic (50% chance for medium/hard/expert/master levels)
    if (preset.name !== 'TUTORIAL' && preset.name !== 'EASY' && rng.chance(0.5)) {
      const freeCells = rng.shuffle(candidatePositions.filter(p => !usedPositions.has(Grid.posKey(p))));
      if (freeCells.length >= 2) {
        const keyPos = freeCells[0];
        const gatePos = freeCells[1];
        level.keys.push(keyPos);
        level.gates.push({ pos: gatePos, keyIndex: 0 });
        usedPositions.add(Grid.posKey(keyPos));
        usedPositions.add(Grid.posKey(gatePos));
        placed += 2;
      }
    }

    // Pick 1-3 mechanic types from allowed list, shuffled
    const availableTypes = rng.shuffle(preset.allowedMechanics);
    const numTypes = rng.range(1, Math.min(3, availableTypes.length));
    const selectedTypes = availableTypes.slice(0, numTypes);

    for (const mechType of selectedTypes) {
      if (placed >= maxTiles) break;

      if (mechType === 'PORTAL') {
        // Portals come in pairs — need 2 free positions
        const freeCells = candidatePositions.filter(p => !usedPositions.has(Grid.posKey(p)));
        if (freeCells.length < 2) continue;

        const shuffled = rng.shuffle(freeCells);
        const posA = shuffled[0];
        const posB = shuffled[1];

        level.tiles.push(
          { pos: posA, type: 'PORTAL', linkedPos: posB },
          { pos: posB, type: 'PORTAL', linkedPos: posA }
        );
        usedPositions.add(Grid.posKey(posA));
        usedPositions.add(Grid.posKey(posB));
        placed += 2;

      } else if (mechType === 'ICE') {
        // Place 2-3 ice tiles
        const freeCells = rng.shuffle(candidatePositions.filter(p => !usedPositions.has(Grid.posKey(p))));
        let icePlaced = 0;
        for (const pos of freeCells) {
          if (placed >= maxTiles || icePlaced >= 3) break;
          level.tiles.push({ pos, type: 'ICE' });
          usedPositions.add(Grid.posKey(pos));
          placed++;
          icePlaced++;
        }

      } else if (mechType.startsWith('ONE_WAY')) {
        // Place 1-2 one-way tiles
        const freeCells = rng.shuffle(candidatePositions.filter(p => !usedPositions.has(Grid.posKey(p))));
        let owPlaced = 0;
        for (const pos of freeCells) {
          if (placed >= maxTiles || owPlaced >= 2) break;
          level.tiles.push({ pos, type: mechType as TileType });
          usedPositions.add(Grid.posKey(pos));
          placed++;
          owPlaced++;
        }
      } else if (mechType === 'SPIKE_TRAP') {
        const freeCells = rng.shuffle(candidatePositions.filter(p => !usedPositions.has(Grid.posKey(p))));
        let spikesPlaced = 0;
        for (const pos of freeCells) {
          if (placed >= maxTiles || spikesPlaced >= 3) break;
          // Vary the intervals to make patterns (e.g. 1000/1000, 1500/1000, 500/1500)
          const active = rng.choice([1000, 1500, 2000]);
          const idle = rng.choice([1000, 1500, 2000]);
          const offset = rng.choice([0, 500, 1000, 1500]);
          level.tiles.push({ 
            pos, 
            type: 'SPIKE_TRAP',
            activeIntervalMs: active,
            idleIntervalMs: idle,
            timeOffsetMs: offset
          });
          usedPositions.add(Grid.posKey(pos));
          placed++;
          spikesPlaced++;
        }
      } else if (mechType === 'MOVING_SAW') {
        const freeCells = rng.shuffle(candidatePositions.filter(p => !usedPositions.has(Grid.posKey(p))));
        let sawsPlaced = 0;
        for (const pos of freeCells) {
          if (placed >= maxTiles || sawsPlaced >= 2) break;
          // Determine axis (HORIZONTAL or VERTICAL) and speed
          const axis = rng.choice(['HORIZONTAL', 'VERTICAL']) as 'HORIZONTAL' | 'VERTICAL';
          const speed = rng.choice([2, 3, 4, 5]); // cells per second
          level.tiles.push({ 
            pos, 
            type: 'MOVING_SAW',
            axis,
            speed
          });
          usedPositions.add(Grid.posKey(pos));
          placed++;
          sawsPlaced++;
        }
      }
    }
  }

}