import React from 'react';
import type { LevelData } from '../game/types';
import { Lives } from './Lives';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';

interface LevelHeaderProps {
  level: LevelData | null;
  lives: number;
  maxLives: number;
  elapsedSeconds: number;
  canUndo: boolean;
  isDailyMode?: boolean;
  isEndlessMode?: boolean;
  endlessLevel?: number;
  onPause: () => void;
  onOpenLevelSelect: () => void;
}

export const LevelHeader: React.FC<LevelHeaderProps> = ({
  level,
  lives,
  maxLives,
  elapsedSeconds,
  canUndo,
  isDailyMode,
  isEndlessMode,
  endlessLevel,
  onPause,
  onOpenLevelSelect
}) => {
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();

  const handleLevelSelect = () => {
    audio.playButton();
    haptics.button();
    onOpenLevelSelect();
  };

  const handlePause = () => {
    audio.playButton();
    haptics.button();
    onPause();
  };

  return (
    <header className="level-header">
      <div className="header-left">
        <button
          className="icon-btn header-nav-btn"
          onClick={handleLevelSelect}
          aria-label="Level Select"
          title="Back to Levels"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="header-center">
        <h1 className="level-title-text">
          {isDailyMode ? 'DAILY PUZZLE' : isEndlessMode ? `ENDLESS ${endlessLevel}` : `LEVEL ${level?.id || 1}`}
        </h1>
        {isEndlessMode && level?.difficulty !== undefined && (
          <span style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '-4px', display: 'block', textAlign: 'center' }}>
            Diff {level.difficulty}
          </span>
        )}
        <Lives lives={lives} maxLives={maxLives} />
        <div className="challenge-strip" aria-label="Level challenge rules">
          {level?.challenge && (
            <span className="challenge-tag">
              {level.challenge.maxLives === 1 ? 'EXTREME' : level.challenge.maxLives < 3 ? 'STRICT' : 'CLASSIC'}
            </span>
          )}
          {level?.timeLimit && (
            <span className={elapsedSeconds >= level.timeLimit * 0.8 ? 'challenge-value challenge-warning' : 'challenge-value'}>
              {Math.max(0, level.timeLimit - elapsedSeconds)}s
            </span>
          )}
          {level?.challenge && !level.challenge.allowUndo && (
            <span className="challenge-value">NO UNDO</span>
          )}
          {level?.challenge?.maxUndoUses !== undefined && level.challenge.maxUndoUses > 0 && (
            <span className="challenge-value">UNDO {canUndo ? 'READY' : 'USED'}</span>
          )}
        </div>
      </div>

      <div className="header-right">
        <button
          className="icon-btn header-nav-btn"
          onClick={handlePause}
          aria-label="Pause game"
          title="Pause"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
            <line x1="8" y1="5" x2="8" y2="19" strokeLinecap="round" />
            <line x1="16" y1="5" x2="16" y2="19" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
};