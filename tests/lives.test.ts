import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';

describe('Three-Chance / Lives System', () => {
  let engine: GameEngine;

  const testLevel: LevelData = {
    id: 1,
    worldId: 1,
    name: 'Lives Test Level',
    width: 3,
    height: 3,
    start: { x: 1, y: 1 },
    goal: { x: 2, y: 2 },
    walls: [{ x: 1, y: 0 }] // Wall UP
  };

  beforeEach(() => {
    engine = new GameEngine();
    engine.startLevel(testLevel); engine.startPlaying();
  });

  it('starts each level with exactly 3 lives', () => {
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(3);
    expect(snap.maxLives).toBe(3);
    expect(snap.mistakes).toBe(0);
  });

  it('decreases to 2 lives after the first mistake', () => {
    engine.move('UP'); // hits wall
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(2);
    expect(snap.mistakes).toBe(1);
    expect(snap.state).toBe('PLAYING');
  });

  it('decreases to 1 life after the second mistake', () => {
    engine.move('UP'); // 1st mistake
    engine.move('UP'); // 2nd mistake
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(1);
    expect(snap.mistakes).toBe(2);
    expect(snap.state).toBe('PLAYING');
  });

  it('triggers GAME_OVER after the third mistake and drops lives to 0', () => {
    engine.move('UP'); // 1st
    engine.move('UP'); // 2nd
    engine.move('UP'); // 3rd
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(0);
    expect(snap.mistakes).toBe(3);
    expect(snap.state).toBe('GAME_OVER');
  });

  it('never allows lives to become negative', () => {
    for (let i = 0; i < 6; i++) {
      engine.move('UP');
    }
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(0);
    expect(snap.lives).toBeGreaterThanOrEqual(0);
  });

  it('resets lives back to 3 upon restart', () => {
    engine.move('UP');
    engine.move('UP');
    expect(engine.getSnapshot().lives).toBe(1);

    engine.restart(); engine.startPlaying();
    expect(engine.getSnapshot().lives).toBe(3);
    expect(engine.getSnapshot().mistakes).toBe(0);
    expect(engine.getSnapshot().state).toBe('PLAYING');
  });

  it('resets lives back to 3 when starting a new level', () => {
    engine.move('UP');
    expect(engine.getSnapshot().lives).toBe(2);

    const level2: LevelData = { ...testLevel, id: 1 };
    engine.startLevel(level2); engine.startPlaying();
    expect(engine.getSnapshot().lives).toBe(3);
    expect(engine.getSnapshot().mistakes).toBe(0);
  });

  it('revives with 1 life after ad in GAME_OVER state', () => {
    engine.move('UP');
    engine.move('UP');
    engine.move('UP');
    expect(engine.getSnapshot().state).toBe('GAME_OVER');

    engine.reviveWithAd();
    const snap = engine.getSnapshot();
    expect(snap.lives).toBe(1);
    expect(snap.state).toBe('PLAYING');
  });
});

// ---------------------------------------------------------------------------
// Life-Based Star Rating Tests
// Spec: finalStars = min(normalStars, lifeLossStarCap, hintStarCap)
//   0 lives lost → cap 3 stars
//   1 life  lost → cap 2 stars
//   ≥2 lives lost → cap 1 star
// ---------------------------------------------------------------------------

describe('Life-Based Star Rating', () => {
  let starEngine: GameEngine;

  // A minimal straight-line level: START(0,0) → RIGHT → RIGHT → GOAL(2,0)
  // parMoves=2, optimalSolutionLength=2.
  // Wall at (0,1) lets us trigger a DOWN collision without disrupting the
  // solution path.
  const starLevel: LevelData = {
    id: 1,
    worldId: 1,
    name: 'Star Rating Test Level',
    width: 5,
    height: 3,
    start: { x: 0, y: 0 },
    goal: { x: 2, y: 0 },
    walls: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    parMoves: 2,
    targetMoves: 2,
    optimalSolutionLength: 2,
    difficulty: 1,
  };

  beforeEach(() => {
    GameEngine.resetInstance();
    starEngine = GameEngine.getInstance();
    starEngine._resetCooldownForTesting();
    starEngine.startLevel(starLevel);
    starEngine.startPlaying();
  });

  /** Helper: complete the level via the optimal path (RIGHT × 2). */
  function completeLevel() {
    starEngine.move('RIGHT');
    starEngine.move('RIGHT');
  }

  // ── Test A ─────────────────────────────────────────────────────────────────
  it('A: Complete without collision → 3 stars (no other penalty)', () => {
    completeLevel();
    const snap = starEngine.getSnapshot();
    expect(snap.state).toBe('LEVEL_COMPLETE');
    expect(snap.stars).toBe(3);
  });

  // ── Test B ─────────────────────────────────────────────────────────────────
  it('B: Crash once then complete → maximum 2 stars', () => {
    starEngine.move('DOWN'); // hits wall → 1 life lost
    completeLevel();
    const snap = starEngine.getSnapshot();
    expect(snap.state).toBe('LEVEL_COMPLETE');
    expect(snap.stars).toBeLessThanOrEqual(2);
    expect(snap.stars).toBeGreaterThanOrEqual(1);
  });

  // ── Test C ─────────────────────────────────────────────────────────────────
  it('C: Crash twice then complete → maximum 1 star', () => {
    starEngine.move('DOWN'); // 1st life lost
    starEngine.move('DOWN'); // 2nd life lost
    completeLevel();
    const snap = starEngine.getSnapshot();
    expect(snap.state).toBe('LEVEL_COMPLETE');
    expect(snap.stars).toBe(1);
  });

  // ── Test D ─────────────────────────────────────────────────────────────────
  it('D: Crash three times → Game Over, level not completed', () => {
    starEngine.move('DOWN'); // 1st
    starEngine.move('DOWN'); // 2nd
    starEngine.move('DOWN'); // 3rd → GAME_OVER
    const snap = starEngine.getSnapshot();
    expect(snap.state).toBe('GAME_OVER');
    expect(snap.isWon).toBe(false);
    expect(snap.isLost).toBe(true);
  });

  // ── Test E ─────────────────────────────────────────────────────────────────
  it('E: Crash once → Undo restores life-loss count → 3 stars on completion', () => {
    // RIGHT snaps livesLost=0 into undo stack
    starEngine.move('RIGHT');
    // DOWN crashes (livesLost becomes 1, but no new undo entry is added for failed moves)
    starEngine.move('DOWN');
    // Undo takes us back to (0,0) and restores livesLost=0
    starEngine.undo();
    // Now complete from start
    starEngine.move('RIGHT');
    starEngine.move('RIGHT');
    const snap = starEngine.getSnapshot();
    expect(snap.state).toBe('LEVEL_COMPLETE');
    // livesLost was restored to 0 by undo → no life-loss cap penalty
    expect(snap.stars).toBe(3);
  });

  // ── Test F ─────────────────────────────────────────────────────────────────
  it('F: Full Path hint (level 3) without deaths → existing 1-star cap still applies', () => {
    starEngine.requestHint(3);
    completeLevel();
    const snap = starEngine.getSnapshot();
    expect(snap.state).toBe('LEVEL_COMPLETE');
    expect(snap.stars).toBe(1);
  });

  // ── Test G ─────────────────────────────────────────────────────────────────
  it('G: Crash twice + Full Path hint → 1 star (most restrictive wins)', () => {
    starEngine.move('DOWN'); // 1st life lost
    starEngine.move('DOWN'); // 2nd life lost
    starEngine.requestHint(3);
    completeLevel();
    const snap = starEngine.getSnapshot();
    expect(snap.state).toBe('LEVEL_COMPLETE');
    expect(snap.stars).toBe(1);
  });

  // ── Test H ─────────────────────────────────────────────────────────────────
  it('H: Crash once + Next Few Steps hint → both caps at 2, result ≤2 stars', () => {
    starEngine.move('DOWN'); // 1 life lost → life cap = 2
    starEngine.requestHint(2); // hint cap = 2
    completeLevel();
    const snap = starEngine.getSnapshot();
    expect(snap.state).toBe('LEVEL_COMPLETE');
    expect(snap.stars).toBeLessThanOrEqual(2);
  });

  // ── Test I ─────────────────────────────────────────────────────────────────
  it('I: Live star preview reflects life-loss cap in real time', () => {
    // Initially no collisions → preview can be up to 3
    const snapBefore = starEngine.getSnapshot();
    expect(snapBefore.stars).toBeLessThanOrEqual(3);

    starEngine.move('DOWN'); // 1 life lost
    const snapAfter1 = starEngine.getSnapshot();
    expect(snapAfter1.stars).toBeLessThanOrEqual(2);

    starEngine.move('DOWN'); // 2nd life lost
    const snapAfter2 = starEngine.getSnapshot();
    expect(snapAfter2.stars).toBeLessThanOrEqual(1);
  });

  // ── Test J ─────────────────────────────────────────────────────────────────
  it('J: Restart resets livesLost so next attempt is unpenalised', () => {
    starEngine.move('DOWN'); // 1st life lost
    starEngine.move('DOWN'); // 2nd life lost → cap would be 1 star
    starEngine.restart();
    starEngine.startPlaying();
    completeLevel();
    const snap = starEngine.getSnapshot();
    expect(snap.state).toBe('LEVEL_COMPLETE');
    // livesLost reset to 0 on restart → should earn 3 stars
    expect(snap.stars).toBe(3);
  });
});
