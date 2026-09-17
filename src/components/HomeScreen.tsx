import React from 'react';
import { StorageService } from '../services/StorageService';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';

interface HomeScreenProps {
  onPlay: () => void;
  onPlayDaily: () => void;
  onPlayEndless: () => void;
  onLevelSelect: () => void;
  onOpenShop: (initialMode?: 'SHOP' | 'INVENTORY') => void;
  onOpenSettings: () => void;
  onOpenAchievements: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlay,
  onPlayDaily,
  onPlayEndless,
  onLevelSelect,
  onOpenShop,
  onOpenSettings,
  onOpenAchievements
}) => {
  const storage = StorageService.getInstance();
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();

  const unlocked = storage.getUnlockedLevel();
  const totalStars = storage.getTotalStars();
  const currentPoints = storage.getCurrentPoints();
  const unlockedAchievementsCount = storage.getUnlockedAchievements().length;

  const handlePlayClick = () => {
    audio.playButton();
    haptics.button();
    onPlay();
  };

  const handleLevelSelectClick = () => {
    audio.playButton();
    haptics.button();
    onLevelSelect();
  };

  const handleSettingsClick = () => {
    audio.playButton();
    haptics.button();
    onOpenSettings();
  };

  const handleShopClick = (mode: 'SHOP' | 'INVENTORY' = 'SHOP') => {
    audio.playButton();
    haptics.button();
    onOpenShop(mode);
  };

  const handleAchievementsClick = () => {
    audio.playButton();
    haptics.button();
    onOpenAchievements();
  };

  const handlePlayDailyClick = () => {
    audio.playButton();
    haptics.button();
    onPlayDaily();
  };

  const handlePlayEndlessClick = () => {
    audio.playButton();
    haptics.button();
    onPlayEndless();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isDailyComplete = storage.getDailyCompletedDate() === todayStr;
  
  const endlessStats = storage.getEndlessStats();
  const nextEndlessLevel = endlessStats.highestLevel + 1;

  return (
    <div className="screen-container home-screen">
      <div className="home-brand">
        <div className="brand-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="brand-title">ARROW</h1>
        <p className="brand-subtitle">MINIMALIST VECTOR PUZZLE</p>
      </div>

      <div className="home-meta">
        <div className="star-pill">
          <span className="star-char">★</span>
          <span>{totalStars} Stars</span>
        </div>
        <div className="star-pill" style={{ marginLeft: '8px' }}>
          <span className="star-char">💎</span>
          <span>{currentPoints} Pts</span>
        </div>
        <div
          className="star-pill"
          style={{ marginLeft: '8px', cursor: 'pointer' }}
          onClick={handleAchievementsClick}
          title="View Achievements"
        >
          <span className="star-char">🏆</span>
          <span>{unlockedAchievementsCount}/10</span>
        </div>
      </div>

      <nav className="home-menu" aria-label="Main menu">
        <button className="btn-primary btn-large" onClick={handlePlayClick}>
          {unlocked > 1 ? `CONTINUE (LVL ${unlocked})` : 'PLAY'}
        </button>

        <div className="daily-puzzle-section" style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-color)' }}>DAILY PUZZLE</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TODAY</span>
          </div>
          {isDailyComplete ? (
            <button className="btn-secondary" style={{ opacity: 0.6, cursor: 'default' }} disabled>
              COMPLETED
            </button>
          ) : (
            <button className="btn-primary" style={{ minHeight: '44px' }} onClick={handlePlayDailyClick}>
              PLAY (500 Pts)
            </button>
          )}
        </div>

        <div className="endless-mode-section" style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>∞</span> ENDLESS MODE
            </span>
            {endlessStats.highestLevel > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MAX LVL {endlessStats.highestLevel}</span>
            )}
          </div>
          {endlessStats.highestLevel > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Best Time: {endlessStats.bestTime === 9999 ? '-' : `${endlessStats.bestTime}s`}</span>
              <span>Best Moves: {endlessStats.bestMoves === 9999 ? '-' : endlessStats.bestMoves}</span>
            </div>
          )}
          <button className="btn-primary" style={{ minHeight: '44px', background: 'var(--primary-color)' }} onClick={handlePlayEndlessClick}>
            PLAY ENDLESS (LVL {nextEndlessLevel})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={handleLevelSelectClick}>
            LEVELS
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={handleAchievementsClick}>
            ACHIEVEMENTS
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleShopClick('SHOP')}>
            SHOP
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleShopClick('INVENTORY')}>
            INVENTORY
          </button>
        </div>

        <button className="btn-secondary" onClick={handleSettingsClick}>
          SETTINGS
        </button>
      </nav>

      <footer className="home-footer">
        <span>SWIPE OR USE ARROW KEYS / WASD</span>
      </footer>
    </div>
  );
};