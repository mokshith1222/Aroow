import type { Position, Direction, MoveResult, TileMeta, GateDef } from './types';
import { Grid } from './Grid';
import { Collision } from './Collision';
import { MechanicResolver } from './MechanicResolver';

export class Movement {
  public static readonly VECTORS: Record<Direction, { dx: number; dy: number }> = {
    UP: { dx: 0, dy: -1 },
    DOWN: { dx: 0, dy: 1 },
    LEFT: { dx: -1, dy: 0 },
    RIGHT: { dx: 1, dy: 0 }
  };

  public static getOffset(direction: Direction): { dx: number; dy: number } {
    return this.VECTORS[direction];
  }

  public static calculateTarget(currentPos: Position, direction: Direction): Position {
    const { dx, dy } = this.getOffset(direction);
    return {
      x: currentPos.x + dx,
      y: currentPos.y + dy
    };
  }

  /**
   * Attempt a move, incorporating all active mechanics.
   *
   * @param currentPos     Current player position
   * @param direction      Intended direction
   * @param grid           The active grid (includes gate state)
   * @param goalPos        Goal position for win detection
   * @param visitedSet     Already-visited cell keys (no-revisit rule)
   * @param tiles          Special tile overlays (one-way, portal, ice)
   * @param gates          Gate definitions (for key interaction)
   */
  public static attemptMove(
    currentPos: Position,
    direction: Direction,
    grid: Grid,
    goalPos: Position,
    visitedSet: Set<string> = new Set(),
    tiles: TileMeta[] = [],
    gates: GateDef[] = []
  ): MoveResult {
    const resolver = new MechanicResolver(tiles);
    const targetPos = this.calculateTarget(currentPos, direction);

    // --- 1. Wall / out-of-bounds check ---
    const collision = Collision.check(targetPos, grid);
    if (collision.collides) {
      return this.failResult(currentPos, direction, {
        hitWall: collision.reason === 'WALL',
        outOfBounds: collision.reason === 'OUT_OF_BOUNDS',
      });
    }

    // --- 2. One-way tile check ---
    if (resolver.isOneWayBlock(targetPos, direction)) {
      return this.failResult(currentPos, direction, { hitWall: true });
    }

    // --- 3. No-revisit check (initial target only) ---
    const targetKey = Grid.posKey(targetPos);
    if (visitedSet.has(targetKey)) {
      return this.failResult(currentPos, direction, { hitVisitedCell: true });
    }

    // --- 4. Portal resolution ---
    console.log("Is my resolver?", (resolver as any).IS_MY_RESOLVER);
    const portalTarget = resolver.getPortalTarget(targetPos);
    console.log("Movement attemptMove portalTarget for", targetPos, "is", portalTarget);
    const effectivePos = portalTarget ?? targetPos;
    const teleported = portalTarget !== null;

    // After teleport, check if the landing cell was already visited
    if (teleported) {
      const landKey = Grid.posKey(effectivePos);
      if (visitedSet.has(landKey)) {
        return this.failResult(currentPos, direction, { hitVisitedCell: true });
      }
      if (!grid.isTraversable(effectivePos)) {
        return this.failResult(currentPos, direction, { hitWall: true });
      }
    }

    // --- 5. Ice slide resolution ---
    const slidePositions: Position[] = [];
    let finalPos = effectivePos;

    if (resolver.isIceTile(effectivePos)) {
      const extendedVisited = new Set(visitedSet);
      extendedVisited.add(Grid.posKey(currentPos));
      extendedVisited.add(Grid.posKey(effectivePos));

      const slides = resolver.resolveSlide(
        effectivePos,
        direction,
        (p) => grid.isTraversable(p),
        extendedVisited
      );

      if (slides.length > 0) {
        slidePositions.push(...slides);
        finalPos = slides[slides.length - 1];
      }
    }

    // --- 6. Key collection at final landing position ---
    const keyCollected = grid.getKeyIndex(finalPos);
    if (keyCollected >= 0) {
      grid.collectKey(finalPos, gates);
    }

    // --- 7. Win check ---
    const reachedGoal =
      finalPos.x === goalPos.x && finalPos.y === goalPos.y;

    return {
      success: true,
      previousPosition: { ...currentPos },
      newPosition: finalPos,
      direction,
      hitWall: false,
      outOfBounds: false,
      hitVisitedCell: false,
      reachedGoal,
      teleported,
      slidePositions,
      keyCollected,
    };
  }

  /** Builds a failed MoveResult with sensible defaults */
  private static failResult(
    pos: Position,
    direction: Direction,
    flags: Partial<Pick<MoveResult, 'hitWall' | 'outOfBounds' | 'hitVisitedCell'>>
  ): MoveResult {
    return {
      success: false,
      previousPosition: { ...pos },
      newPosition: { ...pos },
      direction,
      hitWall: flags.hitWall ?? false,
      outOfBounds: flags.outOfBounds ?? false,
      hitVisitedCell: flags.hitVisitedCell ?? false,
      reachedGoal: false,
      teleported: false,
      slidePositions: [],
      keyCollected: -1,
    };
  }
}