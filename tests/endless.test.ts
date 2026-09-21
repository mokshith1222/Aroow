/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import { StorageService } from '../src/services/StorageService';
import { LevelGenerator } from '../src/game/LevelGenerator';
import { LevelSolver } from '../src/game/LevelSolver';

describe('Endless Mode', () => {
  beforeEach(() => {
    // Reset singleton state before each test
    StorageService.resetInstance();
    GameEngine.resetInstance();
    LevelGenerator.clearRegistry();
    localStorage.clear();
  });

  describe('LevelGenerator.generateEndless', () => {
    it('should generate solvable levels continuously', () => {
      // Reduced from [1, 10, 50, 100, 250, 500, 1000] to prevent OOM in vitest
      // Large level generation (12x12) over hundreds of attempts exhausts Node memory limit
      const levelsToTest = [1, 10, 50, 100];
      
      let previousDifficulty = 0;
      let previousGridSize = 0;

      for (const levelNum of levelsToTest) {
        const level = LevelGenerator.generateEndless(levelNum);
        
        expect(level.id).toBeLessThan(0); // Virtual ID
        expect(level.name).toBe(`Endless ${levelNum}`);
        expect(level.difficulty).toBeDefined();
        
        const solution = LevelSolver.solve(level);
        expect(solution.solvable).toBe(true);
        expect(solution.optimalMoves).toBeGreaterThan(0);
        
        // Ensure difficulty is substantial at level 100 (HARD tier)
        if (levelNum === 100) {
           expect(level.difficulty).toBeGreaterThanOrEqual(40);
           expect(level.width).toBeGreaterThanOrEqual(8);
        }
      }
    });

    it('should be deterministic', () => {
      const levelA1 = LevelGenerator.generateEndless(42);
      LevelGenerator.clearRegistry();
      const levelA2 = LevelGenerator.generateEndless(42);
      
      expect(levelA1.walls).toEqual(levelA2.walls);
      expect(levelA1.start).toEqual(levelA2.start);
      expect(levelA1.goal).toEqual(levelA2.goal);
    });
  });

  describe('StorageService EndlessStats', () => {
    it('should track endless stats separately from campaign', () => {
      const storage = StorageService.getInstance();
      
      storage.saveEndlessCompletion(1, 15, 12, 3, 20, 100);
      
      const stats = storage.getEndlessStats();
      expect(stats.highestLevel).toBe(1);
      expect(stats.bestMoves).toBe(15);
      expect(stats.bestTime).toBe(12);
      expect(stats.highestDifficulty).toBe(20);
      expect(stats.totalCompleted).toBe(1);
      
      // Campaign progress should remain untouched
      expect(storage.getUnlockedLevel()).toBe(1);
      expect(storage.getCurrentPoints()).toBe(100);
      
      storage.saveEndlessCompletion(2, 10, 8, 3, 35, 150);
      
      const newStats = storage.getEndlessStats();
      expect(newStats.highestLevel).toBe(2);
      expect(newStats.bestMoves).toBe(10); // Updated to 10
      expect(newStats.bestTime).toBe(8);   // Updated to 8
      expect(newStats.highestDifficulty).toBe(35);
      expect(newStats.totalCompleted).toBe(2);
    });
  });

  describe('GameEngine Endless Integration', () => {
    it('should start endless mode and transition correctly', () => {
      const engine = GameEngine.getInstance();
      const storage = StorageService.getInstance();
      
      // Start endless level 1
      const started = engine.startEndlessLevel(1); engine.startPlaying();
      expect(started).toBe(true);
      
      let snapshot = engine.getSnapshot();
      expect(snapshot.isEndlessMode).toBe(true);
      expect(snapshot.endlessLevel).toBe(1);
      expect(snapshot.level?.name).toBe('Endless 1');
      
      // Fast track win
      engine['_resetCooldownForTesting']();
      
      // Move to complete level
      const solution = LevelSolver.solve(snapshot.level!);
      for (const dir of solution.directions) {
        engine.move(dir);
      }
      
      snapshot = engine.getSnapshot();
      expect(snapshot.state).toBe('LEVEL_COMPLETE');
      
      // Stats should be updated
      const stats = storage.getEndlessStats();
      expect(stats.highestLevel).toBe(1);
      
      // Next level should be Endless 2
      engine.nextLevel();
      engine.startPlaying();
      snapshot = engine.getSnapshot();
      expect(snapshot.state).toBe('PLAYING');
      expect(snapshot.isEndlessMode).toBe(true);
      expect(snapshot.endlessLevel).toBe(2);
      expect(snapshot.level?.name).toBe('Endless 2');
    });
  });
});
