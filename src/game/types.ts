export const GAME_TYPES_VERSION = '1.1.0';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameStateType =
  | 'MENU'
  | 'LEVEL_SELECT'
  | 'LEVEL_START'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_COMPLETE'
  | 'GAME_OVER';

export interface Position {
  x: number;
  y: number;
}

export type CellType = 'EMPTY' | 'WALL' | 'START' | 'GOAL';

/**
 * Special tile overlays that modify movement and solver behavior.
 * ONE_WAY_* tiles block movement from the named direction (you can only move INTO them from the opposite direction).
 * PORTAL tiles teleport the player to the linked portal.
 * ICE tiles cause the player to slide until hitting a wall or the edge.
 */
export type TileType =
  | 'ONE_WAY_UP'    // Only passable moving UP (blocks DOWN entry)
  | 'ONE_WAY_DOWN'  // Only passable moving DOWN (blocks UP entry)
  | 'ONE_WAY_LEFT'  // Only passable moving LEFT (blocks RIGHT entry)
  | 'ONE_WAY_RIGHT' // Only passable moving RIGHT (blocks LEFT entry)
  | 'PORTAL'        // Teleports player to linked portal
  | 'ICE'           // Player slides until hitting a wall or non-ice cell
  | 'SPIKE_TRAP'    // Toggles between dangerous and safe on a timer
  | 'MOVING_SAW';   // Patrols back and forth and kills on contact

export interface TileMeta {
  pos: Position;
  type: TileType;
  /** For PORTAL tiles: the destination position. Both portals in a pair point to each other. */
  linkedPos?: Position;
  /** For ONE_WAY tiles: redundant since it's encoded in type, but useful for renderer queries. */
  allowedDirection?: Direction;
  
  // --- Hazard Properties ---
  /** For SPIKE_TRAP: How long the spikes are raised (dangerous) */
  activeIntervalMs?: number;
  /** For SPIKE_TRAP: How long the spikes are lowered (safe) */
  idleIntervalMs?: number;
  /** For SPIKE_TRAP: Time offset to create sequential patterns */
  timeOffsetMs?: number;
  
  /** For MOVING_SAW: Direction of patrol */
  axis?: 'HORIZONTAL' | 'VERTICAL';
  /** For MOVING_SAW: Speed in cells per second */
  speed?: number;
}

export interface RouteInfo {
  pos: Position;
  text: string;
  description: string;
  maxStars: number;
}

export interface ChallengePolicy {
  /** Number of collision/hazard failures allowed before game over. */
  maxLives: number;
  /** Whether the player can undo a successful move. */
  allowUndo: boolean;
  /** Maximum successful moves that can be undone in this level. */
  maxUndoUses?: number;
  /** Multiplier applied to moving-hazard cadence. */
  hazardSpeedMultiplier?: number;
  /** Multiplier applied to the solver-derived target time. */
  timeLimitMultiplier?: number;
  /** Whether hints reduce the maximum star rating. */
  hintsReduceMastery: boolean;
}

export interface LevelData {
  id: number;
  worldId: number;
  name: string;
  width: number;
  height: number;
  start: Position;
  goal: Position;
  walls: Position[];
  /** Special tile overlays (one-way, portal, ice). Applied on top of walls. */
  tiles?: TileMeta[];
  /** Key positions: collecting a key unlocks all gates of matching index. */
  keys?: Position[];
  /** Gate positions: impassable walls until the corresponding key is collected. */
  gates?: GateDef[];
  parMoves?: number;
  maxMoves?: number;
  timeLimit?: number;
  targetMoves?: number;
  targetTime?: number;
  difficulty?: number;        // 1–100 scale
  optimalSolutionLength?: number;  // BFS shortest path length
  /** Optional execution rules; omitted levels use the classic rules. */
  challenge?: ChallengePolicy;
  
  /** Route specific properties for Phase 3 */
  routes?: RouteInfo[];
  longRouteMinMoves?: number;
}

/** Defines a locked gate cell that becomes traversable when its key is collected */
export interface GateDef {
  pos: Position;
  /** Index into LevelData.keys[] — gate opens when key at this index is picked up */
  keyIndex: number;
}

export interface MoveResult {
  success: boolean;
  previousPosition: Position;
  newPosition: Position;
  direction: Direction;
  hitWall: boolean;
  outOfBounds: boolean;
  hitVisitedCell: boolean;
  reachedGoal: boolean;
  /** True if the move caused a portal teleport */
  teleported: boolean;
  /** Intermediate positions passed through during an ice slide (empty if no slide) */
  slidePositions: Position[];
  /** Index of the key collected this move (-1 if none) */
  keyCollected: number;
}

export interface UndoState {
  position: Position;
  moves: number;
  elapsedSeconds: number;
  /** Snapshot of collected key indices before this move */
  collectedKeys: number[];
  /** Snapshot of gate positions still locked before this move */
  activeGates: Position[];
}

export interface GameSnapshot {
  state: GameStateType;
  level: LevelData | null;
  playerPos: Position;
  moves: number;
  elapsedSeconds: number;
  canUndo: boolean;
  undosRemaining: number;
  isWon: boolean;
  isLost: boolean;
  lives: number;
  maxLives: number;
  parMoves: number;
  stars: number;
  optimalMoves?: number;
  invalidMoveAttempted: boolean;
  hitVisitedCell: boolean;
  completedPath: Position[];
  mistakes: number;
  hintsUsed: number;
  /** Max hint level used in this level (0 = none, 1 = cell, 2 = few, 3 = full) */
  hintsUsedLevel: 0 | 1 | 2 | 3;
  /** Positions to highlight as hints on the board */
  activeHintCells: Position[];
  /** Set of key indices currently collected by the player */
  collectedKeys: Set<number>;
  /** Gate positions still locked (not yet opened) */
  activeGates: Position[];
  /** Tile types present in this level (for UI to render mechanic icons) */
  activeMechanics: TileType[];
  /** Coordinate of the cell that blocked the last invalid move (for affected area feedback) */
  lastFailedTargetPos?: Position | null;
  /** Points earned for completing this level */
  pointsEarned?: number;
  /** Currently equipped cosmetic character id */
  equippedCharacter: string;
  /** Currently equipped cosmetic gate id */
  equippedGate: string;
  /** Currently equipped cosmetic theme id */
  equippedTheme: string;
  /** Currently equipped cosmetic background pattern id */
  equippedBackground: string;
  /** Currently equipped cosmetic touchpad id */
  equippedTouchpad: string;
  /** Theatrical gate animation sequence state on goal reach */
  gateAnimationState: 'idle' | 'activating' | 'entering' | 'completed';
  /** True if the current level is the daily puzzle */
  isDailyMode: boolean;
  justUnlockedStage?: boolean;
  /** Points awarded specifically for completing the daily puzzle */
  dailyBonusPoints?: number;
  /** True if the current level is endless mode */
  isEndlessMode?: boolean;
  /** Endless mode level number */
  endlessLevel?: number;
}
