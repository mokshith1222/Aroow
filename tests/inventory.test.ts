// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  UNIFIED_COSMETICS,
  getAllCosmetics,
  getCosmeticsByCategory,
  getCosmeticById,
  COSMETIC_CATEGORIES
} from '../src/data/InventoryRegistry';
import { BACKGROUNDS, getBackgroundById } from '../src/data/Backgrounds';
import { StorageService } from '../src/services/StorageService';
import { GameEngine } from '../src/game/GameEngine';

describe('Phase 32 — Unified Inventory System', () => {
  let storage: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    StorageService.resetInstance();
    GameEngine.resetInstance();
    storage = StorageService.getInstance();
  });

  describe('Unified Cosmetic Data Structure & Registry', () => {
    it('defines the 4 required categories', () => {
      expect(COSMETIC_CATEGORIES).toEqual([
        'CHARACTERS',
        'GATES',
        'BACKGROUNDS',
        'THEMES'
      ]);
    });

    it('aggregates cosmetics across all 4 categories', () => {
      const all = getAllCosmetics();
      expect(all.length).toBeGreaterThan(25);

      const chars = getCosmeticsByCategory('CHARACTERS');
      const gates = getCosmeticsByCategory('GATES');
      const bgs = getCosmeticsByCategory('BACKGROUNDS');
      const themes = getCosmeticsByCategory('THEMES');

      expect(chars.length).toBe(10);
      expect(gates.length).toBe(10);
      expect(bgs.length).toBe(10);
      expect(themes.length).toBe(10);
      expect(all.length).toBe(chars.length + gates.length + bgs.length + themes.length);
    });

    it('validates each cosmetic has required unified properties', () => {
      UNIFIED_COSMETICS.forEach(item => {
        expect(item.id).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(COSMETIC_CATEGORIES).toContain(item.category);
        expect(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']).toContain(item.rarity);
        expect(item.price).toBeGreaterThanOrEqual(0);
        expect(item.description).toBeTruthy();
      });
    });

    it('allows looking up items by id', () => {
      const char = getCosmeticById('classic_arrow');
      expect(char?.category).toBe('CHARACTERS');

      const gate = getCosmeticById('portal_gate');
      expect(gate?.category).toBe('GATES');

      const bg = getCosmeticById('bg_stars');
      expect(bg?.category).toBe('BACKGROUNDS');

      const theme = getCosmeticById('theme_cyber');
      expect(theme?.category).toBe('THEMES');
    });
  });

  describe('Background Cosmetics Definitions', () => {
    it('defines 10 high-contrast cosmetic backgrounds with pattern classes', () => {
      expect(BACKGROUNDS.length).toBe(10);
      const clean = getBackgroundById('bg_clean');
      expect(clean.price).toBe(0);
      expect(clean.patternClass).toBe('pattern-clean');

      const prism = getBackgroundById('bg_prism');
      expect(prism.price).toBe(10000);
      expect(prism.rarity).toBe('Legendary');
    });
  });

  describe('StorageService Unified Generic API', () => {
    it('provides default owned items for all categories', () => {
      expect(storage.getOwnedItems('CHARACTERS')).toContain('classic_arrow');
      expect(storage.getOwnedItems('GATES')).toContain('classic_gate');
      expect(storage.getOwnedItems('BACKGROUNDS')).toContain('bg_clean');
      expect(storage.getOwnedItems('THEMES')).toContain('theme_classic');
    });

    it('provides default equipped items for all categories', () => {
      expect(storage.getEquippedItem('CHARACTERS')).toBe('classic_arrow');
      expect(storage.getEquippedItem('GATES')).toBe('classic_gate');
      expect(storage.getEquippedItem('BACKGROUNDS')).toBe('bg_clean');
      expect(storage.getEquippedItem('THEMES')).toBe('theme_classic');
    });

    it('correctly tracks isOwned and isEquipped for all categories', () => {
      expect(storage.isOwned('CHARACTERS', 'classic_arrow')).toBe(true);
      expect(storage.isEquipped('CHARACTERS', 'classic_arrow')).toBe(true);

      expect(storage.isOwned('BACKGROUNDS', 'bg_clean')).toBe(true);
      expect(storage.isEquipped('BACKGROUNDS', 'bg_clean')).toBe(true);

      expect(storage.isOwned('BACKGROUNDS', 'bg_stars')).toBe(false);
      expect(storage.isEquipped('BACKGROUNDS', 'bg_stars')).toBe(false);
    });

    it('allows unlocking and equipping background items', () => {
      storage.addPoints(5000);
      expect(storage.getCurrentPoints()).toBe(5000);

      // Unlock bg_stars (price: 4000)
      const bought = storage.unlockItem('BACKGROUNDS', 'bg_stars', 4000);
      expect(bought).toBe(true);
      expect(storage.getCurrentPoints()).toBe(1000);
      expect(storage.isOwned('BACKGROUNDS', 'bg_stars')).toBe(true);

      // Equip bg_stars
      const equipped = storage.equipItem('BACKGROUNDS', 'bg_stars');
      expect(equipped).toBe(true);
      expect(storage.getEquippedItem('BACKGROUNDS')).toBe('bg_stars');
      expect(storage.getEquippedBackground()).toBe('bg_stars');
    });

    it('prevents duplicate purchases in unified storage', () => {
      storage.addPoints(10000);

      const firstBuy = storage.unlockItem('THEMES', 'theme_cyber', 3000);
      expect(firstBuy).toBe(true);
      expect(storage.getCurrentPoints()).toBe(7000);

      // Attempt duplicate purchase of already owned theme
      const duplicateBuy = storage.unlockItem('THEMES', 'theme_cyber', 3000);
      expect(duplicateBuy).toBe(false);
      expect(storage.getCurrentPoints()).toBe(7000); // Points preserved!
    });

    it('refuses to unlock item if player has insufficient points', () => {
      // 0 points
      const bought = storage.unlockItem('GATES', 'void_gate', 10000);
      expect(bought).toBe(false);
      expect(storage.isOwned('GATES', 'void_gate')).toBe(false);
    });

    it('refuses to equip unowned item', () => {
      const equipped = storage.equipItem('CHARACTERS', 'cyber_drone');
      expect(equipped).toBe(false);
      expect(storage.getEquippedItem('CHARACTERS')).toBe('classic_arrow');
    });
  });

  describe('Game Engine Snapshot Integration', () => {
    it('exposes equipped loadout across all 4 categories in GameSnapshot', () => {
      const engine = GameEngine.getInstance();
      const snapshot = engine.getSnapshot();

      expect(snapshot.equippedCharacter).toBe('classic_arrow');
      expect(snapshot.equippedGate).toBe('classic_gate');
      expect(snapshot.equippedTheme).toBe('theme_classic');
      expect(snapshot.equippedBackground).toBe('bg_clean');
    });

    it('reflects updated equipped background in game snapshot', () => {
      storage.addPoints(5000);
      storage.unlockItem('BACKGROUNDS', 'bg_circuit', 2000);
      storage.equipItem('BACKGROUNDS', 'bg_circuit');

      const engine = GameEngine.getInstance();
      const snapshot = engine.getSnapshot();
      expect(snapshot.equippedBackground).toBe('bg_circuit');
    });
  });
});
