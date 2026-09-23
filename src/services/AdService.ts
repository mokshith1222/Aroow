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
import { 
  AdMob, 
  RewardAdPluginEvents,
  AdmobConsentDebugGeography,
  AdmobConsentStatus
} from '@capacitor-community/admob';
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
const MIN_LEVELS_BETWEEN_ADS     = 2;       // cooldown: min 2 levels completed since last interstitial
const WIN_AD_THRESHOLD           = 3;       // 3 wins = interstitial eligible
const LOSS_AD_THRESHOLD          = 3;       // 3 consecutive losses = interstitial eligible

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

  // ── UMP & Initialization State
  private initializationPromise: Promise<void> | null = null;
  private canRequestAds: boolean = false;
  private privacyOptionsRequired: boolean = false;

  // ── Frequency controller state
  private lastInterstitialTime: number = 0;
  private levelsSinceLastAd: number = 0;
  
  // ── Win / Loss Counters
  private winCounter: number = 0;
  private lossCounter: number = 0;

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

  private initNativeAdMob(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      if (!Capacitor.isNativePlatform()) {
        this.canRequestAds = true; // Web simulation defaults to allowed
        return;
      }
      try {
        // 1. Initialize AdMob (required before UMP in some capacitor versions, 
        // though conceptually UMP should gate ad loading, not SDK init itself).
        await AdMob.initialize({
          testingDevices: CURRENT_AD_CONFIG.testDeviceIdentifiers,
          initializeForTesting: USE_TEST_ADS,
        });

        // 2. Request Consent Info
        const debugGeography = USE_TEST_ADS ? AdmobConsentDebugGeography.EEA : AdmobConsentDebugGeography.DISABLED;
        const initialConsentInfo = await AdMob.requestConsentInfo({ debugGeography });

        // 3. Show consent form if required
        if (
          initialConsentInfo.isConsentFormAvailable &&
          initialConsentInfo.status === AdmobConsentStatus.REQUIRED
        ) {
          await AdMob.showConsentForm();
        }

        // 4. Re-request to get the final resolved status
        const finalConsentInfo = await AdMob.requestConsentInfo({ debugGeography });
        
        this.canRequestAds = finalConsentInfo.canRequestAds;
        this.privacyOptionsRequired = finalConsentInfo.privacyOptionsRequirementStatus === 'REQUIRED';

        this.initializedNative = true;
        this.logEvent('ad_init', { 
          platform: 'native', 
          testMode: USE_TEST_ADS,
          canRequestAds: this.canRequestAds,
          privacyRequired: this.privacyOptionsRequired
        });
      } catch (err) {
        console.warn('[AdService] Native AdMob init / UMP failed, falling back to web simulation:', err);
        // On failure (e.g. adblocker, network issue), we degrade gracefully
      }
    })();

    return this.initializationPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
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

  public isPrivacyOptionsRequired(): boolean {
    return this.privacyOptionsRequired;
  }

  /** Expose the Privacy Choices form to the user (e.g. from Settings) */
  public async showPrivacyChoices(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.initializedNative) return;
    try {
      await AdMob.showPrivacyOptionsForm();
      
      // Update state after user potentially changes consent
      const debugGeography = USE_TEST_ADS ? AdmobConsentDebugGeography.EEA : AdmobConsentDebugGeography.DISABLED;
      const updatedConsent = await AdMob.requestConsentInfo({ debugGeography });
      this.canRequestAds = updatedConsent.canRequestAds;
      this.privacyOptionsRequired = updatedConsent.privacyOptionsRequirementStatus === 'REQUIRED';
    } catch (err) {
      console.warn('[AdService] Failed to show privacy options form:', err);
    }
  }

  // ─── Public API: Level tracking ────────────────────────────────────────

  /** Called by GameEngine exactly once upon genuine level completion */
  public recordLevelCompleted(): void {
    this.levelsSinceLastAd++;
    this.winCounter++;
    this.lossCounter = 0; // Reset loss counter on win
  }

  /** Called by GameEngine exactly once upon genuine game over/failure */
  public recordLevelFailed(): void {
    this.lossCounter++;
    this.winCounter = 0; // Reset win counter on loss
  }

  // ─── Public API: Interstitial ──────────────────────────────────────────

  /**
   * Checks whether all frequency-controller conditions are met.
   * Pure predicate — no side effects.
   */
  public canShowInterstitial(): boolean {
    if (!this.adsEnabled)                               return false;
    if (this.isAdCurrentlyShowing)                     return false;
    
    // Check strict win/loss threshold logic
    if (this.winCounter < WIN_AD_THRESHOLD && this.lossCounter < LOSS_AD_THRESHOLD) {
      return false;
    }

    // Check cooldown logic
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
  public tryShowInterstitial(onComplete: () => void): void {
    this.ensureInitialized().then(() => {
      // Graceful fallback if consent denied
      if (!this.canRequestAds && Capacitor.isNativePlatform() && this.initializedNative) {
        onComplete();
        return;
      }

      if (!this.canShowInterstitial()) {
        onComplete();
        return;
      }

      // Commit the frequency state immediately to prevent double-shows
      this.lastInterstitialTime = Date.now();
      this.winCounter = 0;
      this.lossCounter = 0;
      this.levelsSinceLastAd = 0;
      this.acquireAdGuard('level_transition');

      if (Capacitor.isNativePlatform() && this.initializedNative) {
        this._showNativeInterstitial(onComplete);
      } else {
        this._showSimulatedInterstitial(onComplete);
      }
    });
  }

  private async _showNativeInterstitial(onComplete: () => void): Promise<void> {
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
      onComplete();
      
      // Preload next interstitial immediately after closing
      if (Capacitor.isNativePlatform() && this.initializedNative) {
        AdMob.prepareInterstitial({ adId: CURRENT_AD_CONFIG.interstitialId }).catch(() => {});
      }
    }
  }

  private _showSimulatedInterstitial(onComplete: () => void): void {
    this.logEvent('interstitial_shown');
    this.analytics.track('ad_impression', { type: 'interstitial' });

    this.pendingSimTimer = setTimeout(() => {
      this.pendingSimTimer = null;
      this.logEvent('interstitial_closed');
      this.releaseAdGuard();
      if (!this.appIsInBackground) onComplete();
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

    this.ensureInitialized().then(() => {
      // Graceful fallback if consent is denied
      if (!this.canRequestAds && Capacitor.isNativePlatform() && this.initializedNative) {
        this._handleRewardedFailed(onRewarded, onFailed, placement, 'consent_denied');
        return;
      }

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
    });
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

      const listener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        if (!this.pendingRewardGranted) {
          this.pendingRewardGranted = true;
          this.logEvent('reward_granted', { placement });
          this.analytics.track('rewarded_ad_completed', { placement });
          onRewarded();
        }
      });

      await AdMob.showRewardVideoAd();
      await listener.remove();

      if (!this.pendingRewardGranted) {
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

  // ─── Public API: Rewarded — Undo ───────────────────────────────────────

  /**
   * Player explicitly opts in to watch a rewarded ad for +3 Undo moves.
   * `onRewarded()` called only on successful completion.
   * Idempotent: guaranteed to fire exactly once per successful watch.
   */
  public showRewardedUndo(
    onRewarded: () => void,
    onFailed?: () => void
  ): void {
    this.showRewardedAd(onRewarded, onFailed, 'generic'); // using generic or create an 'undo' placement
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
    await this.ensureInitialized();
    if (!this.canRequestAds && Capacitor.isNativePlatform() && this.initializedNative) return;
    
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