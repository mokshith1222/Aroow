// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { THEMES, getThemeById } from '../src/data/Themes';
import { StorageService } from '../src/services/StorageService';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';

describe('Phase 31 — Background and Theme System', () => {
  let storage: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    StorageService.resetInstance();
    GameEngine.resetInstance();
    storage = StorageService.getInstance();
  });

  describe('Themes Data Definitions', () => {
    it('contains all 10 required themes with color palettes', () => {
      const expectedThemes = [
        'theme_classic',
        'theme_midnight',
        'theme_ocean',
        'theme_forest',
        'theme_sunset',
        'theme_neon',
        'theme_cyber',
        'theme_galaxy',
        'theme_space',
        'theme_minimal_white'
      ];

      const ids = THEMES.map(t => t.id);
      expectedThemes.forEach(id => {
        expect(ids).toContain(id);
      });
      expect(THEMES.length).toBe(10);
    });

    it('ensures each theme provides background, surface, wall, cell, accent and text tokens', () => {
      THEMES.forEach(theme => {
        expect(theme.colors.bg).toBeTruthy();
        expect(theme.colors.surface).toBeTruthy();
        expect(theme.colors.wall).toBeTruthy();
        expect(theme.colors.cell).toBeTruthy();
        expect(theme.colors.accent).toBeTruthy();
        expect(theme.colors.text).toBeTruthy();
      });
    });

    it('has theme_classic as free default and scaling prices up to Minimal White', () => {
      const classic = getThemeById('theme_classic');
      expect(classic.price).toBe(0);

      const midnight = getThemeById('theme_midnight');
      expect(midnight.price).toBe(800);

      const minimalWhite = getThemeById('theme_minimal_white');
      expect(minimalWhite.price).toBe(11000);
      expect(minimalWhite.rarity).toBe('Legendary');
    });
  });

  describe('StorageService Theme Persistence & Unlocking', () => {
    it('initializes with theme_classic owned and equipped by default', () => {
      expect(storage.getOwnedThemes()).toEqual(['theme_classic']);
      expect(storage.getEquippedTheme()).toBe('theme_classic');
    });

    it('rejects unlocking a theme if points are insufficient', () => {
      expect(storage.getCurrentPoints()).toBe(0);
      const success = storage.unlockTheme('theme_midnight', 800);
      expect(success).toBe(false);
      expect(storage.getOwnedThemes()).not.toContain('theme_midnight');
      expect(storage.getEquippedTheme()).toBe('theme_classic');
    });

    it('unlocks and equips theme when player has sufficient points', () => {
      // Award points
      storage.saveLevelCompletion(1, 4, 2.5, 3, 2500);
      expect(storage.getCurrentPoints()).toBe(2500);

      const unlocked = storage.unlockTheme('theme_ocean', 1500);
      expect(unlocked).toBe(true);
      expect(storage.getCurrentPoints()).toBe(1000);
      expect(storage.getOwnedThemes()).toContain('theme_ocean');

      // Equip theme
      storage.equipTheme('theme_ocean');
      expect(storage.getEquippedTheme()).toBe('theme_ocean');
    });

    it('cannot equip an unowned theme', () => {
      storage.equipTheme('theme_cyber');
      expect(storage.getEquippedTheme()).toBe('theme_classic');
    });

    it('prevents duplicate unlocks of the same theme', () => {
      storage.saveLevelCompletion(1, 4, 2.5, 3, 5000);
      storage.unlockTheme('theme_forest', 2200);
      const remainingPoints = storage.getCurrentPoints();

      const secondAttempt = storage.unlockTheme('theme_forest', 2200);
      expect(secondAttempt).toBe(false);
      expect(storage.getCurrentPoints()).toBe(remainingPoints);
    });
  });

  describe('GameEngine Snapshot Integration', () => {
    it('reflects currently equipped theme in snapshot during gameplay', () => {
      storage.saveLevelCompletion(1, 4, 2.5, 3, 5000);
      storage.unlockTheme('theme_neon', 4500);
      storage.equipTheme('theme_neon');

      const engine = GameEngine.getInstance();
      const testLevel: LevelData = {
        id: 1,
        width: 3,
        height: 3,
        start: { x: 0, y: 0 },
        goal: { x: 2, y: 2 },
        walls: []
      };

      engine.startLevel(testLevel); engine.startPlaying();
      const snapshot = engine.getSnapshot();
      expect(snapshot.equippedTheme).toBe('theme_neon');
    });
  });
});
