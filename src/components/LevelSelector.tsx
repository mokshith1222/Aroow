import React, { useState } from 'react';
import { LevelLoader } from '../game/LevelLoader';
import { WorldManager } from '../data/worlds';
import { StorageService } from '../services/StorageService';
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
  const storage = StorageService.getInstance();
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();

  const unlockedLevel = storage.getUnlockedLevel();

  // Find world of current level or unlocked level to auto-select
  const initialWorld = WorldManager.getWorldForLevel(currentLevelId || unlockedLevel || 1);
  const [selectedWorldId, setSelectedWorldId] = useState<number>(initialWorld.id);

  const allWorlds = WorldManager.getAllWorlds(LevelLoader.MAX_LEVELS);
  const selectedWorld = WorldManager.getWorld(selectedWorldId) || allWorlds[0];
  const currentWorldLevels = LevelLoader.getLevelsByWorld(selectedWorldId);

  const handleBack = () => {
    audio.playButton();
    haptics.button();
    onBack();
  };

  const handleWorldSelect = (worldId: number, isUnlocked: boolean) => {
    if (isUnlocked) {
      audio.playButton();
      haptics.button();
      setSelectedWorldId(worldId);
    } else {
      audio.playInvalid();
      haptics.invalid();
    }
  };

  const handleLevelClick = (levelId: number) => {
    audio.playButton();
    haptics.button();
    onSelectLevel(levelId);
  };

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
            {selectedWorld.name} • Lv {selectedWorld.startLevel}–{selectedWorld.endLevel}
          </span>
        </div>
        <div style={{ width: 40 }} />
      </header>

      {/* World Tabs */}
      <div className="world-tabs" role="tablist" aria-label="World selection">
        {allWorlds.map(world => {
          const isUnlocked = WorldManager.isWorldUnlocked(world.id, unlockedLevel);
          const isSelected = world.id === selectedWorldId;

          return (
            <button
              key={world.id}
              role="tab"
              aria-selected={isSelected}
              className={`world-tab ${isSelected ? 'active' : ''} ${!isUnlocked ? 'world-locked' : ''}`}
              onClick={() => handleWorldSelect(world.id, isUnlocked)}
              title={isUnlocked ? world.name : `Locked (Reach Level ${world.startLevel})`}
            >
              <span className="world-tab-icon">
                {isUnlocked ? world.icon : '🔒'}
              </span>
              <span className="world-tab-name">{world.name}</span>
            </button>
          );
        })}
      </div>

      {/* Level Grid */}
      <div className="level-grid" role="region" aria-label="Levels">
        {currentWorldLevels.map(lvl => {
          const isUnlocked = lvl.id <= unlockedLevel;
          const isCurrent = lvl.id === currentLevelId;
          const record = storage.getLevelRecord(lvl.id);
          const isCompleted = !!(record && record.stars > 0);
          const stars = record?.stars || 0;

          return (
            <button
              key={lvl.id}
              className={`level-card ${isUnlocked ? 'unlocked' : 'locked'} ${
                isCurrent ? 'current' : ''
              } ${isCompleted ? 'completed' : ''}`}
              disabled={!isUnlocked}
              onClick={() => handleLevelClick(lvl.id)}
              aria-label={`Level ${lvl.id}, ${isCompleted ? `${stars} stars earned` : isUnlocked ? 'Unlocked' : 'Locked'}`}
            >
              {/* Completed Checkmark Indicator */}
              {isCompleted && (
                <span className="level-completed-badge" title="Completed">
                  ✓
                </span>
              )}

              {/* Level Number */}
              <span className="level-number">{lvl.id}</span>

              {/* Status / Best Stars */}
              {isUnlocked ? (
                <div className="level-stars" aria-hidden="true">
                  <span className={stars >= 1 ? 'star-filled' : 'star-empty'}>★</span>
                  <span className={stars >= 2 ? 'star-filled' : 'star-empty'}>★</span>
                  <span className={stars >= 3 ? 'star-filled' : 'star-empty'}>★</span>
                </div>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="lock-icon"
                  aria-hidden="true"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};