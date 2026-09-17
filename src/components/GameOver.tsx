import React, { useState } from 'react';
import type { LevelData } from '../game/types';
import { AdService } from '../services/AdService';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';

interface GameOverProps {
  level: LevelData | null;
  moves: number;
  onRetry: () => void;
  onLevelSelect: () => void;
  onRevive: () => void;
  /** True when this game over occurred during Endless Mode */
  isEndlessMode?: boolean;
  /** Endless level number that failed */
  endlessLevel?: number;
}

/**
 * GameOver screen.
 *
 * Rewarded ad placement: the player EXPLICITLY taps "WATCH AD → +1 LIFE".
 * - Reward granted exactly once per game-over screen instance.
 * - Ad failure shown as a dismissable error; player can retry or just retry level.
 * - Concurrency guard: button disabled while ad is loading/showing.
 */
export const GameOver: React.FC<GameOverProps> = ({
  level,
  moves,
  onRetry,
  onLevelSelect,
  onRevive,
  isEndlessMode = false,
  endlessLevel,
}) => {
  const [adState, setAdState] = useState<'idle' | 'loading' | 'playing' | 'done'>('idle');
  const [adError, setAdError] = useState<string | null>(null);
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();

  const isAdActive = adState === 'loading' || adState === 'playing';
  const reviveClaimed = adState === 'done';

  const handleWatchAd = () => {
    if (isAdActive || reviveClaimed) return;
    audio.playButton();
    haptics.button();
    setAdState('loading');
    setAdError(null);

    AdService.getInstance().showRewardedAd(
      // onRewarded — called exactly once on successful completion
      () => {
        setAdState('done');
        onRevive();
      },
      // onFailed — player did not earn reward; do not punish; allow retry
      () => {
        setAdState('idle');
        setAdError('Ad not available. Try again or tap Retry.');
      },
      'revive'
    );

    // Transition from loading → playing state after a tick
    // (real ad loading is async; for simulation it's near-instant)
    setTimeout(() => {
      setAdState(prev => prev === 'loading' ? 'playing' : prev);
    }, 200);
  };

  const handleRetry = () => {
    if (isAdActive) return;
    audio.playButton();
    haptics.button();
    onRetry();
  };

  const handleLevelSelect = () => {
    if (isAdActive) return;
    audio.playButton();
    haptics.button();
    onLevelSelect();
  };

  // ── Build contextual failure line
  const levelLabel = isEndlessMode
    ? `Endless ${endlessLevel ?? ''}`
    : `Level ${level?.id ?? ''}`;

  return (
    <div className="modal-overlay" role="dialog" aria-labelledby="gameover-title" aria-modal="true">
      <div className="modal-card">
        <span className="modal-eyebrow warning-text">
          {isEndlessMode ? 'ENDLESS OVER' : 'GAME OVER'}
        </span>

        <h2 id="gameover-title" className="modal-title">
          Out of Chances
        </h2>

        <p className="modal-subtitle">
          Failed on {levelLabel} ({moves} move{moves !== 1 ? 's' : ''})
        </p>

        {/* Ad error banner — dismissable */}
        {adError && (
          <div
            className="ad-error-banner"
            role="alert"
            onClick={() => setAdError(null)}
            style={{ cursor: 'pointer' }}
            title="Tap to dismiss"
          >
            {adError}
          </div>
        )}

        <div className="modal-actions failure-actions" style={{ alignItems: 'center', width: '100%' }}>

          {/* Rewarded Ad — +1 Life */}
          {reviveClaimed ? null : (
            <>
              <button
                className="btn-ad-revive"
                onClick={handleWatchAd}
                disabled={isAdActive}
                id="btn-watch-ad"
                aria-busy={isAdActive}
              >
                {adState === 'loading' ? (
                  <span className="ad-action-title">Loading Ad…</span>
                ) : adState === 'playing' ? (
                  <span className="ad-action-title">Ad Playing…</span>
                ) : (
                  <>
                    <span className="ad-action-title">WATCH AD → +1 LIFE</span>
                    <span className="ad-action-sub">Continue from current position</span>
                  </>
                )}
              </button>

              <div className="action-divider">
                <span>OR</span>
              </div>
            </>
          )}

          {/* Retry */}
          <button
            className="btn-primary"
            onClick={handleRetry}
            disabled={isAdActive}
            id="btn-gameover-retry"
            style={{ width: '100%' }}
          >
            RETRY
          </button>

          <button
            className="btn-secondary"
            onClick={handleLevelSelect}
            disabled={isAdActive}
            id="btn-gameover-levels"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isEndlessMode ? 'Main Menu' : 'Levels'}
          </button>
        </div>
      </div>
    </div>
  );
};