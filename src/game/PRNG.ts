/**
 * Seeded Pseudo-Random Number Generator (Mulberry32).
 * Fast, 32-bit state, high quality distribution, 100% deterministic.
 */
export class PRNG {
  private state: number;

  constructor(seed: number) {
    // Ensure 32-bit non-zero integer seed
    this.state = Math.floor(Math.abs(seed)) >>> 0;
    if (this.state === 0) this.state = 1;
    // Warm up the generator
    for (let i = 0; i < 5; i++) {
      this.next();
    }
  }

  /**
   * Returns a float in [0, 1)
   */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max] inclusive
   */
  public range(min: number, max: number): number {
    if (min >= max) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /**
   * Returns a float in [min, max)
   */
  public floatRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Pick one random element from an array
   */
  public choice<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return items[Math.floor(this.next() * items.length)];
  }

  /**
   * Deterministically shuffle an array (Fisher-Yates)
   */
  public shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Chance boolean with probability p in [0, 1]
   */
  public chance(p: number): boolean {
    return this.next() < p;
  }
}
