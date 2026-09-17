/**
 * AdService — Professional Monetization Service (Phase 36)
 *
 * Responsibilities:
 *  - Interstitial ads at natural transitions only (never during gameplay)
 *  - Rewarded ads: player explicitly opts in for +1 life / hint / bonus points
 *  - Optional banner ads on non-gameplay screens (HomeScreen, LevelSelect)
 *  - Frequency controller: cooldown + minimum level buffer
 *  - Concurrency guard: only one ad can show at a time
 *  - Graceful degradation: game fully playable when ads fail or are disabled
 *  - App lifecycle hooks: cancel in-flight ads on backgrounding
 *
 * All advertising logic stays in this file, fully separate from gameplay.
 */

import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { CURRENT_AD_CONFIG, USE_TEST_ADS } from './AdConfig';
import { AnalyticsService } from './AnalyticsService';

// ─── Types ─────────────────────────────────────────────────────────────────

/** All valid ad placements — used for analytics tracking */
export type AdPlacement =
  | 'level_transition'   // Interstitial: between levels
  | 'revive'             // Rewarded: +1 life on game over
  | 'hint'               // Rewarded: hint reveal during gameplay
  | 'bonus_points'       // Rewarded: bonus points offer
  | 'generic';           // Fallback

/** Snapshot of the current ad state — for reactive UI consumption */
export interface AdState {
  isAdShowing: boolean;
  isLoading: boolean;
  lastPlacement: AdPlacement | null;
}

type AdAnalyticsEvent =
  | 'ad_init'
  | 'ad_loaded'
  | 'ad_failed'
  | 'interstitial_shown'
  | 'interstitial_closed'
  | 'rewarded_started'
  | 'rewarded_completed'
  | 'reward_granted'
  | 'banner_shown'
  | 'banner_hidden';

// ─── Constants ─────────────────────────────────────────────────────────────

/** Frequency controller constants */
const INTERSTITIAL_COOLDOWN_MS   = 120_000; // 2 minutes between interstitials
const MIN_LEVELS_BETWEEN_ADS     = 3;       // min levels completed since last interstitial
const MIN_INITIAL_LEVELS         = 3;       // never show on first N completions

/** Web-simulation delays (production native ads don't use these) */
const SIM_INTERSTITIAL_DELAY_MS  = 1_000;
const SIM_REWARDED_DELAY_MS      = 1_500;
const SIM_REWARDED_FAIL_RATE     = 0.05;   // 5% simulated failure on web

// ─── AdService ─────────────────────────────────────────────────────────────

export class AdService {
  private static instance: AdService;
  private analytics = AnalyticsService.getInstance();

  // ── Config flags
  private adsEnabled: boolean = true;
  private initializedNative: boolean = false;

  // ── Frequency controller state
  private lastInterstitialTime: number = 0;
  private levelsSinceLastAd: number = 0;
  private totalLevelsCompleted: number = 0;

  // ── Concurrency guard — ONLY ONE ad active at a time
  private isAdCurrentlyShowing: boolean = false;
  private isLoading: boolean = false;

  // ── Backgrounding: flag to suppress callbacks if app was backgrounded
  private appIsInBackground: boolean = false;

  // ── Last placement for state inspection
  private lastPlacement: AdPlacement | null = null;

  // ── In-flight simulation timer (for cancel on background)
  private pendingSimTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Reward duplication guard
  private pendingRewardGranted: boolean = false;

  private constructor() {
    if (USE_TEST_ADS) {
      console.info('[AdService] Running in DEVELOPMENT mode — test ads active');
    }
    this.initNativeAdMob();
  }

  public static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  private async initNativeAdMob(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: USE_TEST_ADS,
      });
      this.initializedNative = true;
      this.logEvent('ad_init', { platform: 'native', testMode: USE_TEST_ADS });
    } catch (err) {
      console.warn('[AdService] Native AdMob init failed, falling back to web simulation:', err);
    }
  }

  /** Call when app moves to background (visibilitychange hidden) */
  public handleAppBackground(): void {
    this.appIsInBackground = true;
    // Cancel any pending simulation timer
    if (this.pendingSimTimer !== null) {
      clearTimeout(this.pendingSimTimer);
      this.pendingSimTimer = null;
    }
    // If an ad was showing, release the concurrency guard safely
    if (this.isAdCurrentlyShowing) {
      this.releaseAdGuard();
    }
  }

  /** Call when app returns to foreground (visibilitychange visible) */
  public handleAppForeground(): void {
    this.appIsInBackground = false;
    // Safety: ensure guard is clear (in case backgrounding left it stuck)
    this.releaseAdGuard();
  }

  // ─── Public API: State ─────────────────────────────────────────────────

  public getAdState(): AdState {
    return {
      isAdShowing: this.isAdCurrentlyShowing,
      isLoading: this.isLoading,
      lastPlacement: this.lastPlacement,
    };
  }

  public setAdsEnabled(enabled: boolean): void {
    this.adsEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.adsEnabled;
  }

  // ─── Public API: Level tracking ────────────────────────────────────────

  /** Called by GameEngine after every level completion */
  public recordLevelCompleted(): void {
    this.totalLevelsCompleted++;
    this.levelsSinceLastAd++;
  }

  // ─── Public API: Interstitial ──────────────────────────────────────────

  /**
   * Checks whether all frequency-controller conditions are met.
   * Pure predicate — no side effects.
   */
  public canShowInterstitial(): boolean {
    if (!this.adsEnabled)                               return false;
    if (this.isAdCurrentlyShowing)                     return false;
    if (this.totalLevelsCompleted <= MIN_INITIAL_LEVELS) return false;
    if (this.levelsSinceLastAd < MIN_LEVELS_BETWEEN_ADS) return false;
    const now = Date.now();
    if (now - this.lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) return false;
    return true;
  }

  /**
   * Shows an interstitial ad if the frequency controller permits.
   * Always calls `onDismiss` — immediately if blocked, after ad if shown.
   * Safe to call without `await`; never blocks gameplay.
   */
  public showInterstitial(onDismiss?: () => void): void {
    if (!this.canShowInterstitial()) {
      onDismiss?.();
      return;
    }

    // Commit the frequency state immediately to prevent double-shows
    this.lastInterstitialTime = Date.now();
    this.levelsSinceLastAd = 0;
    this.acquireAdGuard('level_transition');

    if (Capacitor.isNativePlatform() && this.initializedNative) {
      this._showNativeInterstitial(onDismiss);
    } else {
      this._showSimulatedInterstitial(onDismiss);
    }
  }

  private async _showNativeInterstitial(onDismiss?: () => void): Promise<void> {
    try {
      await AdMob.prepareInterstitial({ adId: CURRENT_AD_CONFIG.interstitialId });
      this.logEvent('ad_loaded', { type: 'interstitial' });
      this.logEvent('interstitial_shown');
      this.analytics.track('ad_impression', { type: 'interstitial' });

      await AdMob.showInterstitial();
      this.logEvent('interstitial_closed');
    } catch (err) {
      this.logEvent('ad_failed', { type: 'interstitial', error: err });
    } finally {
      this.releaseAdGuard();
      if (!this.appIsInBackground) onDismiss?.();
    }
  }

  private _showSimulatedInterstitial(onDismiss?: () => void): void {
    this.logEvent('interstitial_shown');
    this.analytics.track('ad_impression', { type: 'interstitial' });

    this.pendingSimTimer = setTimeout(() => {
      this.pendingSimTimer = null;
      this.logEvent('interstitial_closed');
      this.releaseAdGuard();
      if (!this.appIsInBackground) onDismiss?.();
    }, SIM_INTERSTITIAL_DELAY_MS);
  }

  // ─── Public API: Rewarded — +1 Life ────────────────────────────────────

  /**
   * Player explicitly opts in to watch a rewarded ad for +1 life.
   * - `onRewarded()` called exactly once on successful completion.
   * - `onFailed()` called on failure/cancellation when provided.
   *   If `onFailed` is NOT provided, reward is granted as a graceful fallback.
   * - When ads are disabled, `onRewarded()` is NOT called — use `reviveWithAd()` for bypass.
   */
  public showRewardedAd(
    onRewarded: () => void,
    onFailed?: () => void,
    placement: AdPlacement = 'revive'
  ): void {
    this.analytics.track('rewarded_ad_opportunity', { placement });

    // If ads globally disabled, do NOT auto-grant — let the caller decide
    if (!this.adsEnabled) {
      this.logEvent('ad_failed', { type: 'rewarded', reason: 'ads_disabled', placement });
      onFailed?.();
      return;
    }

    // Concurrency guard
    if (this.isAdCurrentlyShowing) {
      this.logEvent('ad_failed', { type: 'rewarded', reason: 'already_showing', placement });
      onFailed?.();
      return;
    }

    this.acquireAdGuard(placement);
    this.pendingRewardGranted = false;

    if (Capacitor.isNativePlatform() && this.initializedNative) {
      this._showNativeRewardedAd(onRewarded, onFailed, placement);
    } else {
      this._showSimulatedRewardedAd(onRewarded, onFailed, placement);
    }
  }

  private async _showNativeRewardedAd(
    onRewarded: () => void,
    onFailed: (() => void) | undefined,
    placement: AdPlacement
  ): Promise<void> {
    try {
      await AdMob.prepareRewardVideoAd({ adId: CURRENT_AD_CONFIG.rewardedId });
      this.logEvent('ad_loaded', { type: 'rewarded', placement });
      this.logEvent('rewarded_started');
      this.analytics.track('ad_impression', { type: 'rewarded', placement });

      let rewarded = false;
      const listener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true;
      });

      await AdMob.showRewardVideoAd();
      await listener.remove();

      if (rewarded && !this.pendingRewardGranted && !this.appIsInBackground) {
        this.pendingRewardGranted = true;
        this.logEvent('reward_granted', { placement });
        this.analytics.track('rewarded_ad_completed', { placement });
        onRewarded();
      } else if (!rewarded) {
        this._handleRewardedFailed(onRewarded, onFailed, placement, 'not_rewarded');
      }
    } catch (err) {
      this.logEvent('ad_failed', { type: 'rewarded', reason: 'native_error', error: err, placement });
      this._handleRewardedFailed(onRewarded, onFailed, placement, 'native_error');
    } finally {
      this.releaseAdGuard();
    }
  }

  private _showSimulatedRewardedAd(
    onRewarded: () => void,
    onFailed: (() => void) | undefined,
    placement: AdPlacement
  ): void {
    this.logEvent('rewarded_started');
    this.analytics.track('ad_impression', { type: 'rewarded', placement });

    this.pendingSimTimer = setTimeout(() => {
      this.pendingSimTimer = null;
      this.releaseAdGuard();

      if (this.appIsInBackground) return;

      const failed = Math.random() < SIM_REWARDED_FAIL_RATE;
      if (failed) {
        this._handleRewardedFailed(onRewarded, onFailed, placement, 'sim_failure');
      } else {
        if (!this.pendingRewardGranted) {
          this.pendingRewardGranted = true;
          this.logEvent('reward_granted', { placement });
          this.analytics.track('rewarded_ad_completed', { placement });
          onRewarded();
        }
      }
    }, SIM_REWARDED_DELAY_MS);
  }

  private _handleRewardedFailed(
    onRewarded: () => void,
    onFailed: (() => void) | undefined,
    placement: AdPlacement,
    reason: string
  ): void {
    this.logEvent('ad_failed', { type: 'rewarded', reason, placement });
    if (onFailed) {
      // Caller handles failure explicitly — do NOT auto-grant
      onFailed();
    } else {
      // No failure handler provided — graceful fallback: grant the reward
      if (!this.pendingRewardGranted) {
        this.pendingRewardGranted = true;
        this.logEvent('reward_granted', { placement, fallback: true });
        this.analytics.track('rewarded_ad_completed', { placement, fallback: true });
        onRewarded();
      }
    }
  }

  // ─── Public API: Rewarded — Hint ───────────────────────────────────────

  /**
   * Player opts in for a rewarded hint during gameplay.
   * `onHint()` called only on successful ad completion.
   * `onFailed()` called (or no-op) if ad fails.
   */
  public showRewardedHint(
    onHint: () => void,
    onFailed?: () => void
  ): void {
    this.showRewardedAd(onHint, onFailed, 'hint');
  }

  // ─── Public API: Rewarded — Bonus Points ───────────────────────────────

  /**
   * Player opts in to watch an ad for bonus points.
   * `onBonus(amount)` called only on success.
   */
  public showRewardedBonusPoints(
    onBonus: (points: number) => void,
    bonusAmount: number = 100,
    onFailed?: () => void
  ): void {
    this.showRewardedAd(() => onBonus(bonusAmount), onFailed, 'bonus_points');
  }

  // ─── Public API: Banner ────────────────────────────────────────────────

  /**
   * Shows a native banner ad on the given DOM container (web: no-op placeholder).
   * Should only be called on non-gameplay screens (HomeScreen, LevelSelect).
   */
  public async showBannerAd(): Promise<void> {
    if (!this.adsEnabled) return;
    this.logEvent('banner_shown');
    this.analytics.track('ad_impression', { type: 'banner' });
    // Native banner implementation would use Capacitor AdMob here
    // For web: the <AdBanner /> component renders its own placeholder
  }

  /** Hides the native banner ad */
  public async hideBannerAd(): Promise<void> {
    this.logEvent('banner_hidden');
    // Native: AdMob.removeBanner()
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private acquireAdGuard(placement: AdPlacement): void {
    this.isAdCurrentlyShowing = true;
    this.isLoading = true;
    this.lastPlacement = placement;
  }

  private releaseAdGuard(): void {
    this.isAdCurrentlyShowing = false;
    this.isLoading = false;
    this.pendingRewardGranted = false;
  }

  private logEvent(event: AdAnalyticsEvent, details?: Record<string, unknown>): void {
    if (USE_TEST_ADS) {
      console.log(`[AdService] ${event}`, details ?? '');
    }
  }
}