import React, { useState, useEffect } from 'react';
import type { TileMeta, LevelData } from '../game/types';
import { GameEngine } from '../game/GameEngine';
import { HazardResolver } from '../game/HazardResolver';

interface SawProps {
  tile: TileMeta;
  level: LevelData;
}

export const Saw: React.FC<SawProps> = ({ tile, level }) => {
  const [pos, setPos] = useState(tile.pos);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let frameId: number;
    let lastUpdate = performance.now();
    
    const loop = (time: number) => {
      const elapsed = GameEngine.getInstance().getElapsedMs();
      setPos(HazardResolver.getSawPosition(tile, elapsed, level));
      
      const dt = time - lastUpdate;
      lastUpdate = time;
      // Rotate 360 degrees every 500ms
      setRotation(r => (r + dt * 0.72) % 360);
      
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [tile, level]);

  return (
    <div
      className="moving-saw"
      style={{
        position: 'absolute',
        top: `${(pos.y / level.height) * 100}%`,
        left: `${(pos.x / level.width) * 100}%`,
        width: `${(1 / level.width) * 100}%`,
        height: `${(1 / level.height) * 100}%`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 25, // Above player and walls
        transform: `rotate(${rotation}deg)`
      }}
    >
      <svg viewBox="0 0 24 24" style={{ width: '80%', height: '80%', color: '#ef4444', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
        <path fill="currentColor" d="M12 2l1.5 3 3-1.5-1.5 3 3 1.5-3 1.5 1.5 3-3-1.5L12 14l-1.5-3-3 1.5 1.5-3-3-1.5 3-1.5-1.5-3L9 5l1.5-3zm0 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
      </svg>
    </div>
  );
};
