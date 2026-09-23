/**
 * Global configuration flags for the game.
 */

// ============================================================================
// TEMPORARY DEVELOPMENT MODE: UNLOCK ALL LEVELS FOR TESTING
// ============================================================================
// When true: All levels and worlds are unlocked, allowing testing of extreme
// levels without needing to play through the game.
// When false: Standard strict progression locking applies (Level N requires N-1).
// Set this to false before production releases.
export const DEV_UNLOCK_ALL_LEVELS = false;
// ============================================================================

// ============================================================================
// DEVELOPMENT MODE: NOTIFICATION TEST TIMERS
// ============================================================================
// When true: All scheduled reminders fire in ~30 seconds instead of hours/days.
// This allows manual testing of the full notification flow on a real device
// without waiting. Set this to false before production releases.
// IMPORTANT: This flag is INDEPENDENT of USE_TEST_ADS. Do NOT couple them.
export const DEV_NOTIFICATIONS = true;
// ============================================================================
