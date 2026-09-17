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
    const MAX_ATTEMPTS = 200;
    const POOL_SIZE = 10;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const attemptSeed = (baseSeed + attempt * 2654435761) >>> 0;
      const rng = new PRNG(attemptSeed);

      // 1. Choose layout style
      const layout = rng.choice(preset.allowedLayouts);

      // 2. Generate candidate puzzle
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
      if (solution.shortestPathCount > allowedPaths && attempt < MAX_ATTEMPTS - 10) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Shortest paths (${solution.shortestPathCount}) > ${allowedPaths}`);
        continue;
      }

      // Dynamic fallback to prevent impossible generation loops
      const relaxFactor = attempt > (MAX_ATTEMPTS - 20) ? 0.6 : 1.0;
      
      const dynamicMinMoves = Math.floor(preset.minMoves * relaxFactor);
      const dynamicMinTurns = Math.floor(preset.minTurns * relaxFactor);

      // 6. Reject trivial levels
      if (this.isTrivial(candidate, solution, dynamicMinMoves, dynamicMinTurns)) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Trivial (moves: ${solution.optimalMoves} < ${dynamicMinMoves} or turns: ${solution.turnsCount} < ${dynamicMinTurns})`);
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
      if (this.isStructurallySimilar(candidate)) {
        if (debug) console.log(`[Attempt ${attempt}] Rejected: Structurally similar to a recent level`);
        continue;
      }

      // It's a valid candidate!
      candidate.optimalSolutionLength = solution.optimalMoves;
      candidate.parMoves = solution.optimalMoves;
      candidate.targetMoves = solution.optimalMoves;
      candidate.difficulty = difficultyRating;
      const baseTime = Math.max(8, solution.optimalMoves * 2.2 + solution.turnsCount * 0.8);
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
      this.placeMechanicTiles(best.level, preset, mechRng);
      // Re-validate: ensure level is still solvable after tile placement
      const postSolution = LevelSolver.solve(best.level);
      if (!postSolution.solvable) {
        // Strip tiles if they made the level unsolvable
        best.level.tiles = [];
      } else {
        // Update optimal moves with mechanic-aware solution
        best.level.optimalSolutionLength = postSolution.optimalMoves;
        best.level.parMoves = postSolution.optimalMoves;
        best.level.targetMoves = postSolution.optimalMoves;
      }
    }

    const bestCandidate = best.level;
    this.registeredFingerprints.add(this.computeCanonicalFingerprint(bestCandidate, best.solution));
    
    this.recentLevels.push(bestCandidate);
    if (this.recentLevels.length > 20) {
      this.recentLevels.shift();
    }

    return bestCandidate;
  }

  /**
   * Generate raw candidate level based on layout template
   */
  private static generateCandidate(
    id: number,
    preset: LevelPresetConfig,
    layout: LayoutStyle,
    rng: PRNG
  ): LevelData {
    const width = preset.gridWidth;
    const height = preset.gridHeight;
    const totalCells = width * height;
    const density = rng.floatRange(preset.wallDensityMin, preset.wallDensityMax);
    const targetWallsCount = Math.floor(totalCells * density);

    // Pick start and goal
    let start: Position;
    let goal: Position;

    // Place start and goal on edges or corners for interesting travel
    if (layout === 'SERPENTINE' || layout === 'ASYMMETRIC_MAZE') {
      start = { x: 0, y: 0 };
      goal = { x: width - 1, y: height - 1 };
    } else {
      const positions: Position[] = [];
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          positions.push({ x, y });
        }
      }
      start = rng.choice(positions);
      const minDistance = Math.max(3, Math.floor((width + height) * 0.55));
      const validGoals = positions.filter(
        p => Math.abs(p.x - start.x) + Math.abs(p.y - start.y) >= minDistance
      );
      goal = validGoals.length > 0 ? rng.choice(validGoals) : { x: width - 1, y: height - 1 };
    }

    const walls: Position[] = [];
    const occupied = new Set<string>([
      Grid.posKey(start),
      Grid.posKey(goal)
    ]);

    const addWall = (pos: Position) => {
      const key = Grid.posKey(pos);
      if (
        pos.x >= 0 &&
        pos.x < width &&
        pos.y >= 0 &&
        pos.y < height &&
        !occupied.has(key)
      ) {
        occupied.add(key);
        walls.push(pos);
      }
    };

    switch (layout) {
      case 'CHAMBERS': {
        // Divide grid with dividing walls with 1–2 gaps (doors)
        const midX = Math.floor(width / 2);
        const doorY = rng.range(0, height - 1);
        for (let y = 0; y < height; y++) {
          if (y !== doorY) addWall({ x: midX, y });
        }
        if (width >= 8) {
          const midY = Math.floor(height / 2);
          const doorX = rng.range(0, width - 1);
          for (let x = 0; x < width; x++) {
            if (x !== doorX && x !== midX) addWall({ x, y: midY });
          }
        }
        break;
      }

      case 'CENTRAL_PILLARS': {
        // Create island obstacle clusters
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const offsets = [
          { dx: 0, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 }
        ];
        for (const off of offsets) {
          if (rng.chance(0.8)) {
            addWall({ x: centerX + off.dx, y: centerY + off.dy });
          }
        }
        break;
      }

      case 'CORRIDORS': {
        // Alternating horizontal or vertical stripes with gaps
        const isHorizontal = rng.chance(0.5);
        const step = 2;
        if (isHorizontal) {
          for (let y = 1; y < height - 1; y += step) {
            const gap = rng.range(0, width - 1);
            for (let x = 0; x < width; x++) {
              if (x !== gap && x !== gap + 1) addWall({ x, y });
            }
          }
        } else {
          for (let x = 1; x < width - 1; x += step) {
            const gap = rng.range(0, height - 1);
            for (let y = 0; y < height; y++) {
              if (y !== gap && y !== gap + 1) addWall({ x, y });
            }
          }
        }
        break;
      }

      case 'SERPENTINE': {
        // S-curve guide walls
        for (let y = 1; y < height - 1; y += 2) {
          const fromLeft = (y / 2) % 2 === 0;
          const openX = fromLeft ? width - 1 : 0;
          for (let x = 0; x < width; x++) {
            if (x !== openX) addWall({ x, y });
          }
        }
        break;
      }

      case 'ASYMMETRIC_MAZE':
      default: {
        // Cluster-based obstacle generation
        const clusterCenters = Math.floor(targetWallsCount / 3);
        for (let c = 0; c < clusterCenters; c++) {
          const cx = rng.range(1, width - 2);
          const cy = rng.range(1, height - 2);
          addWall({ x: cx, y: cy });
          if (rng.chance(0.6)) addWall({ x: cx + 1, y: cy });
          if (rng.chance(0.6)) addWall({ x: cx, y: cy + 1 });
        }
        break;
      }
    }

    // Fill remaining walls up to target count randomly
    let scatterTries = 0;
    while (walls.length < targetWallsCount && scatterTries < targetWallsCount * 3) {
      scatterTries++;
      const wx = rng.range(0, width - 1);
      const wy = rng.range(0, height - 1);
      addWall({ x: wx, y: wy });
    }

    return {
      id,
      worldId: preset.worldId,
      name: `${preset.name} ${id}`,
      width,
      height,
      start,
      goal,
      walls,
      challenge: { ...preset.challenge }
    };
  }

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

    let compositeScore = lengthScore + densityScore + turnsScore + trapScore + branchingScore + depthScore;

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
    const usedPositions = new Set<string>();
    let placed = 0;
    const maxTiles = preset.maxMechanicTiles;

    // 60% chance to include any mechanics — keeps levels varied
    if (!rng.chance(0.6)) return;

    // Pick 1-2 mechanic types from allowed list, shuffled
    const availableTypes = rng.shuffle(preset.allowedMechanics);
    const numTypes = rng.range(1, Math.min(2, availableTypes.length));
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