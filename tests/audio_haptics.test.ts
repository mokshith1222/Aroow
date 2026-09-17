// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioService } from '../src/services/AudioService';
import { HapticService } from '../src/services/HapticService';

describe('Phase 11 — Audio and Haptics Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('AudioService', () => {
    it('should initialize and provide singleton instance', () => {
      const audio1 = AudioService.getInstance();
      const audio2 = AudioService.getInstance();
      expect(audio1).toBe(audio2);
    });

    it('should support toggling sound ON/OFF', () => {
      const audio = AudioService.getInstance();
      audio.setSoundEnabled(true);
      expect(audio.isSoundEnabled()).toBe(true);
      expect(audio.isMuted()).toBe(false);

      audio.setSoundEnabled(false);
      expect(audio.isSoundEnabled()).toBe(false);
      expect(audio.isMuted()).toBe(true);

      audio.toggleMuted();
      expect(audio.isSoundEnabled()).toBe(true);
    });

    it('should support toggling background music ON/OFF', () => {
      const audio = AudioService.getInstance();
      audio.setMusicEnabled(true);
      expect(audio.isMusicEnabled()).toBe(true);

      audio.setMusicEnabled(false);
      expect(audio.isMusicEnabled()).toBe(false);

      audio.toggleMusic();
      expect(audio.isMusicEnabled()).toBe(true);
    });

    it('should safely execute all sound methods without errors even in non-WebAudio environment', () => {
      const audio = AudioService.getInstance();
      audio.setSoundEnabled(true);

      expect(() => {
        audio.playMove();
        audio.playInvalid();
        audio.playLifeLost();
        audio.playWin();
        audio.playStar(1);
        audio.playStar(2);
        audio.playStar(3);
        audio.playButton();
        audio.playGameOver();
        audio.playUndo();
        audio.playReset();
      }).not.toThrow();
    });

    it('should safely start and stop background music', () => {
      const audio = AudioService.getInstance();
      expect(() => {
        audio.startMusic();
        audio.stopMusic();
      }).not.toThrow();
    });
  });

  describe('HapticService', () => {
    it('should initialize and provide singleton instance', () => {
      const haptics1 = HapticService.getInstance();
      const haptics2 = HapticService.getInstance();
      expect(haptics1).toBe(haptics2);
    });

    it('should support enabling and disabling haptics', () => {
      const haptics = HapticService.getInstance();
      haptics.setEnabled(true);
      expect(haptics.isEnabled()).toBe(true);

      haptics.toggle();
      expect(haptics.isEnabled()).toBe(false);

      haptics.setEnabled(true);
      expect(haptics.isEnabled()).toBe(true);
    });

    it('should trigger navigator.vibrate when supported and enabled', () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true,
        configurable: true
      });

      const haptics = HapticService.getInstance();
      haptics.setEnabled(true);

      haptics.light();
      expect(vibrateMock).toHaveBeenCalledWith(8);

      haptics.button();
      expect(vibrateMock).toHaveBeenCalledWith(6);

      haptics.invalid();
      expect(vibrateMock).toHaveBeenCalledWith(16);

      haptics.lifeLost();
      expect(vibrateMock).toHaveBeenCalledWith([24, 30, 28]);

      haptics.win();
      expect(vibrateMock).toHaveBeenCalledWith([20, 30, 35, 30, 50]);

      haptics.gameOver();
      expect(vibrateMock).toHaveBeenCalledWith([40, 50, 45]);
    });

    it('should not call navigator.vibrate when disabled', () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true,
        configurable: true
      });

      const haptics = HapticService.getInstance();
      haptics.setEnabled(false);

      haptics.light();
      haptics.win();
      expect(vibrateMock).not.toHaveBeenCalled();
    });
  });
});
