import { useState, useEffect, useCallback } from 'react';
import { useGameEngine } from './game/useGameEngine';
import { HomeScreen } from './components/HomeScreen';
import { LevelSelector } from './components/LevelSelector';
import { LevelHeader } from './components/LevelHeader';
import { GameBoard } from './components/GameBoard';
import { GameControls } from './components/GameControls';
import { LevelComplete } from './components/LevelComplete';
import { LevelStartOverlay } from './components/LevelStartOverlay';
import { GameOver } from './components/GameOver';
import { Settings } from './components/Settings';
import { ShopScreen } from './components/ShopScreen';
import { AchievementToast } from './components/AchievementToast';
import { AchievementsModal } from './components/AchievementsModal';
import { AdBanner } from './components/AdBanner';
import { HintModal } from './components/HintModal';
import { Touchpad } from './components/Touchpad';
import { StorageService } from './services/StorageService';
import { AdService } from './services/AdService';
import { AudioService } from './services/AudioService';
import { HapticService } from './services/HapticService';
import { AnalyticsService } from './services/AnalyticsService';
import { NotificationService } from './services/NotificationService';
import { AchievementService } from './services/AchievementService';
import { WorldManager } from './data/worlds';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
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
  const [pendingHintLevel, setPendingHintLevel] = useState<1 | 2 | 3 | null>(null);
  const [showNotifExplainer, setShowNotifExplainer] = useState<boolean>(false);

  const activeTheme = previewTheme || snapshot.equippedTheme || 'theme_classic';
  const activeBackground = previewBackground || snapshot.equippedBackground || 'bg_clean';
  const activeTouchpad = snapshot.equippedTouchpad || 'touchpad_default';

  // Initialize NotificationService on mount
  useEffect(() => {
    const notifService = NotificationService.getInstance();
    notifService.initialize();

    // Subscribe to achievement unlocks — fire notifications
    const achievementService = AchievementService.getInstance();
    const unsubAchievement = achievementService.subscribe((achievement) => {
      notifService.notifyAchievement(achievement);
    });

    // Handle notification taps (when app is open or woken from notification)
    let notifListener: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = (action.notification.extra || {}) as Record<string, unknown>;
        const nav = notifService.handleNotificationTap(extra);
        switch (nav.action) {
          case 'start_level':
            if (nav.levelId && nav.levelId > 0) engine.startLevel(nav.levelId);
            break;
          case 'open_daily': {
            const today = new Date().toISOString().split('T')[0];
            engine.startDailyLevel(today);
            break;
          }
          case 'open_achievements':
            setShowAchievements(true);
            break;
          case 'open_level_select':
            engine.goToLevelSelect();
            break;
          case 'open_home':
          default:
            engine.goToMenu();
            break;
        }
      }).then(l => { notifListener = l; });
    }

    return () => {
      unsubAchievement();
      notifListener?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize analytics session and lifecycle
  useEffect(() => {
    const analytics = AnalyticsService.getInstance();
    const adService = AdService.getInstance();
    const notifService = NotificationService.getInstance();
    analytics.startSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        analytics.endSession();
        adService.handleAppBackground();
        // Schedule unfinished-level reminder if mid-level
        const state = snapshot.state;
        if ((state === 'PLAYING' || state === 'PAUSED' || state === 'LEVEL_START' || state === 'GAME_OVER')
            && snapshot.level && !snapshot.isWon) {
          notifService.scheduleUnfinishedLevelReminder(snapshot.level.id);
        }
      } else if (document.visibilityState === 'visible') {
        analytics.startSession();
        adService.handleAppForeground();
        // Re-evaluate pending notifications now that app is visible
        notifService.onAppForeground(
          snapshot.level?.id ?? null,
          snapshot.state
        );
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
  }, [snapshot.state, snapshot.level, snapshot.isWon]);

  // Handle stage unlock notifications
  useEffect(() => {
    if (snapshot.state === 'LEVEL_COMPLETE' && snapshot.justUnlockedStage && snapshot.level) {
      const notifService = NotificationService.getInstance();
      const currentWorld = WorldManager.getWorldForLevel(snapshot.level.id);
      const nextWorld = WorldManager.getWorld(currentWorld?.id + 1);
      if (nextWorld) {
        notifService.notifyStageUnlocked(nextWorld.id, nextWorld.name);
      }
    }
  }, [snapshot.justUnlockedStage, snapshot.state, snapshot.level]);

  // Handle Cloud Restore Toast
  useEffect(() => {
    if ((window as any).__AROOW_RESTORED) {
      const el = document.createElement('div');
      el.textContent = "Welcome back! Your progress has been restored.";
      el.className = 'restore-toast';
      document.body.appendChild(el);
      
      // Trigger entrance animation
      requestAnimationFrame(() => el.style.opacity = '1');

      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
      }, 4000);
      (window as any).__AROOW_RESTORED = false;
    }
  }, []);

  // Permission explainer: shown after first level completion if not yet asked
  useEffect(() => {
    if (snapshot.state === 'LEVEL_COMPLETE') {
      const storage = StorageService.getInstance();
      const prefs = storage.getNotificationPrefs();
      if (!prefs.permissionExplainerSeen && !prefs.permissionRequested && storage.hasEverPlayed()) {
        // Show our friendly explainer AFTER the level complete overlay renders
        const timer = setTimeout(() => setShowNotifExplainer(true), 1800);
        return () => clearTimeout(timer);
      }
    }
  }, [snapshot.state]);

  // Cancel unfinished-level reminder on level completion
  useEffect(() => {
    if (snapshot.state === 'LEVEL_COMPLETE' && snapshot.level) {
      NotificationService.getInstance().cancelUnfinishedLevelReminder(snapshot.level.id);
    }
  }, [snapshot.state, snapshot.level]);

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

  // Apply the pending hint AFTER the modal has fully unmounted
  useEffect(() => {
    if (!showHintModal && pendingHintLevel !== null) {
      engine.requestHint(pendingHintLevel);
      setPendingHintLevel(null);
    }
  }, [showHintModal, pendingHintLevel, engine]);

  const [undoAdLoading, setUndoAdLoading] = useState(false);

  const handleWatchAdForUndo = useCallback(() => {
    if (undoAdLoading) return;
    setUndoAdLoading(true);
    AdService.getInstance().showRewardedUndo(
      () => {
        engine.addUndos(3);
        setUndoAdLoading(false);
      },
      () => {
        // Failure or closed early
        setUndoAdLoading(false);
      }
    );
  }, [engine, undoAdLoading]);

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

      {/* Finite States: LEVEL_START, PLAYING, PAUSED, LEVEL_COMPLETE, GAME_OVER */}
      {['LEVEL_START', 'PLAYING', 'PAUSED', 'LEVEL_COMPLETE', 'GAME_OVER'].includes(snapshot.state) &&
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
                activeHintCells={snapshot.activeHintCells}
                equippedCharacter={snapshot.equippedCharacter}
                equippedGate={snapshot.equippedGate}
                gateAnimationState={snapshot.gateAnimationState}
                onMove={handleMove}
              />
            </main>

            {/* Touchpad Area - placed exactly between GameBoard and GameControls */}
            <Touchpad
              onMove={handleMove}
              levelId={snapshot.level.id}
              equippedSkin={activeTouchpad}
            />

            {/* Bottom: Moves, Undo, Restart, optional Hint */}
            <GameControls
              moves={snapshot.moves}
              targetMoves={snapshot.level.targetMoves ?? snapshot.level.optimalSolutionLength ?? snapshot.level.parMoves ?? 0}
              canUndo={snapshot.canUndo}
              undosRemaining={snapshot.undosRemaining}
              onUndo={handleUndo}
              onWatchAdForUndo={handleWatchAdForUndo}
              onRestart={handleRestart}
              onRequestHint={handleHintClick}
              hintAdLoading={false}
              undoAdLoading={undoAdLoading}
            />

            {/* Overlays */}
            {snapshot.state === 'LEVEL_START' && (
              <LevelStartOverlay 
                level={snapshot.level} 
                onStart={() => engine.startPlaying()} 
              />
            )}

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
                onApplyHint={(level) => {
                  setPendingHintLevel(level);
                  setShowHintModal(false);
                }}
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

      {/* Notification Permission Explainer */}
      {showNotifExplainer && (
        <div className="modal-overlay" role="dialog" aria-labelledby="notif-explainer-title">
          <div className="modal-card">
            <h2 id="notif-explainer-title" className="modal-title" style={{ fontSize: '1.1rem' }}>
              🔔 Stay in the loop
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.75rem 0 1.25rem' }}>
              Want reminders when you leave a puzzle unfinished?
            </p>
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={async () => {
                  setShowNotifExplainer(false);
                  StorageService.getInstance().setNotificationPrefs({ permissionExplainerSeen: true });
                  await NotificationService.getInstance().requestPermission();
                }}
              >
                Enable Notifications
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowNotifExplainer(false);
                  StorageService.getInstance().setNotificationPrefs({ permissionExplainerSeen: true });
                }}
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle floating Achievement Toast */}
      <AchievementToast />
    </div>
  );
}

export default App;
