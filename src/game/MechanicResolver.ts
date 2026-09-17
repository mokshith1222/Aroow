import type { Direction, Position, TileMeta, TileType } from './types';

/**
 * Maps a ONE_WAY tile type to the Direction it ALLOWS movement through.
 * ONE_WAY_UP means you can only pass through it while moving UP.
 * Trying to enter from the wrong direction (e.g. moving DOWN into ONE_WAY_UP) is blocked.
 */
export const ONE_WAY_DIRECTION: Partial<Record<TileType, Direction>> = {
  ONE_WAY_UP: 'UP',
  ONE_WAY_DOWN: 'DOWN',
  ONE_WAY_LEFT: 'LEFT',
  ONE_WAY_RIGHT: 'RIGHT',
};

export class MechanicResolver {
  private tiles: Map<string, TileMeta>;

  constructor(tiles: TileMeta[] = []) {
    this.tiles = new Map();
    for (const tile of tiles) {
      this.tiles.set(posKey(tile.pos), tile);
    }
  }

  private getTile(pos: Position): TileMeta | undefined {
    return this.tiles.get(posKey(pos));
  }

  /** Returns true if moving from `from` in `dir` is blocked by a one-way tile at `to`. */
  public isOneWayBlock(to: Position, dir: Direction): boolean {
    const tile = this.getTile(to);
    if (!tile) return false;
    const allowed = ONE_WAY_DIRECTION[tile.type];
    if (allowed === undefined) return false; // not a one-way tile
    return dir !== allowed;
  }

  /** If `pos` is a portal tile, returns its linked destination. Otherwise null. */
  public getPortalTarget(pos: Position): Position | null {
    const tile = this.getTile(pos);
    if (!tile || tile.type !== 'PORTAL' || !tile.linkedPos) return null;
    return tile.linkedPos;
  }

  /** Returns true if `pos` is an ice tile. */
  public isIceTile(pos: Position): boolean {
    const tile = this.getTile(pos);
    return tile?.type === 'ICE';
  }

  /** Returns the TileMeta at `pos`, or undefined if none. */
  public getMeta(pos: Position): TileMeta | undefined {
    return this.getTile(pos);
  }

  /**
   * Resolves an ice slide starting at `startPos` moving in `dir`.
   * Continues sliding until hitting a wall, going out of bounds, or
   * reaching a non-ice cell — or until hitting a visited cell (which
   * blocks movement and penalizes, but is handled by the caller).
   *
   * Returns the sequence of positions visited DURING the slide (not including startPos).
   * The last element is where the player ultimately lands.
   *
   * @param isTraversable - function checking if a grid cell can be entered
   * @param visitedKeys - keys of already-visited positions (slide stops before these)
   */
  public resolveSlide(
    startPos: Position,
    dir: Direction,
    isTraversable: (pos: Position) => boolean,
    visitedKeys: Set<string> = new Set()
  ): Position[] {
    const dx = DIR_OFFSET[dir].dx;
    const dy = DIR_OFFSET[dir].dy;

    const path: Position[] = [];
    let cur = startPos;

    // We can slide at most 50 cells (prevents infinite loops on pathological grids)
    for (let step = 0; step < 50; step++) {
      const next: Position = { x: cur.x + dx, y: cur.y + dy };
      if (!isTraversable(next)) break;               // wall / OOB stops slide
      if (visitedKeys.has(posKey(next))) break;       // visited cell stops slide (caller handles penalty)
      if (this.isOneWayBlock(next, dir)) break;       // one-way block stops slide

      path.push(next);
      cur = next;

      if (!this.isIceTile(next)) break;              // landed on non-ice — stop sliding
    }

    return path;
  }
}

function posKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

const DIR_OFFSET: Record<Direction, { dx: number; dy: number }> = {
  UP:    { dx: 0, dy: -1 },
  DOWN:  { dx: 0, dy:  1 },
  LEFT:  { dx: -1, dy: 0 },
  RIGHT: { dx:  1, dy: 0 },
};
