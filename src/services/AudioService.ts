/**
 * AudioService
 * Lightweight procedural audio engine using Web Audio API.
 * Synthesizes all sound effects and generative ambient music in-browser
 * with zero external asset dependencies, zero network requests, and pure minimalist sound design.
 */
export class AudioService {
  private static instance: AudioService;
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private musicEnabled: boolean = true;

  // Background Music nodes
  private musicGainNode: GainNode | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicInterval: number | null = null;
  private isMusicPlaying: boolean = false;

  // Pitch variation tracker for movement
  private movePitchStep: number = 0;

  private constructor() {
    // Lazy initialize on first interaction
  }

  public static getInstance(): AudioService {
    if (!this.instance) {
      this.instance = new AudioService();
    }
    return this.instance;
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /* --------------------------------------------------------------------------
   * Preferences & Controls
   * -------------------------------------------------------------------------- */
  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setMuted(muted: boolean): void {
    this.soundEnabled = !muted;
  }

  public isMuted(): boolean {
    return !this.soundEnabled;
  }

  public toggleMuted(): boolean {
    this.soundEnabled = !this.soundEnabled;
    return !this.soundEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public toggleMusic(): boolean {
    this.setMusicEnabled(!this.musicEnabled);
    return this.musicEnabled;
  }

  /* --------------------------------------------------------------------------
   * Sound Effects: Movement, Collisions, Stars, Completion, UI
   * -------------------------------------------------------------------------- */

  /**
   * Movement sound: Crisp, subtle wood-like blip with micro pitch variation
   * to avoid repetitive fatigue.
   */
  public playMove(): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pentatonic scale variation: C5, D5, E5, G5, A5
      const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0];
      const baseFreq = pentatonic[this.movePitchStep % pentatonic.length];
      this.movePitchStep = (this.movePitchStep + 1) % pentatonic.length;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.08, now + 0.04);

      // Short subtle envelope (45ms)
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Fail silent
    }
  }

  /**
   * Invalid movement sound: Soft low-frequency thud when bumping walls
   */
  public playInvalid(): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    } catch {
      // Fail silent
    }
  }

  /**
   * Life lost sound: Downward chime indicating loss of a chance
   */
  public playLifeLost(): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      [260, 190].forEach((freq, i) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.08;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.75, startTime + 0.12);

        gain.gain.setValueAtTime(0.06, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.13);
      });
    } catch {
      // Fail silent
    }
  }

  /**
   * Level completion sound: Elegant ascending harmonic chime
   */
  public playWin(): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      // Harmonic chord: C5 -> G5 -> C6 -> E6
      const notes = [523.25, 783.99, 1046.5, 1318.51];
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteTime = now + idx * 0.07;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.06, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.3);
      });
    } catch {
      // Fail silent
    }
  }

  /**
   * Star earned sound: Individual crystal chime for each star revealed
   */
  public playStar(starIndex: number = 1): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const starFrequencies = [880.0, 1174.66, 1567.98]; // A5, D6, G6
      const freq = starFrequencies[(starIndex - 1) % starFrequencies.length] || 1046.5;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.18);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {
      // Fail silent
    }
  }

  /**
   * UI Button sound: Soft, subtle tactile tap
   */
  public playButton(): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.03);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // Fail silent
    }
  }

  /**
   * Game Over sound: Low subdued resonant resolution
   */
  public playGameOver(): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.35);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Fail silent
    }
  }

  /**
   * Undo sound: Quick backward sweep
   */
  public playUndo(): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Fail silent
    }
  }

  /**
   * Reset sound: Soft double sweep
   */
  public playReset(): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.07);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch {
      // Fail silent
    }
  }

  /**
   * Achievement unlock sound: Delicate, subtle crystalline double-chime
   */
  public playAchievement(): void {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Two gentle tones: E6 (1318.5 Hz) and B6 (1975.5 Hz)
      const notes = [
        { freq: 1318.5, delay: 0 },
        { freq: 1975.5, delay: 0.12 }
      ];

      notes.forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.04, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.55);
      });
    } catch {
      // Fail silent
    }
  }

  /* --------------------------------------------------------------------------
   * Minimalist Generative Ambient Music
   * Calm, hypnotic, subtle drone synthesizer using low-passed warm oscillators
   * -------------------------------------------------------------------------- */
  public startMusic(): void {
    if (!this.musicEnabled || this.isMusicPlaying) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      this.isMusicPlaying = true;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.018, ctx.currentTime); // Whisper quiet
      masterGain.connect(ctx.destination);
      this.musicGainNode = masterGain;

      // Low-pass filter for velvety warmth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, ctx.currentTime);
      filter.connect(masterGain);

      // Ambient chords (Dorian / Pentatonic progression)
      const chordNotes = [
        [130.81, 196.00], // C3, G3
        [146.83, 220.00], // D3, A3
        [164.81, 246.94], // E3, B3
        [174.61, 261.63], // F3, C4
      ];

      let chordIndex = 0;

      const playChord = () => {
        if (!this.isMusicPlaying || !this.audioCtx) return;
        const currentChord = chordNotes[chordIndex % chordNotes.length];
        chordIndex++;

        currentChord.forEach(freq => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const noteGain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

          // Gentle breathing envelope (4 seconds duration)
          const now = this.audioCtx.currentTime;
          noteGain.gain.setValueAtTime(0.0001, now);
          noteGain.gain.linearRampToValueAtTime(0.03, now + 1.2);
          noteGain.gain.linearRampToValueAtTime(0.0001, now + 3.8);

          osc.connect(noteGain);
          noteGain.connect(filter);

          osc.start(now);
          osc.stop(now + 4.0);
          this.musicOscillators.push(osc);

          osc.onended = () => {
            const idx = this.musicOscillators.indexOf(osc);
            if (idx > -1) {
              this.musicOscillators.splice(idx, 1);
            }
          };
        });
      };

      playChord();
      this.musicInterval = window.setInterval(playChord, 3800);
    } catch {
      // Fail silent
    }
  }

  public stopMusic(): void {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.musicGainNode && this.audioCtx) {
      try {
        this.musicGainNode.gain.linearRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.4);
      } catch {
        // Ignore
      }
    }
    this.musicOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch {
        // Ignore
      }
    });
    this.musicOscillators = [];
  }
}