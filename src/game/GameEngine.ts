import type { 
  Direction,
  GameSnapshot,
  GameStateType,
  LevelData,
  MoveResult,
  Position,
  TileType,
  UndoState
 } from './types';
import { Grid } from './Grid';
import { Player } from './Player';
import { Movement } from './Movement';
import { GameState } from './GameState';
import { LevelLoader } from './LevelLoader';
import { LevelSolver } from './LevelSolver';
import { DifficultyManager } from './DifficultyManager';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';
import { StorageService } from '../services/StorageService';
import { AdService } from '../services/AdService';
import { AnalyticsService } from '../services/AnalyticsService';
import { EconomyService } from './EconomyService';
import { getPresetForLevelId } from './LevelGeneratorPresets';
import { LevelGenerator } from './LevelGenerator';
import { WorldManager } from '../data/worlds';
import { AchievementService } from '../services/AchievementService';
import { HazardResolver } from './HazardResolver';

export class GameEngine {
  private static instance: GameEngine;

  private stateMachine: GameState;
  private currentLevel: LevelData | null = null;
  private grid: Grid | null = null;
  private player: Player;
  private moves: number = 0;
  private elapsedSeconds: number = 0;
  private levelStartTime: number = 0;
  private lives: number = 3;
  private readonly MAX_LIVES = 3;
  private undosRemaining: number = 3;
  private timerInterval: number | null = null;
  private hazardInterval: number | null = null;
  private undoStack: UndoState[] = [];
  private path: Position[] = [];
  private mistakes: number = 0;
  private hintsUsed: number = 0;
  private hintsUsedLevel: 0 | 1 | 2 | 3 = 0;
  private activeHintCells: Position[] = [];
  private lastMoveResult: MoveResult | null = null;
  private lastFailedTargetPos: Position | null = null;
  private lastInvalidMoveTime: number = 0;
  // Disable cooldown during tests to allow synchronous rapid moves
  private readonly INVALID_MOVE_COOLDOWN_MS = import.meta.env?.MODE === 'test' ? 0 : 250;
  private invalidFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribers: Set<() => void> = new Set();
  private optimalMoves: number = 0;
  private lastPointsEarned: number = 0;
  private gateAnimationState: 'idle' | 'activating' | 'entering' | 'completed' = 'idle';
  private gateAnimTimers: Array<ReturnType<typeof setTimeout>> = [];

  private justUnlockedStage: boolean = false;
  
  // --- Mechanic state ---
  /** Set of key indices currently held by the player */
  private collectedKeys: Set<number> = new Set();
  
  // --- Modes ---
  private isDailyMode: boolean = false;
  private dailyBonusPoints: number = 0;
  private isEndlessMode: boolean = false;
  private endlessLevel: number = 1;

  private audio = AudioService.getInstance();
  private haptics = HapticService.getInstance();
  private storage = StorageService.getInstance();
  private analytics = AnalyticsService.getInstance();

  private constructor() {
    this.stateMachine = new GameState('MENU');
    this.player = new Player();
  }

  public static getInstance(): GameEngine {
    if (!this.instance) {
      this.instance = new GameEngine();
    }
    return this.instance;
  }

  /**
   * Resets the singleton for testing purposes.
   * Must not be used in production code.
   */
  public static resetInstance(): void {
    if (this.instance) {
      if (this.instance.timerInterval) {
        clearInterval(this.instance.timerInterval);
      }
      if (this.instance.invalidFeedbackTimer) {
        clearTimeout(this.instance.invalidFeedbackTimer);
      }
      this.instance.clearGateTimers();
      this.instance['stopTimer']();
      this.instance['stopHazardTimer']();
    }
    this.instance = undefined as any;
  }

  /** Test helper to bypass the 250ms anti-spam lockout on invalid moves */
  public _resetCooldownForTesting(): void {
    this.lastInvalidMoveTime = 0;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach(cb => cb());
  }

  public getState(): GameStateType {
    return this.stateMachine.get();
  }

  public getLevel(): LevelData | null {
    return this.currentLevel;
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getGrid(): Grid | null {
    return this.grid;
  }

  public getMoves(): number {
    return this.moves;
  }

  public getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  public getElapsedMs(): number {
    if (!this.stateMachine.isPlaying()) return 0;
    return Date.now() - this.levelStartTime;
  }

  public canUndo(): boolean {
    if (!this.stateMachine.isPlaying() || this.undoStack.length === 0) return false;
    const challenge = this.currentLevel?.challenge;
    if (challenge && !challenge.allowUndo) return false;
    return this.undosRemaining > 0;
  }

  /** Called after the user successfully completes a rewarded ad for more undos */
  public addUndos(count: number): void {
    this.undosRemaining += count;
    this.notify();
  }

  private getMaxLives(): number {
    return this.currentLevel?.challenge?.maxLives ?? this.MAX_LIVES;
  }

  public loadLevel(levelOrId: number | LevelData): boolean {
    const level = typeof levelOrId === 'number' ? LevelLoader.getLevel(levelOrId) : levelOrId;
    if (!level) {
      console.error(`[GameEngine] Level not found:`, levelOrId);
      return false;
    }

    this.isDailyMode = false;
    this.dailyBonusPoints = 0;
    this.isEndlessMode = false;

    this.currentLevel = level;
    this.grid = new Grid(
      level.width,
      level.height,
      level.walls,
      level.gates ?? [],
      level.keys ?? []
    );
    this.player.reset(level.start);
    this.lastPointsEarned = 0;
    this.moves = 0;
    this.lives = this.getMaxLives();
    this.undosRemaining = 3;
    this.elapsedSeconds = 0;
    this.levelStartTime = Date.now();
    this.undoStack = [];
    this.path = [{ ...level.start }];
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.hintsUsedLevel = 0;
    this.activeHintCells = [];
    this.lastMoveResult = null;
    this.lastFailedTargetPos = null;
    this.lastInvalidMoveTime = 0;
    if (this.invalidFeedbackTimer) {
      clearTimeout(this.invalidFeedbackTimer);
      this.invalidFeedbackTimer = null;
    }
    this.clearGateTimers();
    this.gateAnimationState = 'idle';
    this.collectedKeys = new Set();
    this.justUnlockedStage = false;

    // Calculate optimal moves via solver
    const solution = LevelSolver.solve(level);
    this.optimalMoves = solution.solvable ? solution.optimalMoves : (level.parMoves || 0);

    // Max moves is strictly the optimal solution
    if (this.currentLevel) {
      this.currentLevel.maxMoves = this.optimalMoves;
    }

    this.stopTimer();
    this.stopHazardTimer();
    return true;
  }

  public startLevel(levelOrId: number | LevelData): boolean {
    // Lock guard: prevent starting a level the player hasn't unlocked
    const levelId = typeof levelOrId === 'number' ? levelOrId : levelOrId.id;
    if (levelId > 0 && !this.storage.isLevelUnlocked(levelId)) {
      console.warn(`[GameEngine] Level ${levelId} is locked. Cannot start.`);
      return false;
    }
    if (!this.loadLevel(levelOrId)) return false;

    if (this.stateMachine.canTransitionTo('PLAYING') && this.stateMachine.transitionTo('PLAYING')) {
      if (this.currentLevel) {
        this.analytics.track('level_started', {
          levelId: this.currentLevel.id,
          worldId: this.currentLevel.worldId
        });
        
        // Asynchronously preload the next level to avoid blocking the main thread 
        LevelLoader.preloadLevelAsync(this.currentLevel.id + 1);
      }
      this.startTimer();
      this.startHazardTimer();
      this.notify();
      return true;
    }
    return false;
  }

  public startDailyLevel(dateStr: string): boolean {
    const seed = dateStr.split('-').reduce((acc, part) => acc * 31 + parseInt(part, 10), 0);
    // Use ID -1 for daily level, force 'MEDIUM' preset
    const level = LevelGenerator.generate(-1, 'MEDIUM', seed);
    
    if (!this.loadLevel(level)) return false;

    this.isDailyMode = true;
    if (this.currentLevel) {
      this.currentLevel.name = 'Daily Puzzle';
    }

    if (this.stateMachine.canTransitionTo('PLAYING') && this.stateMachine.transitionTo('PLAYING')) {
      this.analytics.track('daily_started', { date: dateStr });
      this.startTimer();
      this.startHazardTimer();
      this.notify();
      return true;
    }
    return false;
  }

  public startEndlessLevel(levelNumber?: number): boolean {
    const targetLevel = levelNumber ?? (this.storage.getEndlessHighestLevel() + 1);
    
    // Generate endless level
    const level = LevelGenerator.generateEndless(targetLevel);
    
    if (!this.loadLevel(level)) return false;

    this.isEndlessMode = true;
    this.endlessLevel = targetLevel;

    if (this.stateMachine.canTransitionTo('PLAYING') && this.stateMachine.transitionTo('PLAYING')) {
      this.analytics.track('endless_started', { endlessLevel: targetLevel });
      this.startTimer();
      this.startHazardTimer();
      this.notify();
      return true;
    }
    return false;
  }

  public restart(): void {
    if (!this.currentLevel) return;

    this.analytics.track('retry', {
      levelId: this.currentLevel.id,
      movesAtRetry: this.moves
    });

    this.player.reset(this.currentLevel.start);
    this.moves = 0;
    this.lives = this.getMaxLives();
    this.undosRemaining = 3;
    this.elapsedSeconds = 0;
    this.levelStartTime = Date.now();
    this.undoStack = [];
    this.path = [{ ...this.currentLevel.start }];
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.lastMoveResult = null;
    this.lastFailedTargetPos = null;
    this.lastInvalidMoveTime = 0;
    if (this.invalidFeedbackTimer) {
      clearTimeout(this.invalidFeedbackTimer);
      this.invalidFeedbackTimer = null;
    }
    this.clearGateTimers();
    this.gateAnimationState = 'idle';
    this.collectedKeys = new Set();

    // Reset grid mechanic state (re-lock all gates, restore all keys)
    this.grid?.resetMechanics(
      this.currentLevel.gates ?? [],
      this.currentLevel.keys ?? []
    );

    this.audio.playReset();
    this.haptics.light();

    if (this.stateMachine.canTransitionTo('PLAYING')) {
      this.stateMachine.transitionTo('PLAYING');
    }

    this.startTimer();
    this.startHazardTimer();
    this.notify();
  }

  public move(direction: Direction): boolean {
    if (!this.stateMachine.isPlaying() || !this.currentLevel || !this.grid || this.gateAnimationState !== 'idle') {
      return false;
    }

    const currentPos = this.player.getPosition();
    const visitedSet = new Set(this.path.map(p => Grid.posKey(p)));

    // Snapshot mechanic state BEFORE the move for undo
    const gatesBefore = this.grid.getActiveGates();
    const keysBefore = [...this.collectedKeys];

    const result = Movement.attemptMove(
      currentPos,
      direction,
      this.grid,
      this.currentLevel.goal,
      visitedSet,
      this.currentLevel.tiles ?? [],
      this.currentLevel.gates ?? []
    );

    this.lastMoveResult = result;

    if (!result.success) {
      const now = Date.now();
      const targetPos = Movement.calculateTarget(currentPos, direction);
      this.lastFailedTargetPos = targetPos;

      // Prevent accidental multi-life deductions from rapid/held inputs from a single action
      if (now - this.lastInvalidMoveTime < this.INVALID_MOVE_COOLDOWN_MS) {
        this.haptics.invalid();
        this.notify();
        return false;
      }
      this.lastInvalidMoveTime = now;

      // Auto-clear invalid feedback after 400ms
      if (this.invalidFeedbackTimer) {
        clearTimeout(this.invalidFeedbackTimer);
      }
      this.invalidFeedbackTimer = setTimeout(() => {
        this.lastFailedTargetPos = null;
        if (this.lastMoveResult && !this.lastMoveResult.success) {
          this.lastMoveResult = null;
        }
        this.notify();
      }, 400);

      // Invalid movement — lose exactly one life
      this.lives = Math.max(0, this.lives - 1);
      this.mistakes += 1;
      
      this.analytics.track('life_lost', {
        levelId: this.currentLevel.id,
        remainingLives: this.lives
      });

      if (this.lives === 0) {
        this.handleGameOver('out_of_lives');
      } else {
        this.audio.playLifeLost();
        this.haptics.lifeLost();

        // If the player hit a visited cell, reset the attempt entirely
        if (result.hitVisitedCell) {
          this.player.reset(this.currentLevel.start);
          this.moves = 0;
          this.undoStack = [];
          this.path = [{ ...this.currentLevel.start }];
          // Also reset all mechanic state on visited-cell reset
          this.collectedKeys = new Set();
          this.grid.resetMechanics(
            this.currentLevel.gates ?? [],
            this.currentLevel.keys ?? []
          );
        }

        this.notify();
      }
      return false;
    }

    // Valid movement — clear any lingering invalid feedback or hints
    if (this.invalidFeedbackTimer) {
      clearTimeout(this.invalidFeedbackTimer);
      this.invalidFeedbackTimer = null;
    }
    this.lastFailedTargetPos = null;
    if (this.activeHintCells.length > 0) {
      this.activeHintCells = [];
    }

    // Valid movement — save undo snapshot BEFORE applying state changes
    this.undoStack.push({
      position: currentPos,
      moves: this.moves,
      elapsedSeconds: this.elapsedSeconds,
      collectedKeys: keysBefore,
      activeGates: gatesBefore
    });

    // Apply position (final pos after slide/portal)
    this.player.setPosition(result.newPosition);
    this.player.setDirection(direction);

    // Record all visited cells (including slide intermediates)
    for (const slidePos of result.slidePositions) {
      this.path.push({ ...slidePos });
    }
    // Ensure the initial step is always recorded
    if (result.slidePositions.length === 0 || 
        !this.path.some(p => p.x === result.newPosition.x && p.y === result.newPosition.y)) {
      this.path.push({ ...result.newPosition });
    }

    this.moves += 1;

    // Key collected
    if (result.keyCollected >= 0) {
      this.collectedKeys.add(result.keyCollected);
      this.audio.playMove(); // TODO: play key pickup sound when audio service supports it
    }

    this.audio.playMove();
    this.haptics.light();

    // Check win condition
    if (result.reachedGoal) {
      this.handleGoalReached();
      return true;
    }

    // Check optional maxMoves constraint
    if (this.currentLevel.maxMoves && this.moves >= this.currentLevel.maxMoves) {
      this.handleGameOver('max_moves');
      return true;
    }

    this.notify();
    return true;
  }

  public undo(): boolean {
    if (!this.canUndo()) return false;

    const previous = this.undoStack.pop();
    if (!previous) return false;
    this.undosRemaining -= 1;

    this.player.setPosition(previous.position);
    this.moves = previous.moves;

    // Remove last path entries back to the previous position
    if (this.path.length > 1) {
      this.path.pop();
      // If there were slide positions, pop them too
      while (
        this.path.length > 1 &&
        Grid.posKey(this.path[this.path.length - 1]) !== Grid.posKey(previous.position)
      ) {
        this.path.pop();
      }
    }

    this.clearGateTimers();
    this.gateAnimationState = 'idle';

    // Restore mechanic state
    this.collectedKeys = new Set(previous.collectedKeys);
    // Restore gate state: re-lock all gates, then re-unlock those that were open
    if (this.currentLevel) {
      this.grid?.resetMechanics(
        this.currentLevel.gates ?? [],
        this.currentLevel.keys ?? []
      );
      // Re-collect keys that were already held before this move
      for (const keyIdx of previous.collectedKeys) {
        const keyPos = this.currentLevel.keys?.[keyIdx];
        if (keyPos) {
          this.grid?.collectKey(keyPos, this.currentLevel.gates ?? []);
        }
      }
    }

    this.lastMoveResult = null;

    this.audio.playUndo();
    this.haptics.light();
    this.notify();
    return true;
  }

  public pause(): boolean {
    if (this.stateMachine.isPlaying()) {
      if (this.stateMachine.transitionTo('PAUSED')) {
        this.stopTimer();
        this.notify();
        return true;
      }
    }
    return false;
  }

  public resume(): boolean {
    if (this.stateMachine.is('PAUSED')) {
      if (this.stateMachine.transitionTo('PLAYING')) {
        this.startTimer();
        this.notify();
        return true;
      }
    }
    return false;
  }

  public reviveWithAd(): boolean {
    if (this.stateMachine.is('GAME_OVER')) {
      this.lives = 1;
      this.lastFailedTargetPos = null;
      this.lastMoveResult = null;
      
      // Give temporary immunity so they don't instantly die to a hazard
      this.lastInvalidMoveTime = Date.now();

      // Ensure they have at least 15 seconds remaining if there is a time limit
      if (this.currentLevel?.timeLimit) {
        this.elapsedSeconds = Math.min(this.elapsedSeconds, Math.max(0, this.currentLevel.timeLimit - 15));
      }

      // (Extra undo hack removed to enforce strict undo limits)

      this.stateMachine.transitionTo('PLAYING');
      this.startTimer();
      // Also restart hazard timer so they can be hit again after immunity expires
      this.startHazardTimer();
      this.notify();
      return true;
    }
    return false;
  }

  public goToMenu(): void {
    this.stopTimer();
    if (this.stateMachine.transitionTo('MENU')) {
      this.notify();
    }
  }

  public goToLevelSelect(): void {
    this.stopTimer();
    if (this.stateMachine.transitionTo('LEVEL_SELECT')) {
      this.notify();
    }
  }

  public nextLevel(): boolean {
    if (!this.currentLevel) return false;
    if (this.isEndlessMode) {
      return this.startEndlessLevel(this.endlessLevel + 1);
    }
    const nextLvl = LevelLoader.getNextLevel(this.currentLevel.id);
    if (nextLvl && this.storage.isLevelUnlocked(nextLvl.id)) {
      return this.startLevel(nextLvl.id);
    } else {
      this.goToLevelSelect();
      return false;
    }
  }

  /**
   * Calculates and sets the cells to highlight for the chosen hint level.
   * level 1: next cell
   * level 2: next few cells (up to 3)
   * level 3: full solution path
   */
  public requestHint(level: 1 | 2 | 3): void {
    if (!this.currentLevel || !this.stateMachine.isPlaying()) return;

    this.analytics.track('hint_used', { levelId: this.currentLevel.id, hintLevel: level });
    this.hintsUsed += 1;
    if (level > this.hintsUsedLevel) {
      this.hintsUsedLevel = level;
    }

    let keysHeldMask = 0;
    this.collectedKeys.forEach(k => { keysHeldMask |= (1 << k); });

    const optimalPath = LevelSolver.getOptimalPath(this.currentLevel, this.player.getPosition(), keysHeldMask);
    
    // optimalPath includes the starting position at index 0.
    if (optimalPath.length > 1) {
      if (level === 1) {
        this.activeHintCells = [optimalPath[1]];
      } else if (level === 2) {
        this.activeHintCells = optimalPath.slice(1, 4);
      } else if (level === 3) {
        this.activeHintCells = optimalPath.slice(1);
      }
    }
    
    this.notify();
  }

  public getHint(level: 1 | 2 | 3 = 1): void {
    this.requestHint(level);
  }

  private clearGateTimers(): void {
    for (const timer of this.gateAnimTimers) {
      clearTimeout(timer);
    }
    this.gateAnimTimers = [];
  }

  private handleGoalReached(): void {
    this.stopTimer();
    this.audio.playWin();
    this.haptics.win();

    // In unit testing environments, run synchronously
    if (import.meta.env?.MODE === 'test') {
      this.gateAnimationState = 'completed';
      this.handleWin();
      return;
    }

    // 1. Gate activates
    this.gateAnimationState = 'activating';
    this.notify();

    // 2. Gate animation plays & 3. Player enters/reaches the gate
    const t1 = setTimeout(() => {
      this.gateAnimationState = 'entering';
      this.notify();
    }, 200);

    // 4. Completion effect triggers
    const t2 = setTimeout(() => {
      this.gateAnimationState = 'completed';
      this.haptics.button();
      this.notify();
    }, 450);

    // 5. Level complete screen appears
    const t3 = setTimeout(() => {
      this.handleWin();
    }, 750);

    this.gateAnimTimers.push(t1, t2, t3);
  }

  private handleWin(): void {
    this.stopTimer();
    this.clearGateTimers();
    if (!this.currentLevel) return;

    if (this.levelStartTime > 0) {
      this.elapsedSeconds = Math.max(0.1, Number(((Date.now() - this.levelStartTime) / 1000).toFixed(1)));
    }

    const par = this.currentLevel.parMoves || this.optimalMoves || this.moves;
    let stars = DifficultyManager.calculateStars(
      this.moves,
      par,
      this.mistakes,
      this.elapsedSeconds,
      this.currentLevel
    );

    const preset = getPresetForLevelId(this.currentLevel.id);
    const rewardBreakdown = EconomyService.calculateReward(preset.name, {
      moves: this.moves,
      optimalMoves: this.optimalMoves,
      livesRemaining: this.lives,
      timeSeconds: this.elapsedSeconds,
      targetTime: this.currentLevel.targetTime,
      hintsUsed: this.hintsUsed
    });

    let totalPoints = rewardBreakdown.totalPoints;

    // Apply Hint Penalties
    if (this.hintsUsedLevel === 1) {
      totalPoints = Math.floor(totalPoints * 0.90);
      stars = Math.min(stars, 3);
    } else if (this.hintsUsedLevel === 2) {
      totalPoints = Math.floor(totalPoints * 0.75);
      stars = Math.min(stars, 2);
    } else if (this.hintsUsedLevel === 3) {
      totalPoints = Math.floor(totalPoints * 0.50);
      stars = Math.min(stars, 1);
    }

    if (this.isDailyMode) {
      const today = new Date().toISOString().split('T')[0];
      if (this.storage.getDailyCompletedDate() !== today) {
        this.dailyBonusPoints = 500;
        totalPoints += this.dailyBonusPoints;
        this.storage.addPoints(this.dailyBonusPoints, 'DAILY_BONUS');
        this.storage.setDailyCompleted(today);
      }
    }

    this.lastPointsEarned = totalPoints;

    if (this.isEndlessMode) {
      this.storage.saveEndlessCompletion(
        this.endlessLevel,
        this.moves,
        this.elapsedSeconds,
        stars,
        this.currentLevel.difficulty || preset.minDifficultyScore,
        rewardBreakdown.totalPoints
      );
    } else {
      // Track unlock status BEFORE saving
      const currentWorld = WorldManager.getWorldForLevel(this.currentLevel.id);
      const nextWorld = WorldManager.getWorld(currentWorld.id + 1);
      let wasNextWorldUnlocked = false;
      if (nextWorld) {
        wasNextWorldUnlocked = WorldManager.isWorldUnlocked(nextWorld.id, this.storage.getAllLevelRecords());
      }

      this.storage.saveLevelCompletion(
        this.currentLevel.id,
        this.moves,
        this.elapsedSeconds,
        stars,
        rewardBreakdown.totalPoints // We just pass the base level completion points to the record
      );

      // Track unlock status AFTER saving
      if (nextWorld && !wasNextWorldUnlocked) {
        const isNextWorldUnlockedNow = WorldManager.isWorldUnlocked(nextWorld.id, this.storage.getAllLevelRecords());
        this.justUnlockedStage = isNextWorldUnlockedNow;
      }
    }

    // Evaluate achievements
    AchievementService.getInstance().checkLevelWin({
      levelId: this.currentLevel.id,
      moves: this.moves,
      elapsedSeconds: this.elapsedSeconds,
      stars,
      livesRemaining: this.lives,
      maxLives: this.getMaxLives(),
      hintsUsed: this.hintsUsed,
      targetTime: this.currentLevel.targetTime,
      isDailyMode: this.isDailyMode
    });

    this.audio.playWin();
    this.haptics.win();
    AdService.getInstance().recordLevelCompleted();

    this.analytics.track('level_completed', {
      levelId: this.currentLevel.id,
      worldId: this.currentLevel.worldId,
      moves: this.moves,
      elapsedSeconds: this.elapsedSeconds,
      stars,
      livesRemaining: this.lives,
      pointsEarned: totalPoints,
      isDailyMode: this.isDailyMode
    });

    if (this.currentLevel.id === 3) {
      this.analytics.track('tutorial_complete', { levelId: 3 });
    }

    const world = WorldManager.getWorldForLevel(this.currentLevel.id);
    if (world && this.currentLevel.id === world.endLevel) {
      const nextWorld = WorldManager.getWorld(world.id + 1);
      if (nextWorld) {
        this.analytics.track('world_unlocked', {
          worldId: nextWorld.id,
          worldName: nextWorld.name
        });
      }
    }

    if (this.stateMachine.transitionTo('LEVEL_COMPLETE')) {
      this.notify();
    }
  }

  private handleGameOver(reason: 'out_of_lives' | 'time_limit' | 'max_moves' = 'out_of_lives'): void {
    this.stopTimer();
    this.audio.playGameOver();
    this.haptics.gameOver();

    this.analytics.track('level_failed', {
      levelId: this.currentLevel?.id,
      worldId: this.currentLevel?.worldId,
      moves: this.moves,
      reason
    });

    if (this.stateMachine.transitionTo('GAME_OVER')) {
      this.notify();
    }
  }

  private startTimer(): void {
    this.stopTimer();
    if (typeof window === 'undefined') return;

    this.levelStartTime = Date.now() - Math.floor(this.elapsedSeconds * 1000);

    this.timerInterval = window.setInterval(() => {
      if (this.stateMachine.isPlaying()) {
        this.elapsedSeconds = Math.floor((Date.now() - this.levelStartTime) / 1000);

        // Check timeLimit if set
        if (
          this.currentLevel?.timeLimit &&
          this.elapsedSeconds >= this.currentLevel.timeLimit
        ) {
          this.handleGameOver('time_limit');
          return;
        }

        this.notify();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startHazardTimer(): void {
    this.stopHazardTimer();
    if (typeof window === 'undefined') return;

    this.hazardInterval = window.setInterval(() => {
      if (!this.stateMachine.isPlaying() || !this.currentLevel) return;

      const elapsedMs = Date.now() - this.levelStartTime;
      const playerPos = this.player.getPosition();
      let hitHazard = false;

      // Check all hazards in the level against current player position
      for (const tile of this.currentLevel.tiles ?? []) {
        if (tile.type === 'SPIKE_TRAP') {
          if (tile.pos.x === playerPos.x && tile.pos.y === playerPos.y) {
            if (HazardResolver.isSpikeActive(tile, elapsedMs)) {
              hitHazard = true;
              break;
            }
          }
        } else if (tile.type === 'MOVING_SAW') {
          const sawPos = HazardResolver.getSawPosition(tile, elapsedMs, this.currentLevel);
          // Check collision with bounding box (a tile is 1x1, check if centers are close)
          const dx = Math.abs(sawPos.x - playerPos.x);
          const dy = Math.abs(sawPos.y - playerPos.y);
          // If saw is visually touching the player cell (distance < 0.75 for example)
          if (dx < 0.75 && dy < 0.75) {
            hitHazard = true;
            break;
          }
        }
      }

      if (hitHazard) {
        this.triggerHazardDeath();
      }
    }, 50); // High frequency check for smooth response
  }

  private stopHazardTimer(): void {
    if (this.hazardInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.hazardInterval);
      this.hazardInterval = null;
    }
  }

  private triggerHazardDeath(): void {
    if (!this.currentLevel || !this.grid) return;
    
    // Prevent accidental multi-life deductions
    const now = Date.now();
    if (now - this.lastInvalidMoveTime < this.INVALID_MOVE_COOLDOWN_MS) {
      return;
    }
    this.lastInvalidMoveTime = now;

    this.lives = Math.max(0, this.lives - 1);
    this.mistakes += 1;
    
    this.analytics.track('hazard_death', {
      levelId: this.currentLevel.id,
      remainingLives: this.lives
    });

    if (this.lives === 0) {
      this.handleGameOver('out_of_lives');
    } else {
      this.audio.playLifeLost();
      this.haptics.lifeLost();

      // Reset to level start position
      this.player.reset(this.currentLevel.start);
      this.moves = 0;
      this.undoStack = [];
      this.path = [{ ...this.currentLevel.start }];
      
      this.collectedKeys = new Set();
      this.grid.resetMechanics(
        this.currentLevel.gates ?? [],
        this.currentLevel.keys ?? []
      );
      this.notify();
    }
  }

  public getSnapshot(): GameSnapshot {
    const par = this.currentLevel?.parMoves || this.optimalMoves || 0;
    const stars = this.currentLevel
      ? DifficultyManager.calculateStars(
          this.moves,
          par,
          this.mistakes,
          this.elapsedSeconds,
          this.currentLevel
        )
      : 0;

    // Collect unique mechanic types present in this level
    const activeMechanics: TileType[] = [];
    if (this.currentLevel) {
      const seen = new Set<TileType>();
      for (const tile of this.currentLevel.tiles ?? []) {
        if (!seen.has(tile.type)) {
          seen.add(tile.type);
          activeMechanics.push(tile.type);
        }
      }
      if ((this.currentLevel.keys?.length ?? 0) > 0) activeMechanics.push('ICE'); // placeholder label
    }

    return {
      state: this.stateMachine.get(),
      level: this.currentLevel,
      playerPos: this.player.getPosition(),
      moves: this.moves,
      elapsedSeconds: this.elapsedSeconds,
      canUndo: this.canUndo(),
      undosRemaining: this.undosRemaining,
      isWon: this.stateMachine.is('LEVEL_COMPLETE') || this.gateAnimationState !== 'idle',
      isLost: this.stateMachine.is('GAME_OVER'),
      lives: this.lives,
      maxLives: this.getMaxLives(),
      parMoves: par,
      stars,
      optimalMoves: this.optimalMoves,
      invalidMoveAttempted: this.lastFailedTargetPos !== null,
      hitVisitedCell: this.lastMoveResult?.hitVisitedCell || false,
      completedPath: [...this.path],
      mistakes: this.mistakes,
      hintsUsed: this.hintsUsed,
      hintsUsedLevel: this.hintsUsedLevel,
      activeHintCells: [...this.activeHintCells],
      collectedKeys: new Set(this.collectedKeys),
      activeGates: this.grid?.getActiveGates() || [],
      activeMechanics,
      lastFailedTargetPos: this.lastFailedTargetPos,
      pointsEarned: this.lastPointsEarned,
      equippedCharacter: StorageService.getInstance().getEquippedCharacter(),
      equippedGate: StorageService.getInstance().getEquippedGate(),
      equippedTheme: StorageService.getInstance().getEquippedTheme(),
      equippedBackground: StorageService.getInstance().getEquippedBackground(),
      gateAnimationState: this.gateAnimationState,
      isDailyMode: this.isDailyMode,
      justUnlockedStage: this.justUnlockedStage,
      dailyBonusPoints: this.dailyBonusPoints,
      isEndlessMode: this.isEndlessMode,
      endlessLevel: this.endlessLevel,
    };
  }
}