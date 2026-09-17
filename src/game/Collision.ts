import type {  Position  } from './types';
import { Grid } from './Grid';

export type CollisionReason = 'NONE' | 'WALL' | 'OUT_OF_BOUNDS';

export interface CollisionCheckResult {
  collides: boolean;
  reason: CollisionReason;
}

export class Collision {
  public static check(targetPos: Position, grid: Grid): CollisionCheckResult {
    if (!grid.isInBounds(targetPos)) {
      return { collides: true, reason: 'OUT_OF_BOUNDS' };
    }

    if (grid.hasWall(targetPos)) {
      return { collides: true, reason: 'WALL' };
    }

    // Locked gates act as walls until the corresponding key is collected
    if (grid.hasGate(targetPos)) {
      return { collides: true, reason: 'WALL' };
    }

    return { collides: false, reason: 'NONE' };
  }

  public static canMoveTo(targetPos: Position, grid: Grid): boolean {
    return !this.check(targetPos, grid).collides;
  }
}