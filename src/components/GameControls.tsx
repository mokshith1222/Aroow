import React, { useState } from 'react';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';

interface GameControlsProps {
  moves: number;
  targetMoves: number;
  canUndo: boolean;
  onUndo: () => void;
  undosRemaining: number;
  onRestart: () => void;
  onWatchAdForUndo?: () => void;
  /** When provided, renders a "HINT (Ad)" button that the player can tap */
  onRequestHint?: () => void;
  /** Whether the hint button is currently in a loading/playing state */
  hintAdLoading?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  moves,
  targetMoves,
  canUndo,
  onUndo,
  undosRemaining,
  onRestart,
  onWatchAdForUndo,
  onRequestHint,
  hintAdLoading = false,
}) => {
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();
  const [hintUsed, setHintUsed] = useState(false);

  const handleUndo = () => {
    if (!canUndo) return;
    audio.playButton();
    haptics.button();
    onUndo();
  };

  const handleRestart = () => {
    audio.playButton();
    haptics.button();
    onRestart();
  };

  const handleHint = () => {
    if (!onRequestHint || hintAdLoading || hintUsed) return;
    audio.playButton();
    haptics.button();
    setHintUsed(true);
    onRequestHint();
    // Allow re-use after a delay (each is a separate ad opportunity)
    setTimeout(() => setHintUsed(false), 3000);
  };

  const isOptimal = moves <= targetMoves;

  return (
    <footer className="game-bottom-bar" role="region" aria-label="Game controls">
      {/* Target & Move count */}
      <div className="bottom-moves-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em', fontWeight: 600 }}>
          TARGET: {targetMoves}
        </div>
        <div>
          <span className="moves-count" style={{ color: isOptimal ? 'var(--color-primary)' : 'var(--accent-amber)' }}>
            {moves}
          </span>
          <span style={{ fontSize: '0.8rem', marginLeft: '4px', color: 'var(--color-text-dim)' }}>MOVES</span>
        </div>
      </div>

      {/* Actions: Undo, Restart (and optional Hint) */}
      <div className="bottom-actions-group">
        {/* Optional rewarded hint button */}
        {onRequestHint && (
          <button
            className="control-icon-btn hint-btn"
            onPointerDown={(e) => { e.preventDefault(); handleHint(); }}
            disabled={hintAdLoading || hintUsed}
            aria-label="Get a hint (watch ad)"
            title="Hint (watch a short ad)"
            style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              opacity: hintAdLoading ? 0.5 : 1,
              minWidth: '44px',
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            {hintAdLoading ? (
              <span style={{ fontSize: '0.65rem' }}>…</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                  <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>HINT</span>
              </>
            )}
          </button>
        )}

        {undosRemaining > 0 ? (
          <button
            className="control-icon-btn undo-btn"
            onPointerDown={(e) => { e.preventDefault(); handleUndo(); }}
            disabled={!canUndo}
            aria-label="Undo move"
            title="Undo (Z)"
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 10h10a5 5 0 0 1 5 5v2" strokeLinecap="round" />
              <polyline points="7 6 3 10 7 14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>{undosRemaining}</span>
          </button>
        ) : (
          <button
            className="control-icon-btn undo-ad-btn"
            onPointerDown={(e) => { e.preventDefault(); onWatchAdForUndo && onWatchAdForUndo(); }}
            aria-label="Watch ad for 3 more undo moves"
            title="Watch ad for +3 Undos"
            style={{
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              minWidth: '44px',
              padding: '4px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              color: 'var(--text-primary)',
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.5)',
              borderRadius: '8px'
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 10h10a5 5 0 0 1 5 5v2" strokeLinecap="round" />
              <polyline points="7 6 3 10 7 14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ color: '#FFD700' }}>+3 AD</span>
          </button>
        )}

        <button
          className="control-icon-btn restart-btn"
          onPointerDown={(e) => { e.preventDefault(); handleRestart(); }}
          aria-label="Restart level"
          title="Restart (R)"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" strokeLinecap="round" />
            <polyline points="21 3 21 8 16 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </footer>
  );
};