import React, { useState, useEffect } from 'react';
import type { Direction, TileMeta } from '../game/types';
import { Player } from './Player';
import { Goal } from './Goal';
import { GameEngine } from '../game/GameEngine';
import { HazardResolver } from '../game/HazardResolver';

interface GridCellProps {
  x: number;
  y: number;
  isWall: boolean;
  isStart: boolean;
  isGoal: boolean;
  isPlayer: boolean;
  isInPath: boolean;
  isWon: boolean;
  playerDirection: Direction;
  invalidAttempt: boolean;
  isFailedTarget?: boolean;
  tileMeta?: TileMeta;
  isKey?: boolean;
  isGate?: boolean;
  equippedCharacter?: string;
  equippedGate?: string;
  gateState?: 'idle' | 'activating' | 'entering' | 'completed';
  isHinted?: boolean;
}

export const GridCell: React.FC<GridCellProps> = React.memo(({
  x,
  y,
  isWall,
  isStart,
  isGoal,
  isPlayer,
  isInPath,
  isWon,
  playerDirection,
  invalidAttempt,
  isFailedTarget = false,
  tileMeta,
  isKey,
  isGate = false,
  equippedCharacter,
  equippedGate = 'classic_gate',
  gateState = 'idle',
  isHinted = false
}) => {
  const [isSpikeActive, setIsSpikeActive] = useState(false);

  useEffect(() => {
    if (tileMeta?.type !== 'SPIKE_TRAP') return;
    
    let frameId: number;
    const loop = () => {
      const elapsed = GameEngine.getInstance().getElapsedMs();
      setIsSpikeActive(HazardResolver.isSpikeActive(tileMeta, elapsed));
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [tileMeta]);

  let mechanicClass = '';
  if (tileMeta?.type === 'ICE') mechanicClass = 'cell-ice';
  if (tileMeta?.type === 'PORTAL') mechanicClass = 'cell-portal';
  if (tileMeta?.type.startsWith('ONE_WAY')) mechanicClass = 'cell-one-way';
  if (isKey) mechanicClass = 'cell-key';
  if (isGate) mechanicClass = 'cell-gate';

  return (
    <div
      className={`grid-cell ${isWall ? 'cell-wall' : 'cell-empty'} ${
        isStart ? 'cell-start' : ''
      } ${isInPath && isWon ? 'cell-in-completed-path' : ''} ${
        isFailedTarget ? 'cell-invalid-blocked' : ''
      } ${isHinted ? 'hinted-cell' : ''} ${mechanicClass}`}
      data-x={x}
      data-y={y}
    >
      {/* Hint visual highlight */}
      {isHinted && !isPlayer && !isWall && (
        <div className="hint-overlay" />
      )}

      {isGoal && <Goal isWon={isWon} gateId={equippedGate} gateState={gateState} />}
      
      {tileMeta?.type === 'PORTAL' && <div className="portal-ring" />}
      
      {tileMeta?.type.startsWith('ONE_WAY') && (
        <svg viewBox="0 0 24 24" className={`one-way-arrow ${
          tileMeta.type === 'ONE_WAY_UP' ? 'one-way-up' :
          tileMeta.type === 'ONE_WAY_DOWN' ? 'one-way-down' :
          tileMeta.type === 'ONE_WAY_LEFT' ? 'one-way-left' : 'one-way-right'
        }`}>
          <path fill="currentColor" d="M12 4l-8 8h5v8h6v-8h5z" />
        </svg>
      )}

      {isKey && (
        <svg viewBox="0 0 24 24" className="key-icon">
          <path fill="currentColor" d="M12.65 10A5.99 5.99 0 007 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 005.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
        </svg>
      )}

      {tileMeta?.type === 'SPIKE_TRAP' && (
        <div className={`spike-trap ${isSpikeActive ? 'spike-active' : 'spike-idle'}`}>
          <div className="spike-holes" />
          <svg viewBox="0 0 24 24" className="spike-blades">
            <path fill="currentColor" d="M12 2L9 22h6L12 2z M4 6l1 16h4L4 6z M20 6l-1 16h-4l5-16z" />
          </svg>
        </div>
      )}

      {isGate && <div className="gate-lock" />}

      {isPlayer && (
        <Player
          direction={playerDirection}
          invalidAttempt={invalidAttempt}
          equippedCharacter={equippedCharacter}
          isEnteringGate={isGoal && (gateState === 'entering' || gateState === 'completed')}
        />
      )}
      {!isWall && !isGoal && !isPlayer && !tileMeta && !isKey && !isGate && isStart && (
        <div className="start-indicator" />
      )}
    </div>
  );
});
