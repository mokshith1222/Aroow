import React, { useState } from 'react';
import { AchievementService } from '../services/AchievementService';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';
import './AchievementsModal.css';

interface AchievementsModalProps {
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ onClose }) => {
  const service = AchievementService.getInstance();
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();

  const [filter, setFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');

  const allProgress = service.getAllProgress();
  const unlockedCount = allProgress.filter(p => p.isUnlocked).length;
  const totalCount = allProgress.length;

  const filtered = allProgress.filter(item => {
    if (filter === 'UNLOCKED') return item.isUnlocked;
    if (filter === 'LOCKED') return !item.isUnlocked;
    return true;
  });

  const handleClose = () => {
    audio.playButton();
    haptics.button();
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-labelledby="achievements-title">
      <div className="modal-card achievements-card">
        {/* Header */}
        <div className="achievements-header">
          <div className="achievements-header-title">
            <h2 id="achievements-title" className="modal-title">ACHIEVEMENTS</h2>
            <span className="achievements-counter-pill">
              🏆 {unlockedCount} / {totalCount} UNLOCKED
            </span>
          </div>
          <button className="achievements-close-btn" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="achievements-filter-tabs">
          <button
            className={`achievements-filter-tab ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => {
              audio.playButton();
              setFilter('ALL');
            }}
          >
            ALL ({totalCount})
          </button>
          <button
            className={`achievements-filter-tab ${filter === 'UNLOCKED' ? 'active' : ''}`}
            onClick={() => {
              audio.playButton();
              setFilter('UNLOCKED');
            }}
          >
            UNLOCKED ({unlockedCount})
          </button>
          <button
            className={`achievements-filter-tab ${filter === 'LOCKED' ? 'active' : ''}`}
            onClick={() => {
              audio.playButton();
              setFilter('LOCKED');
            }}
          >
            LOCKED ({totalCount - unlockedCount})
          </button>
        </div>

        {/* Achievement List */}
        <div className="achievements-list">
          {filtered.map(({ achievement, current, target, isUnlocked, percentage }) => (
            <div
              key={achievement.id}
              className={`achievement-item ${isUnlocked ? 'achievement-unlocked' : 'achievement-locked'}`}
            >
              <div className="achievement-item-icon-box">
                <span className="achievement-item-icon">{achievement.icon}</span>
              </div>

              <div className="achievement-item-info">
                <div className="achievement-item-header">
                  <span className="achievement-item-title">{achievement.title}</span>
                  {isUnlocked ? (
                    <span className="achievement-item-badge unlocked">COMPLETED</span>
                  ) : (
                    <span className="achievement-item-badge locked">
                      {current} / {target}
                    </span>
                  )}
                </div>

                <p className="achievement-item-desc">{achievement.description}</p>

                {/* Progress Bar */}
                <div className="achievement-progress-track">
                  <div
                    className="achievement-progress-bar"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="achievements-footer">
          <button className="btn-secondary" onClick={handleClose} style={{ width: '100%' }}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
