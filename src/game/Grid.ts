import type { Position, GateDef } from './types';

export class Grid {
  public readonly width: number;
  public readonly height: number;
  private wallSet: Set<string>;
  /** Current locked gate positions — starts as all gates, gates removed as keys collected */
  private gateSet: Set<string>;
  /** Key positions remaining to be collected */
  private keySet: Map<string, number>; // posKey -> keyIndex

  constructor(
    width: number,
    height: number,
    walls: Position[] = [],
    gates: GateDef[] = [],
    keys: Position[] = []
  ) {
    this.width = width;
    this.height = height;
    this.wallSet = new Set(walls.map(w => Grid.posKey(w)));
    this.gateSet = new Set(gates.map(g => Grid.posKey(g.pos)));
    this.keySet = new Map(keys.map((k, i) => [Grid.posKey(k), i]));
  }

  public static posKey(pos: Position): string {
    return `${pos.x},${pos.y}`;
  }

  public isInBounds(pos: Position): boolean {
    return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
  }

  public hasWall(pos: Position): boolean {
    return this.wallSet.has(Grid.posKey(pos));
  }

  /** Returns true if a locked gate blocks this cell */
  public hasGate(pos: Position): boolean {
    return this.gateSet.has(Grid.posKey(pos));
  }

  /** Returns the key index at this position, or -1 if none */
  public getKeyIndex(pos: Position): number {
    return this.keySet.get(Grid.posKey(pos)) ?? -1;
  }

  /** Returns true if there is an uncollected key at this position */
  public hasKey(pos: Position): boolean {
    return this.keySet.has(Grid.posKey(pos));
  }

  /**
   * Removes a key from the grid (after being collected) and opens
   * all gates associated with that key index.
   * Returns the keyIndex that was collected, or -1 if no key was here.
   */
  public collectKey(pos: Position, gates: GateDef[]): number {
    const key = Grid.posKey(pos);
    const idx = this.keySet.get(key);
    if (idx === undefined) return -1;
    this.keySet.delete(key);
    // Open all gates matching this key index
    for (const gate of gates) {
      if (gate.keyIndex === idx) {
        this.gateSet.delete(Grid.posKey(gate.pos));
      }
    }
    return idx;
  }

  /** Re-lock all gates and re-add all keys (used on restart/undo reset) */
  public resetMechanics(gates: GateDef[], keys: Position[]): void {
    this.gateSet = new Set(gates.map(g => Grid.posKey(g.pos)));
    this.keySet = new Map(keys.map((k, i) => [Grid.posKey(k), i]));
  }

  /** Restore a specific key snapshot (for undo) */
  public restoreGateState(_openGateKeys: Set<string>, remainingKeyPositions: Map<string, number>): void {
    this.keySet = new Map(remainingKeyPositions);
  }

  public isTraversable(pos: Position): boolean {
    return (
      this.isInBounds(pos) &&
      !this.hasWall(pos) &&
      !this.hasGate(pos)
    );
  }

  public getWalls(): Position[] {
    return Array.from(this.wallSet).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  }

  /** Returns all currently locked gate positions */
  public getActiveGates(): Position[] {
    return Array.from(this.gateSet).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  }
}