import { LevelData } from './types';

export const routeOverrides: Record<number, LevelData> = {
  26: {
    id: 26,
    worldId: 2,
    name: "A Choice (Beginner)",
    width: 7,
    height: 7,
    start: { x: 1, y: 1 },
    goal: { x: 5, y: 5 },
    walls: [
      {x:0, y:0}, {x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:6, y:0},
      {x:0, y:1}, {x:6, y:1},
      {x:0, y:2}, {x:6, y:2},
      {x:0, y:3}, {x:6, y:3},
      {x:0, y:4}, {x:6, y:4},
      {x:0, y:5}, {x:6, y:5},
      {x:0, y:6}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}, {x:6, y:6},
      
      {x:2, y:2}, {x:3, y:2}, {x:4, y:2},
      {x:2, y:3}, {x:3, y:3}, {x:4, y:3},
      {x:2, y:4}, {x:3, y:4}, {x:4, y:4}
    ],
    longRouteMinMoves: 4,
    routes: [
      { pos: { x: 1, y: 3 }, text: "SHORT", description: "Risky but rewarding (3★)", maxStars: 3 },
      { pos: { x: 3, y: 1 }, text: "LONG", description: "Safer but slower (Max 2★)", maxStars: 2 }
    ]
  },
  76: {
    id: 76,
    worldId: 3,
    name: "Fork in the Road",
    width: 9,
    height: 9,
    start: { x: 1, y: 4 },
    goal: { x: 7, y: 4 },
    walls: [
      {x:0, y:0}, {x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:6, y:0}, {x:7, y:0}, {x:8, y:0},
      {x:0, y:8}, {x:1, y:8}, {x:2, y:8}, {x:3, y:8}, {x:4, y:8}, {x:5, y:8}, {x:6, y:8}, {x:7, y:8}, {x:8, y:8},
      {x:0, y:1}, {x:0, y:2}, {x:0, y:3}, {x:0, y:4}, {x:0, y:5}, {x:0, y:6}, {x:0, y:7},
      {x:8, y:1}, {x:8, y:2}, {x:8, y:3}, {x:8, y:4}, {x:8, y:5}, {x:8, y:6}, {x:8, y:7},
      
      {x:3, y:3}, {x:4, y:3}, {x:5, y:3},
      {x:3, y:4}, {x:4, y:4}, {x:5, y:4},
      {x:3, y:5}, {x:4, y:5}, {x:5, y:5},
      
      {x:2, y:7}, {x:6, y:7}
    ],
    longRouteMinMoves: 6,
    routes: [
      { pos: { x: 4, y: 6 }, text: "SHORT", description: "Tight turns (3★)", maxStars: 3 },
      { pos: { x: 4, y: 2 }, text: "LONG", description: "Wide corridor (Max 2★)", maxStars: 2 }
    ]
  },
  151: {
    id: 151,
    worldId: 4,
    name: "Deception",
    width: 9,
    height: 9,
    start: { x: 1, y: 1 },
    goal: { x: 7, y: 7 },
    walls: [
      {x:0, y:0}, {x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:6, y:0}, {x:7, y:0}, {x:8, y:0},
      {x:0, y:8}, {x:1, y:8}, {x:2, y:8}, {x:3, y:8}, {x:4, y:8}, {x:5, y:8}, {x:6, y:8}, {x:7, y:8}, {x:8, y:8},
      {x:0, y:1}, {x:0, y:2}, {x:0, y:3}, {x:0, y:4}, {x:0, y:5}, {x:0, y:6}, {x:0, y:7},
      {x:8, y:1}, {x:8, y:2}, {x:8, y:3}, {x:8, y:4}, {x:8, y:5}, {x:8, y:6}, {x:8, y:7},
      
      {x:2, y:2}, {x:3, y:2}, {x:6, y:2},
      {x:2, y:3}, {x:3, y:3}, {x:6, y:3},
      {x:2, y:4}, {x:3, y:4}, {x:4, y:4}, {x:5, y:4}, {x:6, y:4},
      {x:2, y:6}, {x:5, y:6}, {x:6, y:6}
    ],
    longRouteMinMoves: 7,
    routes: [
      { pos: { x: 1, y: 5 }, text: "SHORT", description: "Hidden path (3★)", maxStars: 3 },
      { pos: { x: 5, y: 1 }, text: "LONG", description: "Obvious path (Max 2★)", maxStars: 2 }
    ]
  },
  226: {
    id: 226,
    worldId: 5,
    name: "Advanced Choice",
    width: 10,
    height: 10,
    start: { x: 1, y: 8 },
    goal: { x: 8, y: 1 },
    walls: [
      {x:0, y:0}, {x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:6, y:0}, {x:7, y:0}, {x:8, y:0}, {x:9, y:0},
      {x:0, y:9}, {x:1, y:9}, {x:2, y:9}, {x:3, y:9}, {x:4, y:9}, {x:5, y:9}, {x:6, y:9}, {x:7, y:9}, {x:8, y:9}, {x:9, y:9},
      {x:0, y:1}, {x:0, y:2}, {x:0, y:3}, {x:0, y:4}, {x:0, y:5}, {x:0, y:6}, {x:0, y:7}, {x:0, y:8},
      {x:9, y:1}, {x:9, y:2}, {x:9, y:3}, {x:9, y:4}, {x:9, y:5}, {x:9, y:6}, {x:9, y:7}, {x:9, y:8},
      
      {x:3, y:3}, {x:4, y:3}, {x:5, y:3}, {x:6, y:3},
      {x:3, y:4}, {x:4, y:4}, {x:5, y:4}, {x:6, y:4},
      {x:3, y:5}, {x:4, y:5}, {x:5, y:5}, {x:6, y:5},
      {x:3, y:6}, {x:4, y:6}, {x:5, y:6}, {x:6, y:6},
      
      {x:2, y:7}, {x:7, y:2}
    ],
    longRouteMinMoves: 8,
    routes: [
      { pos: { x: 5, y: 8 }, text: "SHORT", description: "Precision required (3★)", maxStars: 3 },
      { pos: { x: 1, y: 5 }, text: "LONG", description: "Outer rim (Max 2★)", maxStars: 2 }
    ]
  }
};
