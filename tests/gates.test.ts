// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { GATES, getGateById } from '../src/data/Gates';
import { StorageService } from '../src/services/StorageService';
import { GameEngine } from '../src/game/GameEngine';
import type { LevelData } from '../src/game/types';

describe('Phase 30 — Cosmetic Winning Gate System', () => {
  let storage: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    StorageService.resetInstance();
    GameEngine.resetInstance();
    storage = StorageService.getInstance();
  });

  describe('Gates Data Definitions', () => {
    it('contains all 10 required cosmetic gates', () => {
      const expectedGates = [
        'classic_gate',
        'portal_gate',
        'crystal_gate',
        'energy_gate',
        'galaxy_gate',
        'flame_gate',
        'nature_gate',
        'cyber_gate',
        'star_gate',
        'void_gate'
      ];

      const ids = GATES.map(g => g.id);
      expectedGates.forEach(id => {
        expect(ids).toContain(id);
      });
      expect(GATES.length).toBe(10);
    });

    it('has classic_gate free as default and higher tiers scaling in points', () => {
      const classic = getGateById('classic_gate');
      expect(classic.price).toBe(0);

      const portal = getGateById('portal_gate');
      expect(portal.price).toBe(600);

      const voidGate = getGateById('void_gate');
      expect(voidGate.price).toBe(10000);
      expect(voidGate.rarity).toBe('Legendary');
    });
  });

  describe('StorageService Gate Persistence & Unlocking', () => {
    it('initializes with classic_gate owned and equipped by default', () => {
      expect(storage.getOwnedGates()).toEqual(['classic_gate']);
      expect(storage.getEquippedGate()).toBe('classic_gate');
    });

    it('rejects unlocking gate if points are insufficient', () => {
      const portalPrice = 600;
      expect(storage.getCurrentPoints()).toBe(0);

      const success = storage.unlockGate('portal_gate', portalPrice);
      expect(success).toBe(false);
      expect(storage.getOwnedGates()).not.toContain('portal_gate');
      expect(storage.getEquippedGate()).toBe('classic_gate');
    });

    it('successfully unlocks and equips gate when player has points', () => {
      // Award points
      storage.saveLevelCompletion(1, 4, 2.5, 3, 2000);
      expect(storage.getCurrentPoints()).toBe(2000);

      const unlockSuccess = storage.unlockGate('portal_gate', 600);
      expect(unlockSuccess).toBe(true);
      expect(storage.getCurrentPoints()).toBe(1400);
      expect(storage.getOwnedGates()).toContain('portal_gate');

      // Equip portal gate
      storage.equipGate('portal_gate');
      expect(storage.getEquippedGate()).toBe('portal_gate');
    });

    it('cannot equip an unowned gate', () => {
      storage.equipGate('void_gate');
      expect(storage.getEquippedGate()).toBe('classic_gate');
    });

    it('does not allow duplicate purchasing of already owned gates', () => {
      storage.saveLevelCompletion(1, 4, 2.5, 3, 5000);
      storage.unlockGate('crystal_gate', 1200);
      const pointsAfterFirst = storage.getCurrentPoints();

      const secondAttempt = storage.unlockGate('crystal_gate', 1200);
      expect(secondAttempt).toBe(false);
      expect(storage.getCurrentPoints()).toBe(pointsAfterFirst);
    });
  });

  describe('GameEngine Integration', () => {
    it('reflects the currently equipped gate in the engine snapshot throughout gameplay', () => {
      storage.saveLevelCompletion(1, 4, 2.5, 3, 3000);
      storage.unlockGate('galaxy_gate', 2500);
      storage.equipGate('galaxy_gate');

      const engine = GameEngine.getInstance();
      const testLevel: LevelData = {
        id: 999,
        width: 3,
        height: 3,
        start: { x: 0, y: 0 },
        goal: { x: 2, y: 0 },
        walls: []
      };

      engine.startLevel(testLevel);
      const snapshot = engine.getSnapshot();
      expect(snapshot.equippedGate).toBe('galaxy_gate');
      expect(snapshot.gateAnimationState).toBe('idle');
    });

    it('triggers goal reach and marks level complete', () => {
      const engine = GameEngine.getInstance();
      const testLevel: LevelData = {
        id: 998,
        width: 3,
        height: 1,
        start: { x: 0, y: 0 },
        goal: { x: 1, y: 0 },
        walls: []
      };

      engine.startLevel(testLevel);
      expect(engine.getSnapshot().isWon).toBe(false);

      const moveSuccess = engine.move('RIGHT');
      expect(moveSuccess).toBe(true);

      const snapshot = engine.getSnapshot();
      expect(snapshot.isWon).toBe(true);
      expect(snapshot.playerPos).toEqual({ x: 1, y: 0 });
    });
  });
});
