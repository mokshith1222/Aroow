import React from 'react';
import type {  Direction  } from '../game/types';

interface PlayerProps {
  direction?: Direction;
  invalidAttempt?: boolean;
  equippedCharacter?: string;
  isEnteringGate?: boolean;
}

import { COSMETICS } from '../data/Cosmetics';

export const Player: React.FC<PlayerProps> = ({
  direction = 'RIGHT',
  invalidAttempt = false,
  equippedCharacter = 'classic_arrow',
  isEnteringGate = false
}) => {
  const rotationMap: Record<Direction, number> = {
    UP: -90,
    RIGHT: 0,
    DOWN: 90,
    LEFT: 180
  };

  const rotation = rotationMap[direction] || 0;
  
  const cosmetic = COSMETICS.find(c => c.id === equippedCharacter) || COSMETICS[0];
  const isClassic = cosmetic.id === 'classic_arrow';

  return (
    <div
      className={`player-token ${invalidAttempt ? 'shake-invalid' : ''} ${isEnteringGate ? 'player-entering-gate' : ''}`}
      style={{
        transform: `rotate(${rotation}deg)`
      }}
      aria-label={`Player facing ${direction}`}
    >
      {isClassic ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="player-arrow-svg"
        >
          <path
            d="M5 12H19M19 12L12 5M19 12L12 19"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          {cosmetic.icon}
        </span>
      )}
    </div>
  );
};