import type {  LevelData  } from '../game/types';

export const levels: LevelData[] = [
  // World 1: Genesis (Levels 1 - 5)
  {
    id: 1,
    worldId: 1,
    name: 'First Step',
    width: 3,
    height: 3,
    start: { x: 0, y: 1 },
    goal: { x: 2, y: 1 },
    walls: [
      { x: 1, y: 0 },
      { x: 1, y: 2 }
    ],
    parMoves: 2
  },
  {
    id: 2,
    worldId: 1,
    name: 'Corner Turn',
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    goal: { x: 3, y: 3 },
    walls: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 }
    ],
    parMoves: 6
  },
  {
    id: 3,
    worldId: 1,
    name: 'The Divider',
    width: 4,
    height: 4,
    start: { x: 0, y: 3 },
    goal: { x: 3, y: 0 },
    walls: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 }
    ],
    parMoves: 6
  },
  {
    id: 4,
    worldId: 1,
    name: 'Fork in the Road',
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    goal: { x: 3, y: 0 },
    walls: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 }
    ],
    parMoves: 5
  },
  {
    id: 5,
    worldId: 1,
    name: 'The Horseshoe',
    width: 5,
    height: 5,
    start: { x: 1, y: 1 },
    goal: { x: 3, y: 1 },
    walls: [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 }
    ],
    parMoves: 6
  },

  // World 2: Corridors (Levels 6 - 10)
  {
    id: 6,
    worldId: 2,
    name: 'S-Curve',
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    goal: { x: 4, y: 4 },
    walls: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 3 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 }
    ],
    parMoves: 16
  },
  {
    id: 7,
    worldId: 2,
    name: 'Pillars',
    width: 5,
    height: 5,
    start: { x: 0, y: 2 },
    goal: { x: 4, y: 2 },
    walls: [
      { x: 1, y: 1 },
      { x: 1, y: 3 },
      { x: 3, y: 1 },
      { x: 3, y: 3 }
    ],
    parMoves: 4
  },
  {
    id: 8,
    worldId: 2,
    name: 'The Zigzag',
    width: 5,
    height: 5,
    start: { x: 0, y: 4 },
    goal: { x: 4, y: 0 },
    walls: [
      { x: 1, y: 4 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
      { x: 3, y: 2 }
    ],
    parMoves: 12
  },
  {
    id: 9,
    worldId: 2,
    name: 'Boxed In',
    width: 5,
    height: 5,
    start: { x: 2, y: 2 },
    goal: { x: 4, y: 4 },
    walls: [
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 1, y: 3 },
      { x: 3, y: 3 }
    ],
    parMoves: 4
  },
  {
    id: 10,
    worldId: 2,
    name: 'Chamber Gate',
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    goal: { x: 5, y: 5 },
    walls: [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 5 },
      { x: 3, y: 4 }
    ],
    parMoves: 10
  },

  // World 3: Labyrinths (Levels 11 - 15)
  {
    id: 11,
    worldId: 3,
    name: 'Spiral',
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    goal: { x: 2, y: 3 },
    walls: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 4, y: 1 },
      { x: 4, y: 2 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 2, y: 4 }
    ],
    parMoves: 13
  },
  {
    id: 12,
    worldId: 3,
    name: 'Crossroads',
    width: 6,
    height: 6,
    start: { x: 0, y: 2 },
    goal: { x: 5, y: 3 },
    walls: [
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 3 }
    ],
    parMoves: 8
  },
  {
    id: 13,
    worldId: 3,
    name: 'Twin Paths',
    width: 6,
    height: 6,
    start: { x: 2, y: 0 },
    goal: { x: 3, y: 5 },
    walls: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 0, y: 2 },
      { x: 5, y: 3 }
    ],
    parMoves: 8
  },
  {
    id: 14,
    worldId: 3,
    name: 'Baffle',
    width: 6,
    height: 6,
    start: { x: 0, y: 5 },
    goal: { x: 5, y: 0 },
    walls: [
      { x: 1, y: 5 },
      { x: 1, y: 4 },
      { x: 1, y: 3 },
      { x: 3, y: 2 },
      { x: 3, y: 1 },
      { x: 3, y: 0 },
      { x: 4, y: 3 },
      { x: 4, y: 4 }
    ],
    parMoves: 16
  },
  {
    id: 15,
    worldId: 3,
    name: 'The Gauntlet',
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    goal: { x: 5, y: 5 },
    walls: [
      { x: 0, y: 1 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 4, y: 2 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 4, y: 5 }
    ],
    parMoves: 14
  },

  // World 4: Master Vectors (Levels 16 - 20)
  {
    id: 16,
    worldId: 4,
    name: 'Maze Alpha',
    width: 7,
    height: 7,
    start: { x: 0, y: 0 },
    goal: { x: 6, y: 6 },
    walls: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 3, y: 5 },
      { x: 3, y: 6 },
      { x: 5, y: 0 },
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
      { x: 5, y: 4 }
    ],
    parMoves: 18
  },
  {
    id: 17,
    worldId: 4,
    name: 'The Vault',
    width: 7,
    height: 7,
    start: { x: 3, y: 0 },
    goal: { x: 3, y: 6 },
    walls: [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 2, y: 3 },
      { x: 4, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 }
    ],
    parMoves: 10
  },
  {
    id: 18,
    worldId: 4,
    name: 'Serpentine',
    width: 7,
    height: 7,
    start: { x: 0, y: 6 },
    goal: { x: 6, y: 0 },
    walls: [
      { x: 0, y: 4 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 6, y: 2 }
    ],
    parMoves: 22
  },
  {
    id: 19,
    worldId: 4,
    name: 'Checkerboard',
    width: 7,
    height: 7,
    start: { x: 0, y: 0 },
    goal: { x: 6, y: 6 },
    walls: [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 5, y: 1 },
      { x: 2, y: 2 },
      { x: 4, y: 2 },
      { x: 1, y: 3 },
      { x: 3, y: 3 },
      { x: 5, y: 3 },
      { x: 2, y: 4 },
      { x: 4, y: 4 },
      { x: 1, y: 5 },
      { x: 3, y: 5 },
      { x: 5, y: 5 }
    ],
    parMoves: 12
  },
  {
    id: 20,
    worldId: 4,
    name: 'Final Vector',
    width: 7,
    height: 7,
    start: { x: 0, y: 3 },
    goal: { x: 6, y: 3 },
    walls: [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 4 },
      { x: 3, y: 5 },
      { x: 3, y: 6 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
      { x: 5, y: 4 }
    ],
    parMoves: 14
  }
];