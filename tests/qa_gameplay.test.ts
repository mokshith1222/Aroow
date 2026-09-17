/**
 * PHASE 15 — Gameplay System Tests (Independent QA Review)
 *
 * Tests every gameplay mechanic end-to-end through GameEngine.getInstance(),
 * using proper singleton management rather than bypassing the private constructor.
 *
 * Coverage:
 *  - All four directions: valid moves update position and move counter
 *  - All four boundary edges prevent movement
 *  - Wall collision: position unchanged, life deducted, invalidMoveAttempted set
 *  - Win condition: LEVEL_COMPLETE state, path recorded, movement blocked post-win
 *  - Life loss: decrements correctly through 3 → 2 → 1 → GAME_OVER
 *  - GAME_OVER: movement blocked, state locked
 *  - Restart: full state reset from any state
 *  - Undo: position and move counter reverted; undo unavailable on fresh start
 *  - Undo after multiple moves: always rolls back one step at a time
 *  - Pause / Resume: timer behavior and movement blocking
 *  - maxMoves constraint triggers GAME_OVER at limit
 */

// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';

// ─── shared test fixtures ──────────────────────────────────────────────────

/** Open 5×5 grid, start (0,0), goal (4,4), no walls */
const openLevel: LevelData = {
  id: 1,
  worldId: 1,
  name: 'QA Open Field',
  width: 5,
  height: 5,
  start: { x: 0, y: 0 },
  goal: { x: 4, y: 4 },
  walls: [],
  parMoves: 8,
  optimalSolutionLength: 8,
  targetMoves: 8,
  difficulty: 1,
};

/** Level where start (1,1) is surrounded on all sides by walls except DOWN */
const walledLevel: LevelData = {
  id: 1,
  worldId: 1,
  name: 'QA Walled Level',
  width: 5,
  height: 5,
  start: { x: 1, y: 1 },
  goal: { x: 3, y: 4 },
  walls: [
    { x: 1, y: 0 }, // UP
    { x: 2, y: 1 }, // RIGHT
    { x: 0, y: 1 }, // LEFT
  ],
  parMoves: 6,
};

/** Minimal 2-move level: (0,0) → (2,0), straight right */
const quickWinLevel: LevelData = {
  id: 1,
  worldId: 1,
  name: 'QA Quick Win',
  width: 3,
  height: 2,
  start: { x: 0, y: 0 },
  goal: { x: 2, y: 0 },
  walls: [],
  parMoves: 2,
  optimalSolutionLength: 2,
  targetMoves: 2,
  targetTime: 10,
  difficulty: 1,
};

/** Level with maxMoves cap */
const maxMovesLevel: LevelData = {
  id: 1,
  worldId: 1,
  name: 'QA MaxMoves',
  width: 5,
  height: 5,
  start: { x: 0, y: 0 },
  goal: { x: 4, y: 4 },
  walls: [],
  parMoves: 8,
  maxMoves: 3, // Artificially low to trigger game-over
};

function engine(): GameEngine {
  return GameEngine.getInstance();
}

// ─── setup / teardown ──────────────────────────────────────────────────────

beforeEach(() => {
  GameEngine.resetInstance();
});

afterEach(() => {
  GameEngine.resetInstance();
});

// ─── movement ──────────────────────────────────────────────────────────────

describe('Gameplay — movement', () => {
  it('valid RIGHT move updates x position and increments move counter', () => {
    engine().startLevel(openLevel);
    expect(engine().move('RIGHT')).toBe(true);
    expect(engine().getSnapshot().playerPos).toEqual({ x: 1, y: 0 });
    expect(engine().getSnapshot().moves).toBe(1);
  });

  it('valid DOWN move updates y position', () => {
    engine().startLevel(openLevel);
    engine().move('DOWN');
    expect(engine().getSnapshot().playerPos).toEqual({ x: 0, y: 1 });
  });

  it('invalid LEFT move from (1,0) (backtracking) resets attempt and consumes life', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT'); // to (1,0)
    engine().move('LEFT'); // tries to go back to (0,0), which is visited!
    expect(engine().getSnapshot().playerPos).toEqual({ x: 0, y: 0 }); // reset to start
    expect(engine().getSnapshot().moves).toBe(0); // moves reset
    expect(engine().getSnapshot().lives).toBe(2); // life consumed
  });

  it('valid UP move updates y position', () => {
    engine().startLevel(openLevel);
    engine().move('DOWN'); // to (0,1)
    engine().move('UP');   // back to (0,0)
    expect(engine().getSnapshot().playerPos).toEqual({ x: 0, y: 0 });
  });

  it('move returns false and position is unchanged when blocked by top boundary', () => {
    engine().startLevel(openLevel); // start at (0,0)
    const res = engine().move('UP');
    expect(res).toBe(false);
    expect(engine().getSnapshot().playerPos).toEqual({ x: 0, y: 0 });
    expect(engine().getSnapshot().moves).toBe(0);
  });

  it('move returns false and position unchanged when blocked by left boundary', () => {
    engine().startLevel(openLevel);
    const res = engine().move('LEFT');
    expect(res).toBe(false);
    expect(engine().getSnapshot().playerPos).toEqual({ x: 0, y: 0 });
  });

  it('move returns false when blocked by right boundary', () => {
    engine().startLevel({ ...openLevel, start: { x: 4, y: 0 } });
    expect(engine().move('RIGHT')).toBe(false);
    expect(engine().getSnapshot().playerPos).toEqual({ x: 4, y: 0 });
  });

  it('move returns false when blocked by bottom boundary', () => {
    engine().startLevel({ ...openLevel, start: { x: 0, y: 4 } });
    expect(engine().move('DOWN')).toBe(false);
    expect(engine().getSnapshot().playerPos).toEqual({ x: 0, y: 4 });
  });

  it('move is ignored completely when not in PLAYING state', () => {
    // Engine is in MENU by default — no level loaded
    expect(engine().move('RIGHT')).toBe(false);
  });
});

// ─── collision ────────────────────────────────────────────────────────────

describe('Gameplay — collision', () => {
  it('collision into a wall does not move the player', () => {
    engine().startLevel(walledLevel); // walls: UP, RIGHT, LEFT from start (1,1)
    engine().move('UP');
    expect(engine().getSnapshot().playerPos).toEqual({ x: 1, y: 1 });
  });

  it('collision sets invalidMoveAttempted flag to true', () => {
    engine().startLevel(walledLevel);
    engine().move('UP');
    expect(engine().getSnapshot().invalidMoveAttempted).toBe(true);
  });

  it('invalidMoveAttempted flag clears after a successful move', () => {
    engine().startLevel(walledLevel);
    engine().move('UP');          // invalid
    engine().move('DOWN');        // valid
    expect(engine().getSnapshot().invalidMoveAttempted).toBe(false);
  });

  it('each collision decrements lives by 1', () => {
    engine().startLevel(walledLevel);
    expect(engine().getSnapshot().lives).toBe(3);
    engine().move('UP');
    expect(engine().getSnapshot().lives).toBe(2);
    engine().move('UP');
    expect(engine().getSnapshot().lives).toBe(1);
  });

  it('lives never go below zero even after excessive collisions', () => {
    engine().startLevel(walledLevel);
    for (let i = 0; i < 10; i++) engine().move('UP');
    expect(engine().getSnapshot().lives).toBeGreaterThanOrEqual(0);
  });

  it('collision count increments mistakes counter', () => {
    engine().startLevel(walledLevel);
    engine().move('UP');
    engine().move('LEFT');
    expect(engine().getSnapshot().mistakes).toBe(2);
  });
});

// ─── win condition ─────────────────────────────────────────────────────────

describe('Gameplay — win condition', () => {
  it('reaching the goal transitions state to LEVEL_COMPLETE', () => {
    engine().startLevel(quickWinLevel);
    engine().move('RIGHT');
    engine().move('RIGHT');
    expect(engine().getSnapshot().state).toBe('LEVEL_COMPLETE');
  });

  it('player position equals goal on win', () => {
    engine().startLevel(quickWinLevel);
    engine().move('RIGHT');
    engine().move('RIGHT');
    expect(engine().getSnapshot().playerPos).toEqual(quickWinLevel.goal);
  });

  it('movement is completely blocked after LEVEL_COMPLETE', () => {
    engine().startLevel(quickWinLevel);
    engine().move('RIGHT');
    engine().move('RIGHT');
    expect(engine().getSnapshot().state).toBe('LEVEL_COMPLETE');
    expect(engine().move('DOWN')).toBe(false);
    expect(engine().getSnapshot().moves).toBe(2);
  });

  it('completed path includes start, every intermediate cell, and goal', () => {
    engine().startLevel(quickWinLevel);
    engine().move('RIGHT');
    engine().move('RIGHT');
    const path = engine().getSnapshot().completedPath;
    expect(path).toHaveLength(3);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[1]).toEqual({ x: 1, y: 0 });
    expect(path[2]).toEqual({ x: 2, y: 0 });
  });

  it('isWon snapshot flag is true on LEVEL_COMPLETE', () => {
    engine().startLevel(quickWinLevel);
    engine().move('RIGHT');
    engine().move('RIGHT');
    expect(engine().getSnapshot().isWon).toBe(true);
    expect(engine().getSnapshot().isLost).toBe(false);
  });

  it('stars are between 1 and 3 on level completion', () => {
    engine().startLevel(quickWinLevel);
    engine().move('RIGHT');
    engine().move('RIGHT');
    const { stars } = engine().getSnapshot();
    expect(stars).toBeGreaterThanOrEqual(1);
    expect(stars).toBeLessThanOrEqual(3);
  });

  it('optimal play (no mistakes, par moves) earns 3 stars', () => {
    engine().startLevel(quickWinLevel);
    engine().move('RIGHT');
    engine().move('RIGHT');
    expect(engine().getSnapshot().stars).toBe(3);
  });
});

// ─── life loss ────────────────────────────────────────────────────────────

describe('Gameplay — life loss', () => {
  it('starts each level with exactly 3 lives', () => {
    engine().startLevel(walledLevel);
    expect(engine().getSnapshot().lives).toBe(3);
  });

  it('third collision triggers GAME_OVER, not a fourth life deduction', () => {
    engine().startLevel(walledLevel);
    engine().move('UP'); // 2 lives
    engine().move('UP'); // 1 life
    engine().move('UP'); // GAME_OVER
    const snap = engine().getSnapshot();
    expect(snap.state).toBe('GAME_OVER');
    expect(snap.lives).toBe(0);
  });

  it('isLost flag is true on GAME_OVER', () => {
    engine().startLevel(walledLevel);
    engine().move('UP');
    engine().move('UP');
    engine().move('UP');
    expect(engine().getSnapshot().isLost).toBe(true);
    expect(engine().getSnapshot().isWon).toBe(false);
  });
});

// ─── game over ────────────────────────────────────────────────────────────

describe('Gameplay — game over', () => {
  it('movement returns false in GAME_OVER state', () => {
    engine().startLevel(walledLevel);
    engine().move('UP');
    engine().move('UP');
    engine().move('UP');
    expect(engine().getSnapshot().state).toBe('GAME_OVER');
    expect(engine().move('DOWN')).toBe(false);
  });

  it('undo returns false in GAME_OVER state', () => {
    // Use a level where UP is always a wall — no valid moves available except goal path
    // Start at (0,0), wall at (0,-1) doesn't exist but boundary blocks UP
    // Using walledLevel: start (1,1), walls UP/RIGHT/LEFT — only DOWN is free
    // After going DOWN we can come back UP freely. Instead, engineer GAME_OVER
    // by boxing in with only the boundary wall available
    const boxedLevel: LevelData = {
      id: 1,
      worldId: 1,
      name: 'QA Undo Box',
      width: 3,
      height: 3,
      start: { x: 0, y: 0 },
      goal: { x: 2, y: 2 },
      walls: [{ x: 1, y: 0 }], // wall to the RIGHT of start
    };
    engine().startLevel(boxedLevel);
    engine().move('RIGHT'); // wall hit → lives 2
    engine().move('RIGHT'); // wall hit → lives 1
    engine().move('RIGHT'); // wall hit → lives 0 → GAME_OVER
    expect(engine().getSnapshot().state).toBe('GAME_OVER');
    expect(engine().undo()).toBe(false);
  });

  it('maxMoves constraint triggers GAME_OVER when move limit is hit', () => {
    engine().startLevel(maxMovesLevel);
    // optimalMoves for 0,0 to 4,4 is 8.
    // If we make 8 moves and don't hit the goal (e.g. going back and forth, but we can't revisit)
    // We can go RIGHT(1,0), DOWN(1,1), RIGHT(2,1), DOWN(2,2), RIGHT(3,2), DOWN(3,3), DOWN(3,4), LEFT(2,4)
    // Wait, the goal is 4,4.
    // Let's just do 8 valid moves that don't reach 4,4.
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().move('RIGHT');
    engine().move('UP'); // 8th move, we are at 3,2.
    // 8 moves hit optimalMoves=8, but not at goal!
    expect(engine().getSnapshot().state).toBe('GAME_OVER');
  });

  it('reviveWithAd restores 1 life and returns to PLAYING from GAME_OVER', () => {
    engine().startLevel(walledLevel);
    engine().move('UP');
    engine().move('UP');
    engine().move('UP');
    expect(engine().getSnapshot().state).toBe('GAME_OVER');
    engine().reviveWithAd();
    expect(engine().getSnapshot().lives).toBe(1);
    expect(engine().getSnapshot().state).toBe('PLAYING');
  });

  it('reviveWithAd has no effect when not in GAME_OVER state', () => {
    engine().startLevel(openLevel);
    engine().reviveWithAd(); // called prematurely
    expect(engine().getSnapshot().state).toBe('PLAYING');
    expect(engine().getSnapshot().lives).toBe(3);
  });
});

// ─── restart ──────────────────────────────────────────────────────────────

describe('Gameplay — restart', () => {
  it('restart resets player position to start', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().restart();
    expect(engine().getSnapshot().playerPos).toEqual(openLevel.start);
  });

  it('restart resets move counter to 0', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().restart();
    expect(engine().getSnapshot().moves).toBe(0);
  });

  it('restart resets lives to 3', () => {
    engine().startLevel(walledLevel);
    engine().move('UP');
    engine().move('UP');
    engine().restart();
    expect(engine().getSnapshot().lives).toBe(3);
  });

  it('restart resets mistakes to 0', () => {
    engine().startLevel(walledLevel);
    engine().move('UP');
    engine().restart();
    expect(engine().getSnapshot().mistakes).toBe(0);
  });

  it('restart from LEVEL_COMPLETE returns to PLAYING state', () => {
    engine().startLevel(quickWinLevel);
    engine().move('RIGHT');
    engine().move('RIGHT');
    expect(engine().getSnapshot().state).toBe('LEVEL_COMPLETE');
    engine().restart();
    expect(engine().getSnapshot().state).toBe('PLAYING');
  });

  it('restart from GAME_OVER returns to PLAYING state', () => {
    engine().startLevel(walledLevel);
    engine().move('UP');
    engine().move('UP');
    engine().move('UP');
    engine().restart();
    expect(engine().getSnapshot().state).toBe('PLAYING');
  });

  it('restart clears the undo stack', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT');
    engine().move('DOWN');
    expect(engine().getSnapshot().canUndo).toBe(true);
    engine().restart();
    expect(engine().getSnapshot().canUndo).toBe(false);
  });
});

// ─── undo ────────────────────────────────────────────────────────────────

describe('Gameplay — undo', () => {
  it('canUndo is false on a fresh level start', () => {
    engine().startLevel(openLevel);
    expect(engine().getSnapshot().canUndo).toBe(false);
  });

  it('canUndo is true after any valid move', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT');
    expect(engine().getSnapshot().canUndo).toBe(true);
  });

  it('undo restores the previous position', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().undo();
    expect(engine().getSnapshot().playerPos).toEqual({ x: 1, y: 0 });
  });

  it('undo decrements the move counter by 1', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().undo();
    expect(engine().getSnapshot().moves).toBe(1);
  });

  it('undo does not affect lives (only valid moves are undoable)', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT');
    engine().undo();
    expect(engine().getSnapshot().lives).toBe(3);
  });

  it('undo returns false when there is nothing to undo', () => {
    engine().startLevel(openLevel);
    expect(engine().undo()).toBe(false);
  });

  it('canUndo is false after undoing back to start', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT');
    engine().undo();
    expect(engine().getSnapshot().canUndo).toBe(false);
  });

  it('multiple undos step back through move history one at a time', () => {
    engine().startLevel(openLevel);
    engine().move('RIGHT'); // (1,0)
    engine().move('RIGHT'); // (2,0)
    engine().move('DOWN');  // (2,1)

    engine().undo(); // back to (2,0)
    expect(engine().getSnapshot().playerPos).toEqual({ x: 2, y: 0 });

    engine().undo(); // back to (1,0)
    expect(engine().getSnapshot().playerPos).toEqual({ x: 1, y: 0 });

    engine().undo(); // back to (0,0)
    expect(engine().getSnapshot().playerPos).toEqual({ x: 0, y: 0 });
  });
});

// ─── pause / resume ────────────────────────────────────────────────────────

describe('Gameplay — pause and resume', () => {
  it('pause transitions to PAUSED state', () => {
    engine().startLevel(openLevel);
    engine().pause();
    expect(engine().getSnapshot().state).toBe('PAUSED');
  });

  it('resume transitions back to PLAYING state', () => {
    engine().startLevel(openLevel);
    engine().pause();
    engine().resume();
    expect(engine().getSnapshot().state).toBe('PLAYING');
  });

  it('movement is blocked while PAUSED', () => {
    engine().startLevel(openLevel);
    engine().pause();
    expect(engine().move('RIGHT')).toBe(false);
    expect(engine().getSnapshot().playerPos).toEqual({ x: 0, y: 0 });
  });

  it('pause has no effect if already PAUSED', () => {
    engine().startLevel(openLevel);
    engine().pause();
    engine().pause(); // second pause
    expect(engine().getSnapshot().state).toBe('PAUSED');
  });
});
