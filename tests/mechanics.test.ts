import { describe, it, expect, beforeEach } from 'vitest';
import { Movement } from '../src/game/Movement';
import { Grid } from '../src/game/Grid';
import type { LevelData, TileMeta } from '../src/game/types';
import { LevelSolver } from '../src/game/LevelSolver';

// ─────────────────────────────────────────────
// Helper: minimal 5x5 open grid
// ─────────────────────────────────────────────
function openGrid(w = 5, h = 5): Grid {
  return new Grid(w, h, []);
}

describe('Mechanic — One-Way Tiles', () => {
  it('blocks movement in the forbidden direction', () => {
    const grid = openGrid();
    // Tile at (2,2): ONE_WAY_UP — only passable moving UP
    const tiles: TileMeta[] = [{ pos: { x: 2, y: 2 }, type: 'ONE_WAY_UP' }];

    // Moving DOWN into (2,2) is forbidden (we're going DOWN but tile only allows UP)
    const result = Movement.attemptMove(
      { x: 2, y: 1 }, 'DOWN', grid, { x: 4, y: 4 }, new Set(), tiles
    );
    expect(result.success).toBe(false);
    expect(result.hitWall).toBe(true);
  });

  it('allows movement in the allowed direction', () => {
    const grid = openGrid();
    const tiles: TileMeta[] = [{ pos: { x: 2, y: 2 }, type: 'ONE_WAY_UP' }];

    // Moving UP into (2,2) is allowed
    const result = Movement.attemptMove(
      { x: 2, y: 3 }, 'UP', grid, { x: 4, y: 4 }, new Set(), tiles
    );
    expect(result.success).toBe(true);
    expect(result.newPosition).toEqual({ x: 2, y: 2 });
  });

  it('ONE_WAY_RIGHT blocks LEFT entry', () => {
    const grid = openGrid();
    const tiles: TileMeta[] = [{ pos: { x: 3, y: 3 }, type: 'ONE_WAY_RIGHT' }];

    const blocked = Movement.attemptMove(
      { x: 4, y: 3 }, 'LEFT', grid, { x: 0, y: 0 }, new Set(), tiles
    );
    expect(blocked.success).toBe(false);

    const allowed = Movement.attemptMove(
      { x: 2, y: 3 }, 'RIGHT', grid, { x: 0, y: 0 }, new Set(), tiles
    );
    expect(allowed.success).toBe(true);
  });

  it('solver correctly navigates around one-way tiles', () => {
    const level: LevelData = {
      id: 9001,
      worldId: 3,
      name: 'One-Way Test',
      width: 4,
      height: 4,
      start: { x: 0, y: 3 },
      goal:  { x: 3, y: 0 },
      walls: [],
      tiles: [
        // Block the direct diagonal shortcut: at (1,2) only allow RIGHT
        { pos: { x: 1, y: 2 }, type: 'ONE_WAY_RIGHT' }
      ]
    };
    const solution = LevelSolver.solve(level);
    expect(solution.solvable).toBe(true);
    expect(solution.optimalMoves).toBeGreaterThan(0);
  });

  it('solver returns unsolvable if one-way tiles block ALL paths to goal', () => {
    // 3x3 grid: goal is only reachable from below (y=1→y=0), but block that direction
    const level: LevelData = {
      id: 9002,
      worldId: 3,
      name: 'Unsolvable One-Way',
      width: 3,
      height: 3,
      start: { x: 0, y: 2 },
      goal:  { x: 1, y: 0 },
      walls: [
        { x: 0, y: 0 }, { x: 2, y: 0 }, // wall left and right of goal
        { x: 0, y: 1 }, { x: 2, y: 1 }  // wall left and right of row 1
      ],
      tiles: [
        // The only approach to (1,0) is from (1,1) moving UP — block it
        { pos: { x: 1, y: 0 }, type: 'ONE_WAY_DOWN' } // only allow DOWN entry into goal
      ]
    };
    const solution = LevelSolver.solve(level);
    expect(solution.solvable).toBe(false);
  });
});

describe('Mechanic — Portal Tiles', () => {
  it('teleports player to linked portal position', () => {
    const grid = openGrid();
    const portalA = { x: 1, y: 1 };
    const portalB = { x: 4, y: 4 };
    const tiles: TileMeta[] = [
      { pos: portalA, type: 'PORTAL', linkedPos: portalB },
      { pos: portalB, type: 'PORTAL', linkedPos: portalA }
    ];

    // Move right into portal at (1,1) — should teleport to (4,4)
    const result = Movement.attemptMove(
      { x: 0, y: 1 }, 'RIGHT', grid, { x: 3, y: 3 }, new Set(), tiles
    );
    expect(result.success).toBe(true);
    expect(result.teleported).toBe(true);
    expect(result.newPosition).toEqual(portalB);
  });

  it('no-revisit rule applies to portal landing cell', () => {
    const grid = openGrid();
    const tiles: TileMeta[] = [
      { pos: { x: 1, y: 1 }, type: 'PORTAL', linkedPos: { x: 4, y: 4 } },
      { pos: { x: 4, y: 4 }, type: 'PORTAL', linkedPos: { x: 1, y: 1 } }
    ];
    // Mark portal destination as already visited
    const visited = new Set(['4,4']);

    const result = Movement.attemptMove(
      { x: 0, y: 1 }, 'RIGHT', grid, { x: 3, y: 3 }, visited, tiles
    );
    expect(result.success).toBe(false);
    expect(result.hitVisitedCell).toBe(true);
  });

  it('solver accounts for portal teleportation in path finding', () => {
    // 4x4: start at (0,0), goal at (3,3)
    // Walls block direct path — portals provide the shortcut
    const level: LevelData = {
      id: 9003,
      worldId: 4,
      name: 'Portal Test',
      width: 4,
      height: 4,
      start: { x: 0, y: 0 },
      goal:  { x: 3, y: 3 },
      walls: [
        // Column of walls blocking direct routes
        { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }
      ],
      tiles: [
        // Portal from (0,2) to (2,2): shortcut
        { pos: { x: 0, y: 2 }, type: 'PORTAL', linkedPos: { x: 2, y: 2 } },
        { pos: { x: 2, y: 2 }, type: 'PORTAL', linkedPos: { x: 0, y: 2 } }
      ]
    };
    const solution = LevelSolver.solve(level);
    expect(solution.solvable).toBe(true);
  });
});

describe('Mechanic — Ice / Sliding Tiles', () => {
  it('player slides past ice tiles until hitting wall', () => {
    // 6x1 corridor: ice at x=1,2,3; wall at x=4
    const grid = new Grid(6, 1, [{ x: 5, y: 0 }]);
    const tiles: TileMeta[] = [
      { pos: { x: 1, y: 0 }, type: 'ICE' },
      { pos: { x: 2, y: 0 }, type: 'ICE' },
      { pos: { x: 3, y: 0 }, type: 'ICE' }
    ];
    // Start at (0,0), move RIGHT → should slide to (4,0) — after ice stops at non-ice cell
    const result = Movement.attemptMove(
      { x: 0, y: 0 }, 'RIGHT', grid, { x: 4, y: 0 }, new Set(), tiles
    );
    expect(result.success).toBe(true);
    expect(result.slidePositions.length).toBeGreaterThan(0);
    // Final position should be past the ice strip
    expect(result.newPosition.x).toBe(4);
  });

  it('slide stops at visited cell boundary (no penalty, just stops)', () => {
    const grid = new Grid(6, 1, []);
    const tiles: TileMeta[] = [
      { pos: { x: 1, y: 0 }, type: 'ICE' },
      { pos: { x: 2, y: 0 }, type: 'ICE' }
    ];
    // Mark x=3 as visited — slide should stop at x=2 (last ice), not x=3
    const visited = new Set(['0,0', '3,0']);

    const result = Movement.attemptMove(
      { x: 0, y: 0 }, 'RIGHT', grid, { x: 5, y: 0 }, visited, tiles
    );
    expect(result.success).toBe(true);
    expect(result.newPosition.x).toBeLessThanOrEqual(2);
  });

  it('solver finds path through ice slide', () => {
    const level: LevelData = {
      id: 9004,
      worldId: 5,
      name: 'Ice Test',
      width: 5,
      height: 3,
      start: { x: 0, y: 1 },
      goal:  { x: 4, y: 1 },
      walls: [],
      tiles: [
        { pos: { x: 1, y: 1 }, type: 'ICE' },
        { pos: { x: 2, y: 1 }, type: 'ICE' },
        { pos: { x: 3, y: 1 }, type: 'ICE' }
      ]
    };
    const solution = LevelSolver.solve(level);
    expect(solution.solvable).toBe(true);
    // Should find it in fewer moves due to slide
    expect(solution.optimalMoves).toBeLessThanOrEqual(5);
  });
});

describe('Mechanic — Keys and Gates', () => {
  it('gate blocks movement until key is collected', () => {
    // 3x1: start(0,0), gate(1,0), goal(2,0)
    // The grid must be constructed WITH the gate so it is impassable
    const gates = [{ pos: { x: 1, y: 0 }, keyIndex: 0 }];
    const grid = new Grid(3, 1, [], gates, []);

    const result = Movement.attemptMove(
      { x: 0, y: 0 }, 'RIGHT', grid, { x: 2, y: 0 },
      new Set(), [], gates
    );
    expect(result.success).toBe(false);
  });

  it('collecting a key opens its corresponding gate', () => {
    const gates = [{ pos: { x: 2, y: 0 }, keyIndex: 0 }];
    const keys = [{ x: 1, y: 0 }];
    const grid = new Grid(4, 1, [], gates, keys);

    // Step 1: move into key position — this should collect the key AND open gate
    const result = Movement.attemptMove(
      { x: 0, y: 0 }, 'RIGHT', grid, { x: 3, y: 0 },
      new Set(), [], gates
    );
    expect(result.success).toBe(true);
    expect(result.keyCollected).toBe(0);

    // Step 2: gate should now be open — can pass through (2,0)
    expect(grid.hasGate({ x: 2, y: 0 })).toBe(false);
    const result2 = Movement.attemptMove(
      { x: 1, y: 0 }, 'RIGHT', grid, { x: 3, y: 0 },
      new Set(['0,0', '1,0']), [], gates
    );
    expect(result2.success).toBe(true);
  });

  it('solver navigates key-then-gate sequence', () => {
    // 5x1: start(0,0) → key(2,0) → gate(3,0) → goal(4,0)
    const level: LevelData = {
      id: 9005,
      worldId: 6,
      name: 'Keys Test',
      width: 5,
      height: 1,
      start: { x: 0, y: 0 },
      goal:  { x: 4, y: 0 },
      walls: [],
      keys: [{ x: 2, y: 0 }],
      gates: [{ pos: { x: 3, y: 0 }, keyIndex: 0 }]
    };
    const solution = LevelSolver.solve(level);
    expect(solution.solvable).toBe(true);
    // Must pick up key before reaching gate: minimum 4 moves (0→1→2→3→4)
    expect(solution.optimalMoves).toBe(4);
  });

  it('solver returns unsolvable when gate blocks goal and key is unreachable', () => {
    const level: LevelData = {
      id: 9006,
      worldId: 6,
      name: 'Impossible Keys Test',
      width: 3,
      height: 1,
      start: { x: 0, y: 0 },
      goal:  { x: 2, y: 0 },
      walls: [],
      // Gate at (1,0) blocks access to goal — key at (2,0) is unreachable without crossing gate
      keys: [{ x: 2, y: 0 }],
      gates: [{ pos: { x: 1, y: 0 }, keyIndex: 0 }]
    };
    const solution = LevelSolver.solve(level);
    expect(solution.solvable).toBe(false);
  });
});
