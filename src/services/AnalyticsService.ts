export type AnalyticsEventType =
  | 'first_open'
  | 'tutorial_complete'
  | 'level_started'
  | 'level_completed'
  | 'level_failed'
  | 'life_lost'
  | 'hint_used'
  | 'retry'
  | 'world_unlocked'
  | 'session_started'
  | 'session_length'
  | 'ad_impression'
  | 'rewarded_ad_completed'
  | 'rewarded_ad_opportunity'
  | 'daily_started'
  | 'endless_started'
  | 'hazard_death';

export interface AnalyticsEventRecord {
  name: AnalyticsEventType;
  timestamp: number;
  params?: Record<string, any>;
}

export interface SessionRecord {
  sessionId: string;
  startTime: number;
  endTime?: number;
  durationSeconds?: number;
}

export interface AnalyticsData {
  schemaVersion: number;
  anonymousUserId: string;
  firstOpenTimestamp: number | null;
  tutorialCompleted: boolean;
  unlockedWorlds: number[];
  sessions: SessionRecord[];
  activeSessionId: string | null;
  activeSessionStartTime: number | null;
  events: AnalyticsEventRecord[];
  counters: {
    levelStarts: number;
    levelCompletions: number;
    levelFails: number;
    livesLost: number;
    hintsUsed: number;
    retries: number;
    adImpressions: number;
    rewardedCompleted: number;
    rewardedOpportunities: number;
  };
}

export interface AnalyticsMetrics {
  day1Retention: {
    eligible: boolean; // Has it been at least 24h since first open?
    retained: boolean; // Did user have a session on Day 1 (24h-48h)?
    formatted: string;
  };
  day7Retention: {
    eligible: boolean; // Has it been at least 7 days since first open?
    retained: boolean; // Did user have a session on Day 7+?
    formatted: string;
  };
  averageSessionSeconds: number;
  averageSessionFormatted: string;
  levelsPerSession: number;
  levelCompletionRate: number; // Percentage 0 - 100%
  levelCompletionRateFormatted: string;
  adImpressionsPerUser: number;
  rewardedAdOptInRate: number; // Percentage 0 - 100%
  rewardedAdOptInFormatted: string;
  totalSessions: number;
  totalLevelStarts: number;
  totalLevelCompletions: number;
}

export const ANALYTICS_STORAGE_KEY = 'arrow_puzzle_analytics_v1';
const MAX_STORED_EVENTS = 300; // Keep local storage bounded and lightweight

function generateAnonymousId(): string {
  return 'usr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private data: AnalyticsData;
  private isClient: boolean;

  private constructor() {
    this.isClient = typeof window !== 'undefined' && !!window.localStorage;
    this.data = this.loadData();
  }

  public static getInstance(): AnalyticsService {
    if (!this.instance) {
      this.instance = new AnalyticsService();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = undefined as any;
  }

  private getDefaultData(): AnalyticsData {
    return {
      schemaVersion: 1,
      anonymousUserId: generateAnonymousId(),
      firstOpenTimestamp: null,
      tutorialCompleted: false,
      unlockedWorlds: [1],
      sessions: [],
      activeSessionId: null,
      activeSessionStartTime: null,
      events: [],
      counters: {
        levelStarts: 0,
        levelCompletions: 0,
        levelFails: 0,
        livesLost: 0,
        hintsUsed: 0,
        retries: 0,
        adImpressions: 0,
        rewardedCompleted: 0,
        rewardedOpportunities: 0
      }
    };
  }

  private loadData(): AnalyticsData {
    if (!this.isClient) return this.getDefaultData();
    try {
      const stored = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.schemaVersion === 'number') {
          return {
            ...this.getDefaultData(),
            ...parsed,
            counters: {
              ...this.getDefaultData().counters,
              ...(parsed.counters || {})
            }
          };
        }
      }
    } catch (e) {
      console.warn('[AnalyticsService] Could not parse stored analytics, resetting', e);
    }
    return this.getDefaultData();
  }

  private saveData(): void {
    if (!this.isClient) return;
    try {
      window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[AnalyticsService] Failed to persist analytics', e);
    }
  }

  /**
   * Primary event recording method
   */
  public track(name: AnalyticsEventType, params?: Record<string, any>): void {
    const timestamp = Date.now();
    const eventRecord: AnalyticsEventRecord = {
      name,
      timestamp,
      ...(params ? { params } : {})
    };

    // Update bounded event ledger
    this.data.events.push(eventRecord);
    if (this.data.events.length > MAX_STORED_EVENTS) {
      this.data.events.shift();
    }

    // Process specialized event state
    switch (name) {
      case 'first_open':
        if (!this.data.firstOpenTimestamp) {
          this.data.firstOpenTimestamp = timestamp;
        }
        break;

      case 'tutorial_complete':
        this.data.tutorialCompleted = true;
        break;

      case 'world_unlocked':
        if (params?.worldId && !this.data.unlockedWorlds.includes(params.worldId)) {
          this.data.unlockedWorlds.push(params.worldId);
        }
        break;

      case 'level_started':
        this.data.counters.levelStarts++;
        break;

      case 'level_completed':
        this.data.counters.levelCompletions++;
        break;

      case 'level_failed':
        this.data.counters.levelFails++;
        break;

      case 'life_lost':
        this.data.counters.livesLost++;
        break;

      case 'hint_used':
        this.data.counters.hintsUsed++;
        break;

      case 'retry':
        this.data.counters.retries++;
        break;

      case 'ad_impression':
        this.data.counters.adImpressions++;
        break;

      case 'rewarded_ad_completed':
        this.data.counters.rewardedCompleted++;
        break;

      case 'rewarded_ad_opportunity':
        this.data.counters.rewardedOpportunities++;
        break;

      case 'session_length':
        // Duration handled via endSession or explicit parameter
        break;
    }

    // Console telemetry for developer inspection
    console.log(`[Telemetry] ${name}`, params || '');
    this.saveData();
  }

  /**
   * Session Lifecycle
   */
  public startSession(): string {
    const now = Date.now();

    // Check first_open trigger
    if (!this.data.firstOpenTimestamp) {
      this.track('first_open', { timestamp: now });
    }

    // End any stale session if needed
    if (this.data.activeSessionId) {
      this.endSession();
    }

    const sessionId = 'ses_' + Math.random().toString(36).substring(2, 9) + '_' + now.toString(36);
    this.data.activeSessionId = sessionId;
    this.data.activeSessionStartTime = now;

    this.track('session_started', {
      sessionId,
      sessionNumber: this.data.sessions.length + 1,
      startTime: now
    });

    return sessionId;
  }

  public endSession(): void {
    if (!this.data.activeSessionId || !this.data.activeSessionStartTime) return;

    const now = Date.now();
    const durationSeconds = Math.max(1, Math.round((now - this.data.activeSessionStartTime) / 1000));

    const sessionRecord: SessionRecord = {
      sessionId: this.data.activeSessionId,
      startTime: this.data.activeSessionStartTime,
      endTime: now,
      durationSeconds
    };

    this.data.sessions.push(sessionRecord);
    // Keep max 50 recent session logs
    if (this.data.sessions.length > 50) {
      this.data.sessions.shift();
    }

    const endedSessionId = this.data.activeSessionId;
    this.data.activeSessionId = null;
    this.data.activeSessionStartTime = null;

    this.track('session_length', {
      sessionId: endedSessionId,
      durationSeconds
    });
  }

  /**
   * Computes high-level commercial KPIs based on local event data
   */
  public getMetrics(): AnalyticsMetrics {
    const now = Date.now();
    const firstOpen = this.data.firstOpenTimestamp || now;
    const msSinceFirstOpen = now - firstOpen;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;

    // Day 1 Retention (24h to 48h after first open)
    const isEligibleDay1 = msSinceFirstOpen >= oneDayMs;
    const hasDay1Session = this.data.sessions.some(s => {
      const diff = s.startTime - firstOpen;
      return diff >= oneDayMs && diff <= 2 * oneDayMs;
    });

    // Day 7 Retention (7d to 8d or 7d+ after first open)
    const isEligibleDay7 = msSinceFirstOpen >= sevenDaysMs;
    const hasDay7Session = this.data.sessions.some(s => {
      const diff = s.startTime - firstOpen;
      return diff >= sevenDaysMs;
    });

    // Session Metrics
    // Include past completed sessions + current active session duration
    const completedSessionDurations = this.data.sessions
      .map(s => s.durationSeconds || 0)
      .filter(d => d > 0);

    let totalDuration = completedSessionDurations.reduce((sum, d) => sum + d, 0);
    let totalSessionsCount = this.data.sessions.length;

    if (this.data.activeSessionStartTime) {
      const activeDuration = Math.max(1, Math.round((now - this.data.activeSessionStartTime) / 1000));
      totalDuration += activeDuration;
      totalSessionsCount += 1;
    }

    const effectiveSessions = Math.max(1, totalSessionsCount);
    const averageSessionSeconds = Math.round(totalDuration / effectiveSessions);
    const avgMinutes = Math.floor(averageSessionSeconds / 60);
    const avgSecs = averageSessionSeconds % 60;
    const averageSessionFormatted = avgMinutes > 0 ? `${avgMinutes}m ${avgSecs}s` : `${avgSecs}s`;

    // Levels per Session
    const levelsPerSession = Number((this.data.counters.levelStarts / effectiveSessions).toFixed(1));

    // Level Completion Rate
    const starts = this.data.counters.levelStarts;
    const completions = this.data.counters.levelCompletions;
    const completionRate = starts > 0 ? Number(((completions / starts) * 100).toFixed(1)) : 100;

    // Ad Impressions per User (single user local install)
    const adImpressionsPerUser = this.data.counters.adImpressions;

    // Rewarded Ad Opt-in Rate
    // Opt-in rate = rewardedCompleted / (rewardedOpportunities || (rewardedCompleted + 1))
    const opportunities = Math.max(
      this.data.counters.rewardedOpportunities,
      this.data.counters.rewardedCompleted
    );
    const rewardedOptInRate =
      opportunities > 0
        ? Number(((this.data.counters.rewardedCompleted / opportunities) * 100).toFixed(1))
        : 0;

    return {
      day1Retention: {
        eligible: isEligibleDay1,
        retained: hasDay1Session,
        formatted: !isEligibleDay1 ? 'Pending (New User)' : hasDay1Session ? '100% (Retained)' : '0%'
      },
      day7Retention: {
        eligible: isEligibleDay7,
        retained: hasDay7Session,
        formatted: !isEligibleDay7 ? 'Pending (New User)' : hasDay7Session ? '100% (Retained)' : '0%'
      },
      averageSessionSeconds,
      averageSessionFormatted,
      levelsPerSession,
      levelCompletionRate: completionRate,
      levelCompletionRateFormatted: `${completionRate}%`,
      adImpressionsPerUser,
      rewardedAdOptInRate: rewardedOptInRate,
      rewardedAdOptInFormatted: `${rewardedOptInRate}%`,
      totalSessions: effectiveSessions,
      totalLevelStarts: starts,
      totalLevelCompletions: completions
    };
  }

  public getRawData(): AnalyticsData {
    return JSON.parse(JSON.stringify(this.data));
  }

  public getRecentEvents(): AnalyticsEventRecord[] {
    return [...this.data.events].reverse();
  }

  public resetAnalytics(): void {
    this.data = this.getDefaultData();
    this.saveData();
  }
}
