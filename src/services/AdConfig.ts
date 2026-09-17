/**
 * AdConfig — AdMob App & Ad Unit ID Configuration
 *
 * DEVELOPMENT: USE_TEST_ADS = true (default)
 *   Uses Google's official test Ad Unit IDs — safe, no policy violations.
 *   Never commit production IDs to source control.
 *
 * PRODUCTION: Set USE_TEST_ADS = false and fill in ADMOB_PROD_CONFIG
 *   from your Google AdMob console before a release build.
 *
 * Reference: https://developers.google.com/admob/android/test-ads
 */

// ─── Environment flag ──────────────────────────────────────────────────────
/** Always true in dev. Set to false only in release CI/CD pipeline. */
export const USE_TEST_ADS: boolean = true;

export type AdEnvironment = 'development' | 'production';
export const AD_ENVIRONMENT: AdEnvironment = USE_TEST_ADS ? 'development' : 'production';

// ─── Official Google AdMob Test Ad Unit IDs (Android) ─────────────────────
export const ADMOB_TEST_CONFIG = {
  appId:         'ca-app-pub-3940256099942544~3347511713',
  bannerId:      'ca-app-pub-3940256099942544/6300978111',
  interstitialId:'ca-app-pub-3940256099942544/1033173712',
  rewardedId:    'ca-app-pub-3940256099942544/5224354917',
} as const;

// ─── Production Ad Unit IDs ────────────────────────────────────────────────
// Replace placeholder values with real IDs from AdMob Console before release.
export const ADMOB_PROD_CONFIG = {
  appId:         'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX',
  bannerId:      'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  interstitialId:'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  rewardedId:    'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
} as const;

/** Active config chosen by environment flag */
export const CURRENT_AD_CONFIG = USE_TEST_ADS ? ADMOB_TEST_CONFIG : ADMOB_PROD_CONFIG;
