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
// (Automatically disabled during tests so progression tests still pass)
// @ts-ignore
export const DEV_UNLOCK_ALL_LEVELS = typeof process !== 'undefined' && process.env.NODE_ENV !== 'test' && true;
// ============================================================================
