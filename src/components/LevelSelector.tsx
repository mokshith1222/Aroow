import React, { useState, useEffect } from 'react';
import { ProgressionManager, Stage } from '../game/ProgressionManager';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';

interface LevelSelectorProps {
  currentLevelId: number;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  currentLevelId,
  onSelectLevel,
  onBack
}) => {
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();

  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<number>(1);

  useEffect(() => {
    const loadedStages = ProgressionManager.getProgressionTree();
    setStages(loadedStages);

    // Auto-select the stage containing the current level
    const currentStage = loadedStages.find(
      s => currentLevelId >= s.startLevel && currentLevelId <= s.endLevel
    );
    if (currentStage) {
      setSelectedStageId(currentStage.stageId);
    }
  }, [currentLevelId]);

  const selectedStage = stages.find(s => s.stageId === selectedStageId) || stages[0];

  const handleBack = () => {
    audio.playButton();
    haptics.button();
    onBack();
  };

  const handleStageSelect = (stageId: number, isUnlocked: boolean, requirement: string | null) => {
    if (isUnlocked) {
      audio.playButton();
      haptics.button();
      setSelectedStageId(stageId);
    } else {
      audio.playInvalid();
      haptics.invalid();
      if (requirement) {
        window.alert(requirement);
      }
    }
  };

  const handleLevelClick = (levelId: number, isUnlocked: boolean) => {
    if (!isUnlocked) {
      audio.playInvalid();
      haptics.invalid();
      return;
    }
    audio.playButton();
    haptics.button();
    onSelectLevel(levelId);
  };

  if (!stages.length) return null;

  return (
    <div className="screen-container level-selector-screen">
      <header className="screen-header">
        <button className="header-btn" onClick={handleBack} aria-label="Back to Menu">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="screen-title-group">
          <h1 className="screen-title">SELECT LEVEL</h1>
          <span className="screen-subtitle">
            {selectedStage?.stageName} • ★ {selectedStage?.totalStarsEarned}/{selectedStage?.totalStarsAvailable}
          </span>
        </div>
        <div style={{ width: 40 }} />
      </header>

      {/* World Tabs */}
      <div className="world-tabs" role="tablist" aria-label="Stage selection">
        {stages.map(stage => {
          const isSelected = stage.stageId === selectedStageId;
          
          return (
            <button
              key={stage.stageId}
              role="tab"
              aria-selected={isSelected}
              className={`world-tab ${isSelected ? 'active' : ''} ${!stage.unlockedStatus ? 'world-locked' : ''}`}
              onClick={() => handleStageSelect(stage.stageId, stage.unlockedStatus, stage.unlockRequirement)}
              title={stage.unlockedStatus ? stage.stageName : stage.unlockRequirement || 'Locked'}
            >
              <div className="world-tab-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="world-tab-icon">
                    {stage.unlockedStatus ? stage.icon : '🔒'}
                  </span>
                  <span className="world-tab-name">{stage.stageName}</span>
                </div>
                {stage.unlockedStatus ? (
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    ★ {stage.totalStarsEarned}/{stage.totalStarsAvailable}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', opacity: 0.6, whiteSpace: 'nowrap' }}>
                    {stage.unlockRequirement}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Level Grid */}
      <div className="level-grid" role="region" aria-label="Levels">
        {selectedStage?.levels.map(lvl => {
          const isCurrent = lvl.levelId === currentLevelId;
          const isLocked = !lvl.isUnlocked;

          return (
            <button
              key={lvl.levelId}
              className={`level-card ${lvl.isUnlocked ? 'unlocked' : 'locked'} ${
                isCurrent ? 'current' : ''
              } ${lvl.completionStatus ? 'completed' : ''}`}
              disabled={isLocked}
              onClick={() => {
                if (isLocked) {
                  audio.playInvalid();
                  haptics.invalid();
                  window.alert(selectedStage?.unlockRequirement || `Complete Level ${lvl.levelId - 1} to unlock Level ${lvl.levelId}.`);
                } else {
                  handleLevelClick(lvl.levelId, lvl.isUnlocked);
                }
              }}
              aria-label={`Level ${lvl.levelId}, ${lvl.completionStatus ? `${lvl.earnedStars} stars earned` : lvl.isUnlocked ? 'Unlocked' : 'Locked'}`}
            >
              {/* Completed Checkmark Indicator */}
              {lvl.completionStatus && (
                <span className="level-completed-badge" title="Completed">
                  ✓
                </span>
              )}

              {/* Lock Icon for locked levels */}
              {isLocked && (
                <span className="level-lock-badge" title="Locked">
                  🔒
                </span>
              )}

              {/* Level Number */}
              <span className="level-number">{lvl.levelId}</span>

              {/* Status / Best Stars */}
              {lvl.isUnlocked ? (
                <div className="level-stars" aria-hidden="true">
                  <span className={lvl.earnedStars >= 1 ? 'star-filled' : 'star-empty'}>★</span>
                  <span className={lvl.earnedStars >= 2 ? 'star-filled' : 'star-empty'}>★</span>
                  <span className={lvl.earnedStars >= 3 ? 'star-filled' : 'star-empty'}>★</span>
                </div>
              ) : (
                <span className="level-locked-label">LOCKED</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};