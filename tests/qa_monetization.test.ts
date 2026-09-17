/**
 * PHASE 15 — Monetization / AdService Tests (Independent QA Review)
 *
 * The AdService must never break gameplay. Tests verify:
 *  - Ad unavailable / disabled: gameplay proceeds normally
 *  - Ad loaded and dismissed: onDismiss is called exactly once
 *  - Rewarded ad: onRewarded is called on success
 *  - Rewarded ad failure: onFailed is called (no double-reward)
 *  - No reward duplication: callbacks fire exactly once per attempt
 *  - Frequency controller: interstitials respect cooldown and level buffer
 *  - Gameplay continues fully when ads are disabled
 *
 * Note: AdService uses real setTimeout internally. We use vi.useFakeTimers()
 * to keep tests synchronous and deterministic without test race conditions.
 */

// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdService } from '../src/services/AdService';

// ─── helper to get a fresh AdService instance via reflection ──────────────
// AdService is a singleton; we reset the private `instance` field between tests.

function resetAdService(): void {
  // @ts-expect-error – reset private singleton for test isolation
  AdService['instance'] = undefined;
}

function ads(): AdService {
  return AdService.getInstance();
}

beforeEach(() => {
  vi.useFakeTimers();
  resetAdService();
});

afterEach(() => {
  vi.useRealTimers();
  resetAdService();
});

// ─── ad unavailable ────────────────────────────────────────────────────────

describe('AdService — ad unavailable', () => {
  it('canShowInterstitial() returns false on a fresh instance (< MIN_INITIAL_LEVELS)', () => {
    expect(ads().canShowInterstitial()).toBe(false);
  });

  it('showInterstitial() calls onDismiss immediately when frequency gate blocks it', () => {
    const onDismiss = vi.fn();
    ads().showInterstitial(onDismiss);
    // Not enough levels completed — onDismiss should fire synchronously
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('showInterstitial() with no callback does not throw when gate blocks', () => {
    expect(() => ads().showInterstitial()).not.toThrow();
  });

  it('showRewardedAd with adsEnabled=false calls onFailed (no silent reward grant)', () => {
    ads().setAdsEnabled(false);
    const onRewarded = vi.fn();
    const onFailed = vi.fn();
    ads().showRewardedAd(onRewarded, onFailed);
    // Ads disabled — should NOT silently reward the player; call onFailed instead
    expect(onRewarded).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it('showRewardedAd with adsEnabled=false calls onFailed when provided', () => {
    ads().setAdsEnabled(false);
    const onFailed = vi.fn();
    ads().showRewardedAd(() => {}, onFailed);
    // When ads disabled and onFailed provided, it is called (no silent grant)
    expect(onFailed).toHaveBeenCalledTimes(1);
  });
});

// ─── ad loaded ────────────────────────────────────────────────────────────

describe('AdService — ad loaded and dismissed', () => {
  function unlockInterstitial(): void {
    // recordLevelCompleted enough times to pass frequency gate
    for (let i = 0; i < 5; i++) {
      ads().recordLevelCompleted();
    }
    // Advance time past cooldown (2 minutes)
    vi.advanceTimersByTime(121_000);
    // Reset lastInterstitialTime by making sure no prior ad was shown
  }

  it('canShowInterstitial() is true after meeting all conditions', () => {
    unlockInterstitial();
    expect(ads().canShowInterstitial()).toBe(true);
  });

  it('showInterstitial() calls onDismiss after 1 second delay', () => {
    unlockInterstitial();
    const onDismiss = vi.fn();
    ads().showInterstitial(onDismiss);

    expect(onDismiss).not.toHaveBeenCalled(); // Not yet
    vi.advanceTimersByTime(1001);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('onDismiss is called exactly once per interstitial', () => {
    unlockInterstitial();
    const onDismiss = vi.fn();
    ads().showInterstitial(onDismiss);
    vi.advanceTimersByTime(2000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('levelsSinceLastAd resets to 0 after an interstitial is shown', () => {
    unlockInterstitial();
    ads().showInterstitial();
    vi.advanceTimersByTime(2000);
    // Now gate should block (cooldown active, levels since reset to 0)
    expect(ads().canShowInterstitial()).toBe(false);
  });
});

// ─── ad closed ────────────────────────────────────────────────────────────

describe('AdService — ad closed', () => {
  it('rewarded ad calls onRewarded after 1.5 second delay on success', () => {
    const onRewarded = vi.fn();
    // Force success by mocking Math.random to return > 0.05
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    ads().showRewardedAd(onRewarded);
    expect(onRewarded).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1501);
    expect(onRewarded).toHaveBeenCalledTimes(1);

    vi.mocked(Math.random).mockRestore();
  });

  it('rewarded ad calls onFailed on simulated failure', () => {
    const onRewarded = vi.fn();
    const onFailed = vi.fn();

    // Force failure: Math.random < 0.05
    vi.spyOn(Math, 'random').mockReturnValue(0.01);

    ads().showRewardedAd(onRewarded, onFailed);
    vi.advanceTimersByTime(1501);

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onRewarded).not.toHaveBeenCalled();

    vi.mocked(Math.random).mockRestore();
  });
});

// ─── reward earned ────────────────────────────────────────────────────────

describe('AdService — reward earned', () => {
  it('onRewarded callback receives no arguments (stateless reward signal)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const onRewarded = vi.fn();
    ads().showRewardedAd(onRewarded);
    vi.advanceTimersByTime(1501);
    // The callback should have been called with no arguments
    expect(onRewarded).toHaveBeenCalledWith();
    vi.mocked(Math.random).mockRestore();
  });

  it('reward is granted even without an explicit onFailed handler on failure (graceful fallback)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // force failure
    const onRewarded = vi.fn();
    // No onFailed provided — should gracefully reward
    ads().showRewardedAd(onRewarded, undefined);
    vi.advanceTimersByTime(1501);
    expect(onRewarded).toHaveBeenCalledTimes(1);
    vi.mocked(Math.random).mockRestore();
  });
});

// ─── reward not earned ────────────────────────────────────────────────────

describe('AdService — reward not earned', () => {
  it('onRewarded is NOT called when onFailed is provided and ad fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const onRewarded = vi.fn();
    const onFailed = vi.fn();
    ads().showRewardedAd(onRewarded, onFailed);
    vi.advanceTimersByTime(1501);
    expect(onRewarded).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledTimes(1);
    vi.mocked(Math.random).mockRestore();
  });
});

// ─── no duplicate reward ──────────────────────────────────────────────────

describe('AdService — no duplicate reward', () => {
  it('concurrency guard blocks second showRewardedAd while first is showing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const onRewarded1 = vi.fn();
    const onFailed2 = vi.fn();

    ads().showRewardedAd(onRewarded1);       // First call — acquires guard
    ads().showRewardedAd(vi.fn(), onFailed2); // Second call while first active — blocked

    vi.advanceTimersByTime(2000);
    // First call rewards — second call should have been blocked immediately
    expect(onRewarded1).toHaveBeenCalledTimes(1);
    expect(onFailed2).toHaveBeenCalledTimes(1); // Second call fires onFailed immediately
    vi.mocked(Math.random).mockRestore();
  });

  it('interstitial onDismiss fires exactly once even if advance time far forward', () => {
    // Unlock interstitial gate
    for (let i = 0; i < 5; i++) ads().recordLevelCompleted();
    vi.advanceTimersByTime(121_000);

    const onDismiss = vi.fn();
    ads().showInterstitial(onDismiss);
    vi.advanceTimersByTime(10_000); // Way beyond 1s duration
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ─── frequency controller ─────────────────────────────────────────────────

describe('AdService — frequency controller', () => {
  it('does not show interstitial on first 3 levels', () => {
    for (let i = 0; i < 3; i++) ads().recordLevelCompleted();
    expect(ads().canShowInterstitial()).toBe(false);
  });

  it('shows interstitial after MIN_INITIAL_LEVELS + enough cooldown', () => {
    for (let i = 0; i < 5; i++) ads().recordLevelCompleted();
    vi.advanceTimersByTime(121_000);
    expect(ads().canShowInterstitial()).toBe(true);
  });

  it('cooldown blocks a second interstitial immediately after the first', () => {
    for (let i = 0; i < 5; i++) ads().recordLevelCompleted();
    vi.advanceTimersByTime(121_000);

    ads().showInterstitial(); // shown
    vi.advanceTimersByTime(1001);

    // Add more levels so level gate doesn't block
    for (let i = 0; i < 5; i++) ads().recordLevelCompleted();
    // But cooldown still active (< 2 minutes)
    vi.advanceTimersByTime(30_000);
    expect(ads().canShowInterstitial()).toBe(false);
  });

  it('cooldown allows interstitial after 2 minutes have passed', () => {
    for (let i = 0; i < 5; i++) ads().recordLevelCompleted();
    vi.advanceTimersByTime(121_000);
    ads().showInterstitial();
    vi.advanceTimersByTime(1001);

    for (let i = 0; i < 5; i++) ads().recordLevelCompleted();
    vi.advanceTimersByTime(121_000); // full 2 minute cooldown
    expect(ads().canShowInterstitial()).toBe(true);
  });

  it('setAdsEnabled(false) prevents interstitials entirely', () => {
    ads().setAdsEnabled(false);
    for (let i = 0; i < 10; i++) ads().recordLevelCompleted();
    vi.advanceTimersByTime(200_000);
    expect(ads().canShowInterstitial()).toBe(false);
  });
});
