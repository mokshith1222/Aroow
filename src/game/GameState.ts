import type {  GameStateType  } from './types';

export class GameState {
  private current: GameStateType;
  private readonly validTransitions: Record<GameStateType, Set<GameStateType>> = {
    MENU: new Set(['LEVEL_SELECT', 'PLAYING']),
    LEVEL_SELECT: new Set(['MENU', 'PLAYING']),
    PLAYING: new Set(['PAUSED', 'LEVEL_COMPLETE', 'GAME_OVER', 'MENU', 'LEVEL_SELECT']),
    PAUSED: new Set(['PLAYING', 'MENU', 'LEVEL_SELECT']),
    LEVEL_COMPLETE: new Set(['PLAYING', 'LEVEL_SELECT', 'MENU']),
    GAME_OVER: new Set(['PLAYING', 'LEVEL_SELECT', 'MENU'])
  };

  constructor(initialState: GameStateType = 'MENU') {
    this.current = initialState;
  }

  public get(): GameStateType {
    return this.current;
  }

  public canTransitionTo(next: GameStateType): boolean {
    if (this.current === next) return true;
    const allowed = this.validTransitions[this.current];
    return allowed ? allowed.has(next) : false;
  }

  public transitionTo(next: GameStateType): boolean {
    if (!this.canTransitionTo(next)) {
      console.warn(`[GameState] Invalid transition attempted: ${this.current} -> ${next}`);
      return false;
    }
    this.current = next;
    return true;
  }

  public is(state: GameStateType): boolean {
    return this.current === state;
  }

  public isPlaying(): boolean {
    return this.current === 'PLAYING';
  }
}