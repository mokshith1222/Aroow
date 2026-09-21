import React, { useState } from 'react';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';
import { StorageService } from '../services/StorageService';
import { AnalyticsService } from '../services/AnalyticsService';

interface SettingsProps {
  onClose: () => void;
  onResetProgress?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose, onResetProgress }) => {
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();
  const storage = StorageService.getInstance();
  const analytics = AnalyticsService.getInstance();

  const [soundOn, setSoundOn] = useState<boolean>(!audio.isMuted());
  const [musicOn, setMusicOn] = useState<boolean>(storage.getMusicEnabled());
  const [hapticsOn, setHapticsOn] = useState<boolean>(haptics.isEnabled());
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(storage.getColorMode());

  const metrics = analytics.getMetrics();

  const handleToggleColorMode = () => {
    const newMode = colorMode === 'dark' ? 'light' : 'dark';
    setColorMode(newMode);
    storage.setColorMode(newMode);
    audio.playButton();
    haptics.button();
  };

  const handleToggleSound = () => {
    const isSoundActive = !soundOn;
    setSoundOn(isSoundActive);
    storage.setSoundEnabled(isSoundActive);
    audio.setSoundEnabled(isSoundActive);
    if (isSoundActive) {
      audio.playMove();
    }
    haptics.button();
  };

  const handleToggleMusic = () => {
    const isMusicActive = !musicOn;
    setMusicOn(isMusicActive);
    storage.setMusicEnabled(isMusicActive);
    audio.setMusicEnabled(isMusicActive);
    audio.playButton();
    haptics.button();
  };

  const handleToggleHaptics = () => {
    const isEnabledNow = haptics.toggle();
    setHapticsOn(isEnabledNow);
    storage.setHapticsEnabled(isEnabledNow);
    if (isEnabledNow) {
      haptics.light();
    }
    audio.playButton();
  };

  const handleConfirmReset = () => {
    storage.resetAllProgress();
    setShowConfirmReset(false);
    onResetProgress?.();
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-labelledby="settings-title">
      <div className="modal-card settings-card">
        <header className="settings-header">
          <h2 id="settings-title" className="modal-title">
            SETTINGS
          </h2>
          <button className="close-btn" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </header>

        <div className="settings-list">
          <div className="setting-item">
            <span className="setting-label">Sound Effects</span>
            <button
              className={`toggle-btn ${soundOn ? 'active' : ''}`}
              onClick={handleToggleSound}
              aria-pressed={soundOn}
            >
              <div className="toggle-thumb" />
            </button>
          </div>

          <div className="setting-item">
            <span className="setting-label">Music</span>
            <button
              className={`toggle-btn ${musicOn ? 'active' : ''}`}
              onClick={handleToggleMusic}
              aria-pressed={musicOn}
            >
              <div className="toggle-thumb" />
            </button>
          </div>

          <div className="setting-item">
            <span className="setting-label">Haptic Vibration</span>
            <button
              className={`toggle-btn ${hapticsOn ? 'active' : ''}`}
              onClick={handleToggleHaptics}
              aria-pressed={hapticsOn}
            >
              <div className="toggle-thumb" />
            </button>
          </div>

          <div className="setting-item">
            <span className="setting-label">Light Mode</span>
            <button
              className={`toggle-btn ${colorMode === 'light' ? 'active' : ''}`}
              onClick={handleToggleColorMode}
              aria-pressed={colorMode === 'light'}
            >
              <div className="toggle-thumb" />
            </button>
          </div>
        </div>

        {/* Analytics & Commercial KPI Telemetry */}
        <div className="settings-analytics-section">
          <button
            className="btn-secondary metrics-toggle-btn"
            onClick={() => setShowMetrics(!showMetrics)}
          >
            {showMetrics ? '▲ Hide Analytics' : '▼ View Analytics & Metrics'}
          </button>

          {showMetrics && (
            <div className="metrics-panel">
              <div className="metrics-row">
                <span className="metric-label">Day 1 Retention</span>
                <span className="metric-value">{metrics.day1Retention.formatted}</span>
              </div>
              <div className="metrics-row">
                <span className="metric-label">Day 7 Retention</span>
                <span className="metric-value">{metrics.day7Retention.formatted}</span>
              </div>
              <div className="metrics-row">
                <span className="metric-label">Average Session</span>
                <span className="metric-value">{metrics.averageSessionFormatted}</span>
              </div>
              <div className="metrics-row">
                <span className="metric-label">Levels / Session</span>
                <span className="metric-value">{metrics.levelsPerSession}</span>
              </div>
              <div className="metrics-row">
                <span className="metric-label">Level Completion Rate</span>
                <span className="metric-value">{metrics.levelCompletionRateFormatted}</span>
              </div>
              <div className="metrics-row">
                <span className="metric-label">Ad Impressions / User</span>
                <span className="metric-value">{metrics.adImpressionsPerUser}</span>
              </div>
              <div className="metrics-row">
                <span className="metric-label">Rewarded Ad Opt-in</span>
                <span className="metric-value">{metrics.rewardedAdOptInFormatted}</span>
              </div>
            </div>
          )}
        </div>

        <div className="settings-danger-zone">
          {showConfirmReset ? (
            <div className="confirm-reset-box">
              <p>Reset all level progress and stars?</p>
              <div className="btn-group-secondary">
                <button className="btn-danger" onClick={handleConfirmReset}>
                  Confirm
                </button>
                <button className="btn-secondary" onClick={() => setShowConfirmReset(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn-text-danger"
              onClick={() => setShowConfirmReset(true)}
            >
              Reset Progress
            </button>
          )}
        </div>
      </div>
    </div>
  );
};