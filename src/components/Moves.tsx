import React from 'react';

interface MovesProps {
  moves: number;
  parMoves?: number;
}

export const Moves: React.FC<MovesProps> = ({ moves, parMoves }) => {
  return (
    <div className="stat-badge" title="Moves taken / Par moves">
      <span className="stat-label">MOVES</span>
      <span className="stat-value">
        {moves}
        {parMoves !== undefined && <span className="stat-target">/{parMoves}</span>}
      </span>
    </div>
  );
};