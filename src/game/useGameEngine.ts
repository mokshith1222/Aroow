import { useEffect, useState } from 'react';
import { GameEngine } from './GameEngine';
import type {  GameSnapshot  } from './types';

export function useGameEngine(): {
  snapshot: GameSnapshot;
  engine: GameEngine;
} {
  const engine = GameEngine.getInstance();
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => engine.getSnapshot());

  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      setSnapshot(engine.getSnapshot());
    });
    return unsubscribe;
  }, [engine]);

  return { snapshot, engine };
}
