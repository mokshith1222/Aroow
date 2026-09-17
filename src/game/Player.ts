import type {  Position, Direction  } from './types';

export class Player {
  private position: Position;
  private direction: Direction;

  constructor(initialPosition: Position = { x: 0, y: 0 }, initialDirection: Direction = 'RIGHT') {
    this.position = { ...initialPosition };
    this.direction = initialDirection;
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public setPosition(pos: Position): void {
    this.position = { ...pos };
  }

  public getDirection(): Direction {
    return this.direction;
  }

  public setDirection(dir: Direction): void {
    this.direction = dir;
  }

  public reset(startPosition: Position, direction: Direction = 'RIGHT'): void {
    this.position = { ...startPosition };
    this.direction = direction;
  }
}