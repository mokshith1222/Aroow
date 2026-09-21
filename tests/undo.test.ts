import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';

// A simple open level to test movement and undo
const testLevel: LevelData = {
  id: 1,
  worldId: 1,
  name: 'Undo Test Level',
  width: 5,
  height: 5,
  start: { x: 1, y: 1 },
  goal: { x: 4, y: 4 },
  walls: [],
  parMoves: 5,
  challenge: {
    maxLives: 3,
    allowUndo: true,
    hintsReduceMastery: false,
  },
};

function engine(): GameEngine {
  return GameEngine.getInstance();
}

describe('Strict 3-Undo System', () => {
  beforeEach(() => {
    engine().startLevel(testLevel); engine().startPlaying(); engine().startPlaying();
  });

  it('Test 1: Start level -> Undo = 3', () => {
    expect(engine().getSnapshot().undosRemaining).toBe(3);
  });

  it('Test 2: Undo once -> Undo = 2', () => {
    engine().move('RIGHT');
    expect(engine().getSnapshot().canUndo).toBe(true);
    const success = engine().undo();
    expect(success).toBe(true);
    expect(engine().getSnapshot().undosRemaining).toBe(2);
  });

  it('Test 3: Undo three times -> Undo = 0', () => {
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().move('RIGHT');

    engine().undo();
    engine().undo();
    engine().undo();

    expect(engine().getSnapshot().undosRemaining).toBe(0);
    expect(engine().getSnapshot().canUndo).toBe(false);
  });

  it('Test 4: Try fourth Undo -> blocked', () => {
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().move('RIGHT');
    engine().move('DOWN');

    engine().undo();
    engine().undo();
    engine().undo();

    expect(engine().getSnapshot().undosRemaining).toBe(0);
    
    // Fourth undo should fail
    const success = engine().undo();
    expect(success).toBe(false);
    expect(engine().getSnapshot().undosRemaining).toBe(0);
  });

  it('Test 5 & 6: Watch rewarded ad -> Undo += 3', () => {
    engine().move('RIGHT');
    engine().move('DOWN');
    engine().move('RIGHT');
    engine().move('DOWN');

    engine().undo();
    engine().undo();
    engine().undo();
    
    expect(engine().getSnapshot().undosRemaining).toBe(0);
    
    // Simulate rewarded ad completion calling addUndos(3)
    engine().addUndos(3);
    
    expect(engine().getSnapshot().undosRemaining).toBe(3);
    expect(engine().getSnapshot().canUndo).toBe(true);

    // Can use them again
    engine().undo();
    expect(engine().getSnapshot().undosRemaining).toBe(2);
  });

  it('Test 8: Retry level -> Undo resets to 3', () => {
    engine().move('RIGHT');
    engine().undo();
    expect(engine().getSnapshot().undosRemaining).toBe(2);

    engine().restart(); engine().startPlaying(); engine().startPlaying(); // Retry
    expect(engine().getSnapshot().undosRemaining).toBe(3);
  });

  it('Test 9: Change level -> new level starts with 3', () => {
    engine().move('RIGHT');
    engine().undo();
    
    engine().startLevel({ ...testLevel, id: 1 }); engine().startPlaying(); engine().startPlaying();
    expect(engine().getSnapshot().undosRemaining).toBe(3);
  });
  
  it('Test 10: Rapidly click Undo -> never consume more than one credit per actual Undo', () => {
    engine().move('RIGHT'); // 1 valid move
    
    engine().undo(); // success
    engine().undo(); // should fail because no more moves in stack, undosRemaining shouldn't decrease
    engine().undo(); // should fail
    
    expect(engine().getSnapshot().undosRemaining).toBe(2);
  });
});
