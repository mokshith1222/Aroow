/**
 * NotificationService.ts
 *
 * Centralized service for all local notifications in Aroow.
 *
 * Design principles:
 * - Single responsibility: all notification scheduling lives here.
 * - Native-only: all Capacitor calls are guarded behind Capacitor.isNativePlatform().
 * - No-op on web: the web build continues to work normally.
 * - Deterministic IDs: every notification type has a fixed base ID.
 * - Anti-spam: max 1 reminder per day, min 12h between reminders.
 * - DEV_NOTIFICATIONS flag (in config.ts) — independent of USE_TEST_ADS.
 *
 * Notification ID Ranges:
 *   1000 + levelId  = Unfinished level reminder
 *   2000            = Daily puzzle
 *   3000            = Comeback / inactivity
 *   4000 + index    = Achievement unlocked
 *   5000 + stageId  = Stage unlocked
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type PermissionStatus } from '@capacitor/local-notifications';
import { StorageService, type NotificationPrefs } from './StorageService';
import type { Achievement } from '../data/achievements';
import { DEV_NOTIFICATIONS } from '../config';
import { NotificationCopyService } from './NotificationCopyService';

// ── Notification ID constants ─────────────────────────────────────────────────
const NOTIF_UNFINISHED_BASE = 1000;
const NOTIF_DAILY_PUZZLE    = 2000;
const NOTIF_COMEBACK        = 3000;
const NOTIF_ACHIEVEMENT_BASE = 4000;
const NOTIF_STAGE_BASE      = 5000;

// ── Timing constants (ms) ─────────────────────────────────────────────────────
const UNFINISHED_DELAY_MS  = DEV_NOTIFICATIONS ? 30_000 : 2 * 60 * 60 * 1000;   // 2 hours prod / 30s dev
const COMEBACK_DELAY_DAYS  = DEV_NOTIFICATIONS ? 0 : 3;                           // 3 days prod / immediate dev
const COMEBACK_COOLDOWN_MS = DEV_NOTIFICATIONS ? 60_000 : 7 * 24 * 60 * 60 * 1000; // 7 days prod / 60s dev

// ── Channel IDs ───────────────────────────────────────────────────────────────
const CHANNEL_PUZZLE_REMINDERS = 'aroow_puzzle_reminders';
const CHANNEL_DAILY_PUZZLE     = 'aroow_daily_puzzle';
const CHANNEL_ACHIEVEMENTS     = 'aroow_achievements';
const CHANNEL_UPDATES          = 'aroow_updates';

// ── State stored in localStorage (outside PlayerData, to avoid save bloat) ───
const NOTIF_STATE_KEY = 'aroow_notif_state';

interface NotifState {
  lastReminderTime: number;       // timestamp of last any reminder-type notif
  pendingUnfinishedLevelId: number | null;
  notifiedAchievements: string[]; // IDs that have already been notified
  notifiedStages: number[];       // stageIds that have already been notified
}

function loadNotifState(): NotifState {
  try {
    const raw = window.localStorage?.getItem(NOTIF_STATE_KEY);
    if (raw) return JSON.parse(raw) as NotifState;
  } catch { /* ignore */ }
  return {
    lastReminderTime: 0,
    pendingUnfinishedLevelId: null,
    notifiedAchievements: [],
    notifiedStages: [],
  };
}

function saveNotifState(state: NotifState): void {
  try {
    window.localStorage?.setItem(NOTIF_STATE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export class NotificationService {
  private static instance: NotificationService;
  private storage = StorageService.getInstance();
  private initialized = false;
  private permissionGranted = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Call once on app startup. Sets up channels, checks current permission state,
   * and schedules the daily puzzle notification if enabled.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (!Capacitor.isNativePlatform()) return;

    // Create notification channels
    await this.createChannels();

    // Check current permission without prompting
    const status = await this.checkPermission();
    this.permissionGranted = status === 'granted';

    if (this.permissionGranted) {
      await this.scheduleDailyPuzzleNotification();
      await this.scheduleComebackReminder();
    }
  }

  /** Returns true if OS-level notification permission is granted */
  public async checkPermission(): Promise<PermissionStatus['display']> {
    if (!Capacitor.isNativePlatform()) return 'granted';
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display;
    } catch {
      return 'denied';
    }
  }

  /** Requests OS permission. Should only be called after showing in-app explainer. */
  public async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      const result = await LocalNotifications.requestPermissions();
      this.permissionGranted = result.display === 'granted';
      this.storage.setNotificationPrefs({ permissionRequested: true });
      if (this.permissionGranted) {
        await this.scheduleDailyPuzzleNotification();
        await this.scheduleComebackReminder();
      }
      return this.permissionGranted;
    } catch {
      return false;
    }
  }

  /** Returns current cached permission state (sync, no OS call) */
  public areNotificationsEnabled(): boolean {
    return this.permissionGranted && this.storage.getNotificationPrefs().enabled;
  }

  /**
   * Schedule or update the unfinished-level reminder.
   * Call when the user starts playing a level.
   * Automatically cancels any previously pending unfinished-level reminder first.
   */
  public async scheduleUnfinishedLevelReminder(levelId: number): Promise<void> {
    if (!this.shouldSendReminder('unfinishedLevels')) return;

    const state = loadNotifState();

    // Cancel any previously pending unfinished-level reminder
    if (state.pendingUnfinishedLevelId !== null && state.pendingUnfinishedLevelId !== levelId) {
      await this.cancelUnfinishedLevelReminder(state.pendingUnfinishedLevelId);
    }

    state.pendingUnfinishedLevelId = levelId;
    saveNotifState(state);

    const notifId = NOTIF_UNFINISHED_BASE + levelId;
    const fireAt = new Date(Date.now() + UNFINISHED_DELAY_MS);
    const copy = NotificationCopyService.getInstance().getUnfinishedMessage(levelId);

    await this.schedule({
      id: notifId,
      title: copy.title,
      body: copy.body,
      channelId: CHANNEL_PUZZLE_REMINDERS,
      at: fireAt,
      extra: { type: 'unfinished_level', levelId },
    });
  }

  /** Cancel the unfinished-level reminder for the given level. */
  public async cancelUnfinishedLevelReminder(levelId: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const notifId = NOTIF_UNFINISHED_BASE + levelId;
    await this.cancel([notifId]);

    const state = loadNotifState();
    if (state.pendingUnfinishedLevelId === levelId) {
      state.pendingUnfinishedLevelId = null;
      saveNotifState(state);
    }
  }

  /**
   * Cancel ALL pending unfinished-level reminders.
   * Call when returning to the menu without an active unfinished level.
   */
  public async cancelAllUnfinishedLevelReminders(): Promise<void> {
    const state = loadNotifState();
    if (state.pendingUnfinishedLevelId !== null) {
      await this.cancelUnfinishedLevelReminder(state.pendingUnfinishedLevelId);
    }
  }

  /** Schedule (or reschedule) the daily puzzle notification. */
  public async scheduleDailyPuzzleNotification(): Promise<void> {
    if (!this.shouldSendReminder('dailyPuzzle')) return;

    // Cancel existing first to reschedule (e.g., if time changed)
    await this.cancelDailyPuzzleNotification();

    const prefs = this.storage.getNotificationPrefs();
    const today = new Date().toISOString().split('T')[0];

    // If today's puzzle is already completed, schedule from tomorrow
    const lastCompleted = this.storage.getDailyCompletedDate();

    const now = new Date();
    let fireAt = new Date();
    fireAt.setHours(prefs.dailyPuzzleHour, prefs.dailyPuzzleMinute, 0, 0);

    // If fire time has already passed today, or today is already completed, schedule for tomorrow
    if (fireAt <= now || lastCompleted === today) {
      fireAt.setDate(fireAt.getDate() + 1);
    }
    const copy = NotificationCopyService.getInstance().getDailyMessage();

    await this.schedule({
      id: NOTIF_DAILY_PUZZLE,
      title: copy.title,
      body: copy.body,
      channelId: CHANNEL_DAILY_PUZZLE,
      at: fireAt,
      extra: { type: 'daily_puzzle' },
    });
  }

  /** Cancel the daily puzzle notification. */
  public async cancelDailyPuzzleNotification(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await this.cancel([NOTIF_DAILY_PUZZLE]);
  }

  /**
   * Schedule a comeback/inactivity reminder.
   * Only fires if user has played before and has been inactive for 3+ days.
   * Respects 7-day cooldown between successive comeback notifications.
   */
  public async scheduleComebackReminder(): Promise<void> {
    if (!this.shouldSendReminder('comeback')) return;
    if (!this.storage.hasEverPlayed()) return;

    const state = loadNotifState();

    // Check cooldown: don't send if a comeback notification was sent recently
    if (state.lastReminderTime > 0) {
      const elapsed = Date.now() - state.lastReminderTime;
      if (elapsed < COMEBACK_COOLDOWN_MS) return;
    }

    // Don't send comeback if an unfinished level reminder is already pending
    if (state.pendingUnfinishedLevelId !== null) return;

    const lastActive = this.storage.getLastSessionTimestamp();
    const inactivityThresholdMs = COMEBACK_DELAY_DAYS * 24 * 60 * 60 * 1000;
    const fireAt = DEV_NOTIFICATIONS
      ? new Date(Date.now() + 30_000)
      : new Date(lastActive + inactivityThresholdMs);

    // Only schedule if the fire time is still in the future
    if (fireAt <= new Date() && !DEV_NOTIFICATIONS) return;
    const copy = NotificationCopyService.getInstance().getComebackMessage();

    await this.schedule({
      id: NOTIF_COMEBACK,
      title: copy.title,
      body: copy.body,
      channelId: CHANNEL_PUZZLE_REMINDERS,
      at: fireAt,
      extra: { type: 'comeback' },
    });
  }

  /** Cancel the comeback reminder. */
  public async cancelComebackReminder(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await this.cancel([NOTIF_COMEBACK]);
  }

  /**
   * Immediately post an achievement notification.
   * Uses the existing AchievementService subscription — call from App.tsx.
   */
  public async notifyAchievement(achievement: Achievement): Promise<void> {
    if (!this.shouldSendReminder('achievements')) return;

    const state = loadNotifState();
    if (state.notifiedAchievements.includes(achievement.id)) return;

    // Find index to create deterministic ID
    const { ACHIEVEMENTS } = await import('../data/achievements');
    const idx = ACHIEVEMENTS.findIndex(a => a.id === achievement.id);
    const notifId = NOTIF_ACHIEVEMENT_BASE + (idx >= 0 ? idx : Math.abs(achievement.id.charCodeAt(0)));

    state.notifiedAchievements.push(achievement.id);
    saveNotifState(state);

    // Achievement notifications fire immediately (slight delay so UI can settle)
    const fireAt = new Date(Date.now() + 2000);
    const copy = NotificationCopyService.getInstance().getAchievementMessage(achievement.title);

    await this.schedule({
      id: notifId,
      title: copy.title,
      body: copy.body,
      channelId: CHANNEL_ACHIEVEMENTS,
      at: fireAt,
      extra: { type: 'achievement', achievementId: achievement.id },
    });
  }

  /** Notify when the user has unlocked a new stage. */
  public async notifyStageUnlocked(stageId: number, stageName: string): Promise<void> {
    if (!this.shouldSendReminder('newContent')) return;

    const state = loadNotifState();
    if (state.notifiedStages.includes(stageId)) return;

    state.notifiedStages.push(stageId);
    saveNotifState(state);

    const notifId = NOTIF_STAGE_BASE + stageId;
    const fireAt = new Date(Date.now() + 3000);
    const copy = NotificationCopyService.getInstance().getStageMessage(stageName);

    await this.schedule({
      id: notifId,
      title: copy.title,
      body: copy.body,
      channelId: CHANNEL_UPDATES,
      at: fireAt,
      extra: { type: 'stage_unlocked', stageId },
    });
  }

  /** Cancel ALL scheduled Aroow notifications. */
  public async cancelAll(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      // Reset tracking state
      const state = loadNotifState();
      state.pendingUnfinishedLevelId = null;
      saveNotifState(state);
    } catch (e) {
      console.warn('[NotificationService] cancelAll failed:', e);
    }
  }

  /** Returns all currently pending notifications (for debugging). */
  public async getPendingNotifications() {
    if (!Capacitor.isNativePlatform()) return [];
    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch {
      return [];
    }
  }

  /**
   * Called when the app comes to the foreground.
   * Re-evaluates whether pending notifications are still needed.
   */
  public async onAppForeground(currentLevelId: number | null, currentState: string): Promise<void> {
    if (!this.permissionGranted) {
      // Silently re-check permission in case user granted it via system settings
      const status = await this.checkPermission();
      this.permissionGranted = status === 'granted';
      if (!this.permissionGranted) return;
    }

    // If the user returned and there's no active unfinished level, cancel stale reminder
    const state = loadNotifState();
    if (currentState === 'MENU' || currentState === 'LEVEL_SELECT') {
      if (state.pendingUnfinishedLevelId !== null) {
        await this.cancelUnfinishedLevelReminder(state.pendingUnfinishedLevelId);
      }
      // Reschedule comeback since user is active again
      await this.cancelComebackReminder();
      await this.scheduleComebackReminder();
    } else if (currentLevelId !== null && state.pendingUnfinishedLevelId === currentLevelId) {
      // Still on same level — nothing to change
    }
  }

  /**
   * Process a notification tap action and return navigation instructions.
   * Called from the localNotificationActionPerformed listener in App.tsx.
   */
  public handleNotificationTap(extra: Record<string, unknown>): {
    action: 'start_level' | 'open_daily' | 'open_achievements' | 'open_level_select' | 'open_home';
    levelId?: number;
  } {
    const type = extra?.type as string;
    switch (type) {
      case 'unfinished_level':
        return { action: 'start_level', levelId: extra.levelId as number };
      case 'daily_puzzle':
        return { action: 'open_daily' };
      case 'achievement':
        return { action: 'open_achievements' };
      case 'stage_unlocked':
        return { action: 'open_level_select' };
      case 'comeback':
      default:
        return { action: 'open_home' };
    }
  }

  // ── DEV TEST HELPERS (only safe to call when DEV_NOTIFICATIONS === true) ───

  /** Test: fires unfinished-level notification in 30 seconds. */
  public async devTestUnfinishedReminder(levelId: number): Promise<void> {
    if (!DEV_NOTIFICATIONS) return;
    const copy = NotificationCopyService.getInstance().getUnfinishedMessage(levelId);
    await this.schedule({
      id: NOTIF_UNFINISHED_BASE + levelId,
      title: copy.title,
      body: copy.body,
      channelId: CHANNEL_PUZZLE_REMINDERS,
      at: new Date(Date.now() + 30_000),
      extra: { type: 'unfinished_level', levelId },
    });
  }

  /** Test: fires daily puzzle notification in 30 seconds. */
  public async devTestDailyPuzzle(): Promise<void> {
    if (!DEV_NOTIFICATIONS) return;
    const copy = NotificationCopyService.getInstance().getDailyMessage();
    await this.schedule({
      id: NOTIF_DAILY_PUZZLE,
      title: copy.title,
      body: copy.body,
      channelId: CHANNEL_DAILY_PUZZLE,
      at: new Date(Date.now() + 30_000),
      extra: { type: 'daily_puzzle' },
    });
  }

  /** Test: fires comeback notification in 30 seconds. */
  public async devTestComeback(): Promise<void> {
    if (!DEV_NOTIFICATIONS) return;
    const copy = NotificationCopyService.getInstance().getComebackMessage();
    await this.schedule({
      id: NOTIF_COMEBACK,
      title: copy.title,
      body: copy.body,
      channelId: CHANNEL_PUZZLE_REMINDERS,
      at: new Date(Date.now() + 30_000),
      extra: { type: 'comeback' },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private shouldSendReminder(category: keyof Pick<NotificationPrefs,
    'unfinishedLevels' | 'dailyPuzzle' | 'comeback' | 'achievements' | 'newContent' | 'shopRewards'>
  ): boolean {
    if (!Capacitor.isNativePlatform()) return false;
    if (!this.permissionGranted) return false;
    const prefs = this.storage.getNotificationPrefs();
    if (!prefs.enabled) return false;
    return !!prefs[category];
  }

  private async schedule(opts: {
    id: number;
    title: string;
    body: string;
    channelId: string;
    at: Date;
    extra: Record<string, unknown>;
  }): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: opts.id,
          title: opts.title,
          body: opts.body,
          channelId: opts.channelId,
          schedule: { at: opts.at, allowWhileIdle: true },
          extra: opts.extra,
          smallIcon: 'ic_notification',
        }],
      });
    } catch (e) {
      console.warn('[NotificationService] schedule failed:', e);
    }
  }

  private async cancel(ids: number[]): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({
        notifications: ids.map(id => ({ id })),
      });
    } catch (e) {
      console.warn('[NotificationService] cancel failed:', e);
    }
  }

  private async createChannels(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_PUZZLE_REMINDERS,
        name: 'Puzzle Reminders',
        description: 'Reminders for unfinished and comeback puzzles',
        importance: 3, // DEFAULT importance — not HIGH
        vibration: true,
        sound: 'default',
      });
      await LocalNotifications.createChannel({
        id: CHANNEL_DAILY_PUZZLE,
        name: 'Daily Puzzle',
        description: 'Daily challenge notifications',
        importance: 3,
        vibration: true,
        sound: 'default',
      });
      await LocalNotifications.createChannel({
        id: CHANNEL_ACHIEVEMENTS,
        name: 'Achievements',
        description: 'Achievement unlock notifications',
        importance: 3,
        vibration: true,
        sound: 'default',
      });
      await LocalNotifications.createChannel({
        id: CHANNEL_UPDATES,
        name: 'New Content',
        description: 'Stage unlock and new content notifications',
        importance: 3,
        vibration: false,
        sound: undefined,
      });
    } catch (e) {
      console.warn('[NotificationService] createChannels failed:', e);
    }
  }
}
