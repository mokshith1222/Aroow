import React from 'react';
import type { LevelData } from '../game/types';
import { getMotivationalQuote } from '../utils/quotes';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';

interface LevelStartOverlayProps {
  level: LevelData | null;
  onStart: () => void;
}

export const LevelStartOverlay: React.FC<LevelStartOverlayProps> = ({ level, onStart }) => {
  if (!level) return null;

  const handleStart = () => {
    AudioService.getInstance().playButton();
    HapticService.getInstance().button();
    onStart();
  };

  const targetMoves = level.targetMoves ?? level.optimalSolutionLength ?? level.parMoves ?? 0;
  const quote = getMotivationalQuote(level.id, -1);

  return (
    <div className="modal-overlay level-start-overlay" role="dialog" aria-labelledby="start-title">
      <div className="modal-card level-start-card">
        <h2 id="start-title" className="modal-title level-start-title">
          LEVEL {level.id}
        </h2>
        
        <div className="target-banner">
          <div className="target-banner-stars">★ 3-STAR TARGET</div>
          <div className="target-banner-moves">{targetMoves} MOVES</div>
        </div>

        <p className="start-quote">
          "{quote}"
        </p>

        <div className="modal-actions">
          <button className="btn-primary btn-start-play" onClick={handleStart} autoFocus>
            PLAY
          </button>
        </div>
      </div>
    </div>
  );
};
