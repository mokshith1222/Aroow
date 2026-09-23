import React, { useState } from 'react';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';
import { StorageService } from '../services/StorageService';
import { AnalyticsService } from '../services/AnalyticsService';
import { AdService } from '../services/AdService';
import { NotificationService } from '../services/NotificationService';
import { DEV_NOTIFICATIONS } from '../config';

interface SettingsProps {
  onClose: () => void;
  onResetProgress?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose, onResetProgress }) => {
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();
  const storage = StorageService.getInstance();
  const analytics = AnalyticsService.getInstance();
  const adService = AdService.getInstance();
  const notifService = NotificationService.getInstance();

  const [soundOn, setSoundOn] = useState<boolean>(!audio.isMuted());
  const [musicOn, setMusicOn] = useState<boolean>(storage.getMusicEnabled());
  const [hapticsOn, setHapticsOn] = useState<boolean>(haptics.isEnabled());
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(storage.getColorMode());

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState(storage.getNotificationPrefs());
  const [showNotifSection, setShowNotifSection] = useState<boolean>(false);

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

  // Notification preference helpers
  const updateNotifPref = <K extends keyof typeof notifPrefs>(key: K, value: typeof notifPrefs[K]) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    storage.setNotificationPrefs({ [key]: value });

    // Side effects on toggle changes
    if (key === 'enabled' && !value) {
      notifService.cancelAll();
    } else if (key === 'enabled' && value) {
      notifService.scheduleDailyPuzzleNotification();
      notifService.scheduleComebackReminder();
    } else if (key === 'dailyPuzzle') {
      if (value) notifService.scheduleDailyPuzzleNotification();
      else notifService.cancelDailyPuzzleNotification();
    } else if (key === 'comeback') {
      if (value) notifService.scheduleComebackReminder();
      else notifService.cancelComebackReminder();
    } else if (key === 'dailyPuzzleHour' || key === 'dailyPuzzleMinute') {
      notifService.scheduleDailyPuzzleNotification();
    }
    audio.playButton();
    haptics.button();
  };

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${notifPrefs.dailyPuzzleMinute.toString().padStart(2, '0')} ${ampm}`;
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

        <div className="settings-scroll-area">
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

        {/* Privacy Section */}
        <div className="settings-analytics-section" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Privacy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              onClick={() => {
                audio.playButton();
                haptics.button();
                window.open('https://aroow.vercel.app/privacy', '_blank');
              }}
            >
              Privacy Policy
            </button>
            {adService.isPrivacyOptionsRequired() && (
              <button
                className="btn-secondary"
                onClick={() => {
                  audio.playButton();
                  haptics.button();
                  adService.showPrivacyChoices();
                }}
              >
                Privacy Choices
              </button>
            )}
          </div>
        </div>

        {/* Notifications Section */}
        <div className="settings-analytics-section" style={{ marginTop: '0', marginBottom: '1rem' }}>
          <button
            className="btn-secondary metrics-toggle-btn"
            onClick={() => {
              setShowNotifSection(!showNotifSection);
              audio.playButton();
              haptics.button();
            }}
          >
            {showNotifSection ? '▲ Notifications' : '▼ Notifications'}
          </button>

          {showNotifSection && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

              {/* Master toggle */}
              <div className="setting-item">
                <span className="setting-label">Notifications</span>
                <button
                  className={`toggle-btn ${notifPrefs.enabled ? 'active' : ''}`}
                  onClick={() => updateNotifPref('enabled', !notifPrefs.enabled)}
                  aria-pressed={notifPrefs.enabled}
                >
                  <div className="toggle-thumb" />
                </button>
              </div>

              {notifPrefs.enabled && (
                <>
                  <div className="setting-item" style={{ opacity: 0.9 }}>
                    <span className="setting-label" style={{ fontSize: '0.85rem' }}>Unfinished Levels</span>
                    <button className={`toggle-btn ${notifPrefs.unfinishedLevels ? 'active' : ''}`}
                      onClick={() => updateNotifPref('unfinishedLevels', !notifPrefs.unfinishedLevels)}
                      aria-pressed={notifPrefs.unfinishedLevels}><div className="toggle-thumb" /></button>
                  </div>

                  <div className="setting-item" style={{ opacity: 0.9 }}>
                    <span className="setting-label" style={{ fontSize: '0.85rem' }}>Daily Puzzle</span>
                    <button className={`toggle-btn ${notifPrefs.dailyPuzzle ? 'active' : ''}`}
                      onClick={() => updateNotifPref('dailyPuzzle', !notifPrefs.dailyPuzzle)}
                      aria-pressed={notifPrefs.dailyPuzzle}><div className="toggle-thumb" /></button>
                  </div>

                  {notifPrefs.dailyPuzzle && (
                    <div className="setting-item" style={{ opacity: 0.85, flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                      <span className="setting-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Daily Puzzle Time</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={notifPrefs.dailyPuzzleHour}
                          onChange={e => updateNotifPref('dailyPuzzleHour', parseInt(e.target.value))}
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                          ))}
                        </select>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatHour(notifPrefs.dailyPuzzleHour)}</span>
                      </div>
                    </div>
                  )}

                  <div className="setting-item" style={{ opacity: 0.9 }}>
                    <span className="setting-label" style={{ fontSize: '0.85rem' }}>Comeback Reminders</span>
                    <button className={`toggle-btn ${notifPrefs.comeback ? 'active' : ''}`}
                      onClick={() => updateNotifPref('comeback', !notifPrefs.comeback)}
                      aria-pressed={notifPrefs.comeback}><div className="toggle-thumb" /></button>
                  </div>

                  <div className="setting-item" style={{ opacity: 0.9 }}>
                    <span className="setting-label" style={{ fontSize: '0.85rem' }}>Achievements</span>
                    <button className={`toggle-btn ${notifPrefs.achievements ? 'active' : ''}`}
                      onClick={() => updateNotifPref('achievements', !notifPrefs.achievements)}
                      aria-pressed={notifPrefs.achievements}><div className="toggle-thumb" /></button>
                  </div>

                  <div className="setting-item" style={{ opacity: 0.9 }}>
                    <span className="setting-label" style={{ fontSize: '0.85rem' }}>New Content</span>
                    <button className={`toggle-btn ${notifPrefs.newContent ? 'active' : ''}`}
                      onClick={() => updateNotifPref('newContent', !notifPrefs.newContent)}
                      aria-pressed={notifPrefs.newContent}><div className="toggle-thumb" /></button>
                  </div>

                  <div className="setting-item" style={{ opacity: 0.9 }}>
                    <span className="setting-label" style={{ fontSize: '0.85rem' }}>Shop &amp; Rewards</span>
                    <button className={`toggle-btn ${notifPrefs.shopRewards ? 'active' : ''}`}
                      onClick={() => updateNotifPref('shopRewards', !notifPrefs.shopRewards)}
                      aria-pressed={notifPrefs.shopRewards}><div className="toggle-thumb" /></button>
                  </div>
                </>
              )}

              {/* DEV test panel — only visible when DEV_NOTIFICATIONS === true */}
              {DEV_NOTIFICATIONS && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>⚙️ DEV: Test Notifications (30s)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                      onClick={() => notifService.devTestUnfinishedReminder(1)}>Test Unfinished Level</button>
                    <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                      onClick={() => notifService.devTestDailyPuzzle()}>Test Daily Puzzle</button>
                    <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                      onClick={() => notifService.devTestComeback()}>Test Comeback</button>
                  </div>
                </div>
              )}
            </div>
          )}
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
    </div>
  );
};