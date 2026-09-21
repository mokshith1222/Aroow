import React, { useRef, useEffect, useCallback } from 'react';
import type { Direction, LevelData, Position } from '../game/types';
import { GridCell } from './GridCell';
import { Saw } from './Saw';

interface GameBoardProps {
  level: LevelData;
  playerPos: Position;
  playerDirection?: Direction;
  invalidAttempt?: boolean;
  hitVisitedCell?: boolean;
  lastFailedTargetPos?: Position | null;
  isWon?: boolean;
  completedPath?: Position[];
  activeGates?: Position[];
  collectedKeys?: Set<number>;
  activeHintCells?: Position[];
  equippedCharacter?: string;
  equippedGate?: string;
  gateAnimationState?: 'idle' | 'activating' | 'entering' | 'completed';
  onMove: (dir: Direction) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  level,
  playerPos,
  playerDirection = 'RIGHT',
  invalidAttempt = false,
  hitVisitedCell = false,
  lastFailedTargetPos = null,
  isWon = false,
  completedPath = [],
  activeGates = [],
  collectedKeys = new Set(),
  activeHintCells = [],
  equippedCharacter,
  equippedGate = 'classic_gate',
  gateAnimationState = 'idle',
  onMove
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Desktop keyboard controls (Arrow keys and WASD)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isWon) return;

      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      let dir: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'KeyW':
        case 'w':
        case 'W':
          dir = 'UP';
          break;
        case 'ArrowDown':
        case 'KeyS':
        case 's':
        case 'S':
          dir = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'KeyA':
        case 'a':
        case 'A':
          dir = 'LEFT';
          break;
        case 'ArrowRight':
        case 'KeyD':
        case 'd':
        case 'D':
          dir = 'RIGHT';
          break;
      }

      if (dir) {
        e.preventDefault();
        onMove(dir);
      }
    },
    [onMove, isWon]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Mobile swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isWon) return;
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isWon || !touchStartRef.current || e.changedTouches.length === 0) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const minSwipeDistance = 24;

    if (Math.max(absX, absY) > minSwipeDistance) {
      if (absX > absY) {
        onMove(deltaX > 0 ? 'RIGHT' : 'LEFT');
      } else {
        onMove(deltaY > 0 ? 'DOWN' : 'UP');
      }
    }

    touchStartRef.current = null;
  };

  // Direct cell tap interaction: tap adjacent cell to move
  const handleBoardClick = useCallback((e: React.MouseEvent) => {
    if (isWon) return;

    const cell = (e.target as HTMLElement).closest('.grid-cell');
    if (!cell) return;

    const xStr = cell.getAttribute('data-x');
    const yStr = cell.getAttribute('data-y');
    if (xStr === null || yStr === null) return;

    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);
    if (isNaN(x) || isNaN(y)) return;

    const dx = x - playerPos.x;
    const dy = y - playerPos.y;

    // Direct 1-cell orthogonal neighbor tap
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      if (dx === 1) onMove('RIGHT');
      else if (dx === -1) onMove('LEFT');
      else if (dy === 1) onMove('DOWN');
      else if (dy === -1) onMove('UP');
    }
  }, [isWon, playerPos, onMove]);

  // Build grid matrix & lookups
  const wallLookup = new Set(level.walls.map(w => `${w.x},${w.y}`));
  const pathLookup = new Set(completedPath.map(p => `${p.x},${p.y}`));
  
  // Mechanics lookups
  const tileLookup = new Map(level.tiles?.map(t => [`${t.pos.x},${t.pos.y}`, t]));
  const gateLookup = new Set(activeGates.map(g => `${g.x},${g.y}`));
  const keyLookup = new Set(
    level.keys?.map((k, idx) => collectedKeys.has(idx) ? null : `${k.x},${k.y}`).filter(Boolean)
  );
  const hintLookup = new Set(activeHintCells.map(h => `${h.x},${h.y}`));

  // Build SVG path segments — split at portal teleports (non-adjacent positions).
  // A portal jump is detected when two consecutive path positions are more than 1
  // cell apart (Manhattan distance > 1). We render each segment as a separate
  // polyline so we never draw a giant line traversing the board.
  const buildPathSegments = (path: Position[]): string[][] => {
    if (path.length < 2) return [];
    const segments: string[][] = [];
    let current: string[] = [`${path[0].x * 100 + 50},${path[0].y * 100 + 50}`];
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const cur = path[i];
      const manhattan = Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
      if (manhattan > 1) {
        // Portal jump — close current segment and start a new one
        if (current.length >= 2) segments.push(current);
        current = [`${cur.x * 100 + 50},${cur.y * 100 + 50}`];
      } else {
        current.push(`${cur.x * 100 + 50},${cur.y * 100 + 50}`);
      }
    }
    if (current.length >= 2) segments.push(current);
    return segments;
  };

  // Portal jump cells — cells where the path teleports from/to.
  // We render a subtle glow on these instead of a line.
  const portalJumpCells = new Set<string>();
  for (let i = 1; i < completedPath.length; i++) {
    const prev = completedPath[i - 1];
    const cur = completedPath[i];
    if (Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y) > 1) {
      portalJumpCells.add(`${prev.x},${prev.y}`);
      portalJumpCells.add(`${cur.x},${cur.y}`);
    }
  }

  const pathSegments = buildPathSegments(completedPath);

  return (
    <div className={`game-board-wrapper ${isWon ? 'board-won' : ''} ${hitVisitedCell ? 'board-flash-red' : (invalidAttempt ? 'board-shake' : '')}`}>
      <div
        ref={boardRef}
        className="game-board"
        style={{
          gridTemplateColumns: `repeat(${level.width}, 1fr)`,
          gridTemplateRows: `repeat(${level.height}, 1fr)`,
          aspectRatio: `${level.width} / ${level.height}`
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleBoardClick}
        tabIndex={0}
        role="grid"
        aria-label={`Puzzle grid ${level.width} by ${level.height}`}
      >
        {/* SVG Animated Path Overlay — segmented, portal-jump aware */}
        {isWon && pathSegments.length > 0 && (
          <svg
            className="path-svg-overlay"
            viewBox={`0 0 ${level.width * 100} ${level.height * 100}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {pathSegments.map((seg, i) => (
              <polyline
                key={i}
                points={seg.join(' ')}
                className={`path-polyline ${isWon ? 'path-polyline-won' : ''}`}
              />
            ))}
          </svg>
        )}

        {Array.from({ length: level.height }).map((_, y) =>
          Array.from({ length: level.width }).map((_, x) => {
            const key = `${x},${y}`;
            const isWall = wallLookup.has(key);
            const isStart = level.start.x === x && level.start.y === y;
            const isGoal = level.goal.x === x && level.goal.y === y;
            const isPlayer = playerPos.x === x && playerPos.y === y;
            const isInPath = pathLookup.has(key);
            const tileMeta = tileLookup.get(key);
            const isGate = gateLookup.has(key);
            const isKey = keyLookup.has(key);
            const isFailedTarget = !!lastFailedTargetPos && lastFailedTargetPos.x === x && lastFailedTargetPos.y === y;
            // Mark portal jump entry/exit cells with a special teleport glow
            const isPortalJump = portalJumpCells.has(key);

            return (
              <GridCell
                key={key}
                x={x}
                y={y}
                isWall={isWall}
                isStart={isStart}
                isGoal={isGoal}
                isPlayer={isPlayer}
                isInPath={isInPath}
                isWon={isWon}
                playerDirection={playerDirection}
                invalidAttempt={invalidAttempt}
                isFailedTarget={isFailedTarget}
                tileMeta={tileMeta}
                isGate={isGate}
                isKey={isKey}
                equippedCharacter={equippedCharacter}
                equippedGate={equippedGate}
                gateState={isGoal ? gateAnimationState : 'idle'}
                isHinted={hintLookup.has(key)}
                isPortalJump={isPortalJump}
              />
            );
          })
        )}

        {/* Phase 3 Route Labels Overlay */}
        {level.routes && level.routes.map((route, i) => (
          <div
            key={`route-${i}`}
            className={`route-label route-${route.text.toLowerCase()}`}
            style={{
              position: 'absolute',
              top: `${(route.pos.y / level.height) * 100}%`,
              left: `${(route.pos.x / level.width) * 100}%`,
              width: `${(1 / level.width) * 100}%`,
              height: `${(1 / level.height) * 100}%`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 15,
              opacity: 0.85
            }}
          >
            <span style={{ fontSize: '0.7em', fontWeight: 'bold', color: route.maxStars === 3 ? '#fbbf24' : '#9ca3af', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {route.text}
            </span>
            <span style={{ fontSize: '0.4em', textAlign: 'center', color: '#f3f4f6', lineHeight: 1.1, marginTop: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {route.description}
            </span>
          </div>
        ))}
        
        {/* Phase 4 Hazard Overlays */}
        {level.tiles?.filter(t => t.type === 'MOVING_SAW').map((tile, i) => (
          <Saw key={`saw-${i}`} tile={tile} level={level} />
        ))}
      </div>
    </div>
  );
};