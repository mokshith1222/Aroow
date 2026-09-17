import type { LevelData } from './types';
import { Grid } from './Grid';
import { LevelSolver, type SolverResult } from './LevelSolver';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  solution?: SolverResult;
}

export class LevelValidator {
  /**
   * Validates a level completely, checking geometry, start/goal placement,
   * wall boundaries, solvability, and non-triviality.
   */
  public static validate(level: LevelData): ValidationResult {
    const errors: string[] = [];

    // 1. Level dimensions
    if (level.width <= 1 || level.height <= 1) {
      errors.push(`Level dimensions (${level.width}x${level.height}) must be at least 2x2.`);
    }
    if (level.width > 50 || level.height > 50) {
      errors.push(`Level dimensions (${level.width}x${level.height}) exceed maximum allowed 50x50.`);
    }

    const grid = new Grid(level.width, level.height, level.walls);

    // 2. Start position
    if (!grid.isInBounds(level.start)) {
      errors.push(`Start position (${level.start.x}, ${level.start.y}) is outside grid boundaries.`);
    }
    if (grid.hasWall(level.start)) {
      errors.push('Start position cannot be on a wall.');
    }

    // 3. Goal position
    if (!grid.isInBounds(level.goal)) {
      errors.push(`Goal position (${level.goal.x}, ${level.goal.y}) is outside grid boundaries.`);
    }
    if (grid.hasWall(level.goal)) {
      errors.push('Goal position cannot be on a wall.');
    }

    // 4. Start & goal distinct
    if (level.start.x === level.goal.x && level.start.y === level.goal.y) {
      errors.push('Start and goal cannot be at the same location.');
    }

    // 5. Walls within bounds & unique
    const seenWalls = new Set<string>();
    for (const wall of level.walls) {
      if (!grid.isInBounds(wall)) {
        errors.push(`Wall at (${wall.x}, ${wall.y}) is outside grid bounds.`);
      }
      const key = Grid.posKey(wall);
      if (seenWalls.has(key)) {
        errors.push(`Duplicate wall definition at (${wall.x}, ${wall.y}).`);
      }
      seenWalls.add(key);
    }

    // 6. Solvability & Triviality check
    let solution: SolverResult | undefined;
    if (errors.length === 0) {
      solution = LevelSolver.solve(level);

      if (!solution.solvable) {
        errors.push('Level has no valid path from start to goal (impossible).');
      } else {
        if (solution.optimalMoves === 0) {
          errors.push('Level is trivial with 0 moves required.');
        }
        if (solution.shortestPathCount > 1) {
          // Soft-warning/rejection for multiple paths if desired
          // errors.push(`Level has ${solution.shortestPathCount} shortest paths. (Ideally 1)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      solution
    };
  }
}