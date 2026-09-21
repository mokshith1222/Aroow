import React, { useEffect } from 'react';
import type { LevelData } from '../game/types';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';
import { AdService } from '../services/AdService';
import { StorageService } from '../services/StorageService';
import { getMotivationalQuote } from '../utils/quotes';

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
  justUnlockedStage?: boolean;
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
  justUnlockedStage = false,
  onNextLevel,
  onReplay,
  onLevelSelect
}) => {
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();
  const adService = AdService.getInstance();
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const nextLevelId = level ? level.id + 1 : 1;
  const isNextUnlocked = isEndless ? true : StorageService.getInstance().isLevelUnlocked(nextLevelId);

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
          <span className="completion-level-tag" style={{ color: 'var(--accent-gold)', marginTop: '4px', background: 'rgba(251, 191, 36, 0.1)' }}>
            HINT PENALTY APPLIED (-{hintsUsedLevel === 1 ? 10 : hintsUsedLevel === 2 ? 25 : 50}%)
          </span>
        )}
        
        {/* Phase 3 Route UI Feedback */}
        {level?.longRouteMinMoves && moves >= level.longRouteMinMoves && stars <= 2 && (
          <span className="completion-level-tag" style={{ color: 'var(--accent-gold)', marginTop: '4px', background: 'rgba(251, 191, 36, 0.1)' }}>
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

        {/* Unlock Notification */}
        {justUnlockedStage && (
          <div className="stage-unlocked-banner" style={{ animationDelay: `${0.3 + stars * 0.25 + 0.5}s` }}>
            <span>🎉 STAGE UNLOCKED! 🎉</span>
          </div>
        )}

        {/* Stats Summary: Moves, Time, Remaining Lives */}
        <div className="completion-stats-grid">
          <div className="completion-stat-item">
            <span className="completion-stat-num" style={{ color: moves <= (level?.targetMoves ?? level?.parMoves ?? 0) ? 'var(--accent-primary)' : 'inherit' }}>{moves}</span>
            <span className="completion-stat-label">MOVES</span>
            <span className="completion-stat-sub">Target: {level?.targetMoves ?? level?.parMoves ?? 0}</span>
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

        {/* Motivational Quote */}
        <div className="completion-quote" style={{
          marginTop: '20px',
          padding: '12px',
          fontStyle: 'italic',
          color: 'var(--text-primary)',
          textAlign: 'center',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          "{getMotivationalQuote(level?.id || 1, stars)}"
        </div>

        {pointsEarned !== undefined && pointsEarned > 0 && (
          <div className="completion-points-banner" style={{ marginTop: '12px', padding: '8px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '4px' }}>POINTS EARNED</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>+{pointsEarned}</div>
            {isDaily && dailyBonusPoints && dailyBonusPoints > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px', fontWeight: 'bold' }}>INCLUDES {dailyBonusPoints} DAILY BONUS!</div>
            )}
          </div>
        )}

        {!isNextUnlocked && !isDaily && !isEndless && (
          <div style={{ marginTop: '14px', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', fontSize: '12px', color: '#f59e0b', textAlign: 'center', fontWeight: 600 }}>
            Next World is Locked! Earn more stars to unlock it.
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
          ) : !isNextUnlocked ? (
            <>
              <button className="btn-primary btn-next-level" onClick={handleLevels} autoFocus>
                SELECT LEVEL
              </button>
              <div className="btn-group-secondary">
                <button className="btn-secondary" onClick={handleReplay}>
                  Replay
                </button>
              </div>
            </>
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