/**
 * HapticService
 * Delivers restrained, tactile feedback strictly where meaningful.
 * Respects browser/device support and handles vibration gracefully.
 */
export class HapticService {
  private static instance: HapticService;
  private enabled: boolean = true;

  private constructor() {}

  public static getInstance(): HapticService {
    if (!this.instance) {
      this.instance = new HapticService();
    }
    return this.instance;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  private canVibrate(): boolean {
    return (
      this.enabled &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    );
  }

  /**
   * Micro-tap for player movement
   */
  public light(): void {
    if (!this.canVibrate()) return;
    try {
      navigator.vibrate(8);
    } catch {
      // Fail silent
    }
  }

  /**
   * Quick tap for primary UI buttons
   */
  public button(): void {
    if (!this.canVibrate()) return;
    try {
      navigator.vibrate(6);
    } catch {
      // Fail silent
    }
  }

  /**
   * Soft thud when attempting to move into a wall or boundary
   */
  public invalid(): void {
    if (!this.canVibrate()) return;
    try {
      navigator.vibrate(16);
    } catch {
      // Fail silent
    }
  }

  /**
   * Double bump when a chance / life is lost
   */
  public lifeLost(): void {
    if (!this.canVibrate()) return;
    try {
      navigator.vibrate([24, 30, 28]);
    } catch {
      // Fail silent
    }
  }

  /**
   * Collision alias for backward compatibility
   */
  public collision(): void {
    this.lifeLost();
  }

  /**
   * Celebratory pattern on level completion
   */
  public win(): void {
    if (!this.canVibrate()) return;
    try {
      navigator.vibrate([20, 30, 35, 30, 50]);
    } catch {
      // Fail silent
    }
  }

  /**
   * Heavy double pulse on game over
   */
  public gameOver(): void {
    if (!this.canVibrate()) return;
    try {
      navigator.vibrate([40, 50, 45]);
    } catch {
      // Fail silent
    }
  }
}