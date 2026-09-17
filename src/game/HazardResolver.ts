import type { TileMeta, Position, LevelData } from './types';

export class HazardResolver {
  /**
   * Returns true if a spike trap is currently active (spikes raised/dangerous)
   */
  public static isSpikeActive(tile: TileMeta, elapsedMs: number): boolean {
    if (tile.type !== 'SPIKE_TRAP') return false;
    
    const active = tile.activeIntervalMs ?? 1000;
    const idle = tile.idleIntervalMs ?? 1000;
    const offset = tile.timeOffsetMs ?? 0;
    
    const cycleTime = active + idle;
    const currentPhase = (elapsedMs + offset) % cycleTime;
    
    // Active phase is the first part of the cycle
    return currentPhase < active;
  }

  /**
   * Calculates the current position of a moving saw
   */
  public static getSawPosition(tile: TileMeta, elapsedMs: number, level: LevelData): Position {
    if (tile.type !== 'MOVING_SAW') return tile.pos;
    
    const speed = tile.speed ?? 2; // cells per second
    const axis = tile.axis ?? 'HORIZONTAL';
    const isHorizontal = axis === 'HORIZONTAL';
    
    // In a real implementation, we would pre-calculate the bounds by casting rays from the start pos.
    // For simplicity, we find the contiguous open track for the saw from its initial position.
    let minCoord = isHorizontal ? tile.pos.x : tile.pos.y;
    let maxCoord = minCoord;

    // Scan backwards
    let cur = { ...tile.pos };
    while (true) {
      const next = isHorizontal ? { x: cur.x - 1, y: cur.y } : { x: cur.x, y: cur.y - 1 };
      if (next.x < 0 || next.y < 0 || this.isWall(next, level)) break;
      minCoord = isHorizontal ? next.x : next.y;
      cur = next;
    }
    
    // Scan forwards
    cur = { ...tile.pos };
    while (true) {
      const next = isHorizontal ? { x: cur.x + 1, y: cur.y } : { x: cur.x, y: cur.y + 1 };
      if (next.x >= level.width || next.y >= level.height || this.isWall(next, level)) break;
      maxCoord = isHorizontal ? next.x : next.y;
      cur = next;
    }
    
    const trackLength = maxCoord - minCoord;
    if (trackLength <= 0) return tile.pos; // stuck
    
    // distance = speed (cells/s) * time (s)
    const distance = speed * (elapsedMs / 1000);
    const cycleLength = trackLength * 2;
    const currentCycleDist = distance % cycleLength;
    
    // Ping-pong math
    let currentOffset = 0;
    if (currentCycleDist <= trackLength) {
      currentOffset = currentCycleDist;
    } else {
      currentOffset = trackLength - (currentCycleDist - trackLength);
    }
    
    return isHorizontal 
      ? { x: minCoord + currentOffset, y: tile.pos.y }
      : { x: tile.pos.x, y: minCoord + currentOffset };
  }

  private static isWall(pos: Position, level: LevelData): boolean {
    return level.walls.some(w => w.x === pos.x && w.y === pos.y);
  }
}
