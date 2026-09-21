import { useState, useEffect, useCallback } from 'react';
import { useGameEngine } from './game/useGameEngine';
import { HomeScreen } from './components/HomeScreen';
import { LevelSelector } from './components/LevelSelector';
import { LevelHeader } from './components/LevelHeader';
import { GameBoard } from './components/GameBoard';
import { GameControls } from './components/GameControls';
import { LevelComplete } from './components/LevelComplete';
import { GameOver } from './components/GameOver';
import { Settings } from './components/Settings';
import { ShopScreen } from './components/ShopScreen';
import { AchievementToast } from './components/AchievementToast';
import { AchievementsModal } from './components/AchievementsModal';
import { AdBanner } from './components/AdBanner';
import { HintModal } from './components/HintModal';
import { StorageService } from './services/StorageService';
import { AdService } from './services/AdService';
import { AudioService } from './services/AudioService';
import { HapticService } from './services/HapticService';
import { AnalyticsService } from './services/AnalyticsService';
import './App.css';

function App() {
  const { snapshot, engine } = useGameEngine();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [showShop, setShowShop] = useState<boolean>(false);
  const [shopMode, setShopMode] = useState<'SHOP' | 'INVENTORY'>('SHOP');
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [previewBackground, setPreviewBackground] = useState<string | null>(null);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);

  const activeTheme = previewTheme || snapshot.equippedTheme || 'theme_classic';
  const activeBackground = previewBackground || snapshot.equippedBackground || 'bg_clean';

  // Initialize analytics session and lifecycle
  useEffect(() => {
    const analytics = AnalyticsService.getInstance();
    const adService = AdService.getInstance();
    analytics.startSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        analytics.endSession();
        adService.handleAppBackground();
      } else if (document.visibilityState === 'visible') {
        analytics.startSession();
        adService.handleAppForeground();
      }
    };

    const handleBeforeUnload = () => {
      analytics.endSession();
      adService.handleAppBackground();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      analytics.endSession();
    };
  }, []);

  // Initialize storage preferences with audio/haptics services on mount
  useEffect(() => {
    const storage = StorageService.getInstance();
    const audio = AudioService.getInstance();
    const haptics = HapticService.getInstance();

    audio.setSoundEnabled(storage.getSoundEnabled());
    audio.setMusicEnabled(storage.getMusicEnabled());
    haptics.setEnabled(storage.getHapticsEnabled());

    if (!snapshot.level) {
      engine.loadLevel(storage.getUnlockedLevel() || 1);
    }

    // Auto-start ambient music on first user interaction if enabled
    const handleFirstGesture = () => {
      if (storage.getMusicEnabled()) {
        audio.startMusic();
      }
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [engine, snapshot.level]);

  // Handle Play from Home
  const handlePlay = () => {
    const storage = StorageService.getInstance();
    const targetLevel = storage.getUnlockedLevel() || 1;
    engine.startLevel(targetLevel);
  };

  // Handle Play Daily
  const handlePlayDaily = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    engine.startDailyLevel(todayStr);
  };

  // Handle Level Select
  const handleSelectLevel = useCallback((levelId: number) => {
    engine.startLevel(levelId);
  }, [engine]);

  // Game actions memoized to prevent re-rendering GameBoard/Controls
  const handleMove = useCallback((dir: import('./game/types').Direction) => engine.move(dir), [engine]);
  const handleUndo = useCallback(() => engine.undo(), [engine]);
  const handleRestart = useCallback(() => engine.restart(), [engine]);
  const handlePause = useCallback(() => engine.pause(), [engine]);
  const handleGoToLevelSelect = useCallback(() => engine.goToLevelSelect(), [engine]);
  const handleGoToMenu = useCallback(() => engine.goToMenu(), [engine]);
  const handleNextLevel = useCallback(() => engine.nextLevel(), [engine]);
  const handleRevive = useCallback(() => engine.reviveWithAd(), [engine]);

  // Rewarded hint: player explicitly requests hint via ad
  const handleHintClick = useCallback(() => {
    setShowHintModal(true);
  }, []);

  const handleWatchAdForUndo = useCallback(() => {
    AdService.getInstance().showRewardedAd(
      () => engine.addUndos(3),
      undefined,
      'generic'
    );
  }, [engine]);

  // Global hotkeys for Undo (Z) and Restart (R)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'z' || e.key === 'Z') {
        handleUndo();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRestart();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRestart]);

  return (
    <div className={`app-viewport bg-pattern-${activeBackground}`} data-theme={activeTheme}>
      {/* Finite State: MENU */}
      {snapshot.state === 'MENU' && !showShop && (
        <>
          <HomeScreen
            onPlay={handlePlay}
            onPlayDaily={handlePlayDaily}
            onPlayEndless={() => engine.startEndlessLevel()}
            onLevelSelect={() => engine.goToLevelSelect()}
            onOpenShop={(mode = 'SHOP') => {
              setShopMode(mode);
              setShowShop(true);
            }}
            onOpenSettings={() => setShowSettings(true)}
            onOpenAchievements={() => setShowAchievements(true)}
          />
          {/* Banner ad below HomeScreen — never during gameplay */}
          <AdBanner />
        </>
      )}
      
      {snapshot.state === 'MENU' && showShop && (
        <ShopScreen
          onBack={() => {
            setPreviewTheme(null);
            setPreviewBackground(null);
            setShowShop(false);
          }}
          initialMode={shopMode}
          previewTheme={previewTheme}
          onPreviewTheme={setPreviewTheme}
          previewBackground={previewBackground}
          onPreviewBackground={setPreviewBackground}
        />
      )}

      {/* Finite State: LEVEL_SELECT */}
      {snapshot.state === 'LEVEL_SELECT' && (
        <LevelSelector
          currentLevelId={snapshot.level?.id || 1}
          onSelectLevel={handleSelectLevel}
          onBack={handleGoToMenu}
        />
      )}

      {/* Finite States: PLAYING, PAUSED, LEVEL_COMPLETE, GAME_OVER */}
      {['PLAYING', 'PAUSED', 'LEVEL_COMPLETE', 'GAME_OVER'].includes(snapshot.state) &&
        snapshot.level && (
          <div className="game-screen">
            {/* Top: LEVEL number and Lives */}
            <LevelHeader
              level={snapshot.level}
              lives={snapshot.lives}
              maxLives={snapshot.maxLives}
              elapsedSeconds={snapshot.elapsedSeconds}
              canUndo={snapshot.canUndo}
              isDailyMode={snapshot.isDailyMode}
              isEndlessMode={snapshot.isEndlessMode}
              endlessLevel={snapshot.endlessLevel}
              onPause={handlePause}
              onOpenLevelSelect={handleGoToLevelSelect}
            />

            {/* Center: GAME BOARD (Visual Hero) */}
            <main className="game-content">
              <GameBoard
                level={snapshot.level}
                playerPos={snapshot.playerPos}
                playerDirection={engine.getPlayer().getDirection()}
                invalidAttempt={snapshot.invalidMoveAttempted}
                hitVisitedCell={snapshot.hitVisitedCell}
                lastFailedTargetPos={snapshot.lastFailedTargetPos}
                isWon={snapshot.isWon}
                completedPath={snapshot.completedPath}
                activeGates={snapshot.activeGates}
                collectedKeys={snapshot.collectedKeys}
                equippedCharacter={snapshot.equippedCharacter}
                equippedGate={snapshot.equippedGate}
                gateAnimationState={snapshot.gateAnimationState}
                onMove={handleMove}
              />
            </main>

            {/* Bottom: Moves, Undo, Restart, optional Hint */}
            <GameControls
              moves={snapshot.moves}
              canUndo={snapshot.canUndo}
              undosRemaining={snapshot.undosRemaining}
              onUndo={handleUndo}
              onWatchAdForUndo={handleWatchAdForUndo}
              onRestart={handleRestart}
              onRequestHint={handleHintClick}
              hintAdLoading={false}
            />

            {/* Overlays */}
            {snapshot.state === 'PAUSED' && (
              <div className="modal-overlay" role="dialog" aria-labelledby="pause-title">
                <div className="modal-card">
                  <h2 id="pause-title" className="modal-title">
                    PAUSED
                  </h2>
                  <div className="modal-actions">
                    <button
                      className="btn-primary"
                      onClick={() => {
                        AudioService.getInstance().playButton();
                        HapticService.getInstance().button();
                        engine.resume();
                      }}
                    >
                      Resume
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        AudioService.getInstance().playButton();
                        HapticService.getInstance().button();
                        engine.restart();
                      }}
                    >
                      Restart Level
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        AudioService.getInstance().playButton();
                        HapticService.getInstance().button();
                        engine.goToLevelSelect();
                      }}
                    >
                      Level Select
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        AudioService.getInstance().playButton();
                        HapticService.getInstance().button();
                        setShowSettings(true);
                      }}
                    >
                      Settings
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        AudioService.getInstance().playButton();
                        HapticService.getInstance().button();
                        engine.goToMenu();
                      }}
                    >
                      Main Menu
                    </button>
                  </div>
                </div>
              </div>
            )}

            {snapshot.state === 'LEVEL_COMPLETE' && (
              <LevelComplete
                level={snapshot.level}
                moves={snapshot.moves}
                elapsedSeconds={snapshot.elapsedSeconds}
                stars={snapshot.stars}
                lives={snapshot.lives}
                maxLives={snapshot.maxLives}
                pointsEarned={snapshot.pointsEarned}
                isDaily={snapshot.isDailyMode}
                dailyBonusPoints={snapshot.dailyBonusPoints}
                isEndless={snapshot.isEndlessMode}
                endlessLevel={snapshot.endlessLevel}
                justUnlockedStage={snapshot.justUnlockedStage}
                onNextLevel={handleNextLevel}
                onReplay={handleRestart}
                onLevelSelect={handleGoToLevelSelect}
              />
            )}

            {snapshot.state === 'GAME_OVER' && (
              <GameOver
                level={snapshot.level}
                moves={snapshot.moves}
                onRetry={handleRestart}
                onLevelSelect={handleGoToLevelSelect}
                onRevive={handleRevive}
                isEndlessMode={snapshot.isEndlessMode}
                endlessLevel={snapshot.endlessLevel}
              />
            )}

            {showHintModal && (
              <HintModal 
                onClose={() => setShowHintModal(false)}
                onApplyHint={(level) => engine.requestHint(level)}
              />
            )}
          </div>
        )}

      {/* Global Settings Modal */}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onResetProgress={() => {
            engine.loadLevel(1);
          }}
        />
      )}

      {/* Global Achievements Modal */}
      {showAchievements && (
        <AchievementsModal
          onClose={() => setShowAchievements(false)}
        />
      )}

      {/* Subtle floating Achievement Toast */}
      <AchievementToast />
    </div>
  );
}

export default App;
