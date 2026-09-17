import React, { useEffect } from 'react';
import type { LevelData } from '../game/types';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';
import { AdService } from '../services/AdService';

interface LevelCompleteProps {
  level: LevelData | null;
  moves: number;
  elapsedSeconds: number;
  stars: number;
  lives: number;
  maxLives: number;
  pointsEarned?: number;
  isDaily?: boolean;
  dailyBonusPoints?: number;
  isEndless?: boolean;
  endlessLevel?: number;
  hintsUsedLevel?: 0 | 1 | 2 | 3;
  onNextLevel: () => void;
  onReplay: () => void;
  onLevelSelect: () => void;
}

export const LevelComplete: React.FC<LevelCompleteProps> = ({
  level,
  moves,
  elapsedSeconds,
  stars,
  lives,
  maxLives,
  pointsEarned,
  isDaily,
  dailyBonusPoints,
  isEndless,
  endlessLevel,
  hintsUsedLevel = 0,
  onNextLevel,
  onReplay,
  onLevelSelect
}) => {
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();
  const adService = AdService.getInstance();
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  // Play individual star sounds in sync with the visual pop-in animation
  useEffect(() => {
    const timers: number[] = [];

    for (let i = 1; i <= stars; i++) {
      const delayMs = Math.round((0.3 + (i - 1) * 0.25) * 1000);
      const timer = window.setTimeout(() => {
        audio.playStar(i);
        haptics.light();
      }, delayMs);
      timers.push(timer);
    }

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [stars, audio, haptics]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    audio.playButton();
    haptics.button();
    adService.showInterstitial(() => {
      setIsTransitioning(false);
      onNextLevel();
    });
  };

  const handleReplay = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    audio.playButton();
    haptics.button();
    adService.showInterstitial(() => {
      setIsTransitioning(false);
      onReplay();
    });
  };

  const handleLevels = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    audio.playButton();
    haptics.button();
    adService.showInterstitial(() => {
      setIsTransitioning(false);
      onLevelSelect();
    });
  };

  // Format seconds with tenths precision (e.g. 12.4s)
  const formattedTime =
    elapsedSeconds < 60
      ? `${Number(elapsedSeconds).toFixed(1)}s`
      : `${Math.floor(elapsedSeconds / 60)}m ${(elapsedSeconds % 60).toFixed(1)}s`;

  return (
    <div className="modal-overlay completion-overlay" role="dialog" aria-labelledby="completion-title">
      <div className="modal-card completion-card">
        {/* Animated Checkmark Icon */}
        <div className="completion-check" aria-hidden="true">
          <span>✓</span>
        </div>

        <h2 id="completion-title" className="modal-title completion-title">
          {isDaily ? 'DAILY COMPLETE' : isEndless ? 'ENDLESS COMPLETE' : 'LEVEL COMPLETE'}
        </h2>
        <span className="completion-level-tag">
          {isDaily 
            ? 'DAILY PUZZLE CLEARED' 
            : isEndless 
              ? `ENDLESS ${endlessLevel} CLEARED (Diff ${level?.difficulty || 0})`
              : `LEVEL ${level?.id || 1} CLEARED`}
        </span>
        {hintsUsedLevel > 0 && (
          <span className="completion-level-tag" style={{ color: 'var(--accent-amber)', marginTop: '4px', background: 'rgba(251, 191, 36, 0.1)' }}>
            HINT PENALTY APPLIED (-{hintsUsedLevel === 1 ? 10 : hintsUsedLevel === 2 ? 25 : 50}%)
          </span>
        )}
        
        {/* Phase 3 Route UI Feedback */}
        {level?.longRouteMinMoves && moves >= level.longRouteMinMoves && stars <= 2 && (
          <span className="completion-level-tag" style={{ color: 'var(--accent-amber)', marginTop: '4px', background: 'rgba(251, 191, 36, 0.1)' }}>
            SAFE ROUTE TAKEN (MAX 2★)
          </span>
        )}

        {/* Dynamic Stars Row — each star animates individually */}
        <div className="completion-stars" aria-label={`${stars} of 3 stars earned`}>
          {[1, 2, 3].map(index => {
            const isEarned = index <= stars;
            const delay = isEarned
              ? 0.3 + (index - 1) * 0.25
              : 0.3 + stars * 0.25 + (index - stars) * 0.12;
            return (
              <span
                key={index}
                className={`completion-star ${isEarned ? 'star-earned' : 'star-unearned'}`}
                style={{ animationDelay: `${delay}s` }}
              >
                ★
              </span>
            );
          })}
        </div>

        {/* Stats Summary: Moves, Time, Remaining Lives */}
        <div className="completion-stats-grid">
          <div className="completion-stat-item">
            <span className="completion-stat-num">{moves}</span>
            <span className="completion-stat-label">MOVES</span>
            {level?.optimalSolutionLength ? (
              <>
                <span className="completion-stat-sub">Optimal: {level.optimalSolutionLength}</span>
                <span className="completion-stat-sub" style={{ color: moves <= level.optimalSolutionLength ? 'var(--accent-green)' : 'inherit' }}>
                  Eff: {Math.max(0, Math.round((level.optimalSolutionLength / Math.max(1, moves)) * 100))}%
                </span>
              </>
            ) : level?.parMoves ? (
              <span className="completion-stat-sub">Par: {level.parMoves}</span>
            ) : null}
          </div>

          <div className="completion-stat-item">
            <span className="completion-stat-num">{formattedTime}</span>
            <span className="completion-stat-label">TIME</span>
          </div>

          <div className="completion-stat-item">
            <div className="completion-hearts-row" aria-label={`${lives} of ${maxLives} lives remaining`}>
              {Array.from({ length: maxLives }).map((_, i) => (
                <span
                  key={i}
                  className={`comp-heart ${i < lives ? 'comp-heart-filled' : 'comp-heart-empty'}`}
                >
                  {i < lives ? '♥' : '♡'}
                </span>
              ))}
            </div>
            <span className="completion-stat-label">LIVES</span>
          </div>
        </div>

        {pointsEarned !== undefined && pointsEarned > 0 && (
          <div className="completion-points-banner" style={{ marginTop: '16px', padding: '12px', background: 'var(--color-surface-dim)', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', letterSpacing: '1px', marginBottom: '4px' }}>POINTS EARNED</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary)' }}>+{pointsEarned}</div>
            {isDaily && dailyBonusPoints && dailyBonusPoints > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--color-accent)', marginTop: '4px', fontWeight: 'bold' }}>INCLUDES {dailyBonusPoints} DAILY BONUS!</div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="modal-actions completion-actions">
          {isTransitioning ? (
            <div className="ad-loading-text">Loading...</div>
          ) : isDaily ? (
            <button className="btn-primary btn-next-level" onClick={handleLevels} autoFocus>
              BACK TO MENU
            </button>
          ) : (
            <>
              <button className="btn-primary btn-next-level" onClick={handleNext} autoFocus>
                {isEndless ? 'NEXT ENDLESS' : 'NEXT'}
              </button>
              <div className="btn-group-secondary">
                <button className="btn-secondary" onClick={handleReplay}>
                  Replay
                </button>
                <button className="btn-secondary" onClick={handleLevels}>
                  {isEndless ? 'Menu' : 'Levels'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};