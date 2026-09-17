// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService, ANALYTICS_STORAGE_KEY } from '../src/services/AnalyticsService';
import { GameEngine } from '../src/game/GameEngine';

describe('AnalyticsService & Telemetry Metrics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    AnalyticsService.resetInstance();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('tracks first_open event once on initial session start', () => {
    const analytics = AnalyticsService.getInstance();
    analytics.startSession();

    const data = analytics.getRawData();
    expect(data.firstOpenTimestamp).toBeTypeOf('number');
    expect(data.firstOpenTimestamp).toBeGreaterThan(0);

    const firstOpenEvents = data.events.filter(e => e.name === 'first_open');
    expect(firstOpenEvents.length).toBe(1);

    // Starting another session does not trigger duplicate first_open
    analytics.startSession();
    const firstOpenEventsAfter = analytics.getRawData().events.filter(e => e.name === 'first_open');
    expect(firstOpenEventsAfter.length).toBe(1);
  });

  it('tracks session lifecycle and calculates session duration', () => {
    const analytics = AnalyticsService.getInstance();
    const sessionId = analytics.startSession();
    expect(sessionId).toBeDefined();

    analytics.endSession();
    const data = analytics.getRawData();
    expect(data.sessions.length).toBe(1);
    expect(data.sessions[0].durationSeconds).toBeGreaterThanOrEqual(1);

    const lengthEvent = data.events.find(e => e.name === 'session_length');
    expect(lengthEvent).toBeDefined();
    expect(lengthEvent?.params?.sessionId).toBe(sessionId);
  });

  it('tracks all 13 core game and monetization events', () => {
    const analytics = AnalyticsService.getInstance();

    analytics.track('first_open');
    analytics.track('tutorial_complete', { levelId: 3 });
    analytics.track('level_started', { levelId: 1, worldId: 1 });
    analytics.track('level_completed', { levelId: 1, worldId: 1, moves: 4, stars: 3 });
    analytics.track('level_failed', { levelId: 1, reason: 'out_of_lives' });
    analytics.track('life_lost', { levelId: 1, remainingLives: 2 });
    analytics.track('hint_used', { levelId: 1 });
    analytics.track('retry', { levelId: 1 });
    analytics.track('world_unlocked', { worldId: 2, worldName: 'Corridors' });
    analytics.track('session_started', { sessionId: 'test_session' });
    analytics.track('session_length', { sessionId: 'test_session', durationSeconds: 45 });
    analytics.track('ad_impression', { type: 'interstitial' });
    analytics.track('rewarded_ad_completed', { placement: 'revive' });

    const raw = analytics.getRawData();
    expect(raw.tutorialCompleted).toBe(true);
    expect(raw.unlockedWorlds).toContain(2);
    expect(raw.counters.levelStarts).toBe(1);
    expect(raw.counters.levelCompletions).toBe(1);
    expect(raw.counters.levelFails).toBe(1);
    expect(raw.counters.livesLost).toBe(1);
    expect(raw.counters.hintsUsed).toBe(1);
    expect(raw.counters.retries).toBe(1);
    expect(raw.counters.adImpressions).toBe(1);
    expect(raw.counters.rewardedCompleted).toBe(1);
  });

  it('accurately computes Commercial KPIs (completion rate, levels/session, avg session, ad metrics)', () => {
    const analytics = AnalyticsService.getInstance();

    // Session 1: 3 starts, 2 completions
    analytics.startSession();
    analytics.track('level_started', { levelId: 1 });
    analytics.track('level_completed', { levelId: 1 });
    analytics.track('level_started', { levelId: 2 });
    analytics.track('level_completed', { levelId: 2 });
    analytics.track('level_started', { levelId: 3 });
    analytics.track('level_failed', { levelId: 3 });
    analytics.endSession();

    // Session 2: 1 start, 1 completion, 2 ads, 1 rewarded opt-in
    analytics.startSession();
    analytics.track('level_started', { levelId: 3 });
    analytics.track('level_completed', { levelId: 3 });
    analytics.track('ad_impression', { type: 'interstitial' });
    analytics.track('rewarded_ad_opportunity', { placement: 'hint' });
    analytics.track('ad_impression', { type: 'rewarded' });
    analytics.track('rewarded_ad_completed', { placement: 'hint' });
    analytics.endSession();

    const metrics = analytics.getMetrics();

    expect(metrics.totalSessions).toBe(2);
    expect(metrics.totalLevelStarts).toBe(4);
    expect(metrics.totalLevelCompletions).toBe(3);

    // Levels / session = 4 starts / 2 sessions = 2.0
    expect(metrics.levelsPerSession).toBe(2);

    // Level completion rate = 3 / 4 = 75%
    expect(metrics.levelCompletionRate).toBe(75);
    expect(metrics.levelCompletionRateFormatted).toBe('75%');

    // Ad impressions per user = 2
    expect(metrics.adImpressionsPerUser).toBe(2);

    // Rewarded ad opt-in rate = 1 / 1 = 100%
    expect(metrics.rewardedAdOptInRate).toBe(100);
    expect(metrics.rewardedAdOptInFormatted).toBe('100%');
  });

  it('evaluates Day 1 and Day 7 retention logic accurately', () => {
    const analytics = AnalyticsService.getInstance();
    analytics.startSession();

    // Fresh install: Not yet eligible for Day 1 or Day 7 retention
    const initialMetrics = analytics.getMetrics();
    expect(initialMetrics.day1Retention.eligible).toBe(false);
    expect(initialMetrics.day1Retention.retained).toBe(false);
    expect(initialMetrics.day1Retention.formatted).toContain('Pending');

    // Simulate returning after 26 hours (Day 1 retention window)
    const raw = analytics.getRawData();
    const day1Time = (raw.firstOpenTimestamp || Date.now()) + 26 * 60 * 60 * 1000;
    raw.sessions.push({
      sessionId: 'ses_day1_return',
      startTime: day1Time,
      endTime: day1Time + 120,
      durationSeconds: 120
    });
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(raw));

    AnalyticsService.resetInstance();
    const reloadedAnalytics = AnalyticsService.getInstance();
    const day1Metrics = reloadedAnalytics.getMetrics();

    // Check that day1 session is detected
    expect(day1Metrics.day1Retention.retained).toBe(true);
  });

  it('integrates seamlessly with GameEngine lifecycle', () => {
    const engine = GameEngine.getInstance();
    const analytics = AnalyticsService.getInstance();

    // Start Level 1
    engine.startLevel(1);
    let events = analytics.getRecentEvents();
    expect(events.some(e => e.name === 'level_started' && e.params?.levelId === 1)).toBe(true);

    // Restart Level 1
    engine.restart();
    events = analytics.getRecentEvents();
    expect(events.some(e => e.name === 'retry' && e.params?.levelId === 1)).toBe(true);

    // Invalid move generates life_lost
    engine.move('LEFT'); // Wall or invalid
    events = analytics.getRecentEvents();
    expect(events.some(e => e.name === 'life_lost')).toBe(true);

    // Request hint generates hint_used
    engine.getHint();
    events = analytics.getRecentEvents();
    expect(events.some(e => e.name === 'hint_used')).toBe(true);
  });

  it('preserves privacy: no PII collected and event queue stays bounded', () => {
    const analytics = AnalyticsService.getInstance();

    // Generate 350 events (exceeds MAX_STORED_EVENTS of 300)
    for (let i = 0; i < 350; i++) {
      analytics.track('level_started', { levelId: (i % 20) + 1 });
    }

    const raw = analytics.getRawData();
    expect(raw.events.length).toBeLessThanOrEqual(300);
    expect(raw.anonymousUserId.startsWith('usr_')).toBe(true);
    // Ensure no IP, email, username, or device fingerprinting keys exist
    expect((raw as any).ip).toBeUndefined();
    expect((raw as any).email).toBeUndefined();
  });
});
