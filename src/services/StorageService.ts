import type { CosmeticCategory } from '../data/InventoryTypes';
import { WorldManager } from '../data/worlds';

export interface LevelRecord {
  completed: boolean;
  stars: number;
  bestMoves: number;
  bestTime: number;
  completedAt: string;
  pointsEarned?: number;
}

export interface AchievementStats {
  flawlessLevelsCount: number;
  noHintLevelsCount: number;
  speedRunLevelsCount: number;
  dailyChallengesCount: number;
}

export interface EndlessStats {
  highestLevel: number;
  bestMoves: number;
  bestTime: number;
  highestDifficulty: number;
  totalCompleted: number;
}

export interface PlayerData {
  schemaVersion: number;
  colorMode: 'light' | 'dark';
  unlockedLevel: number;
  levelRecords: Record<number, LevelRecord>;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  currentPoints: number;
  lifetimePoints: number;
  rewardHistory: Array<{levelId: number; timestamp: string; points: number; reason: string}>;
  ownedCharacters: string[];
  equippedCharacter: string;
  ownedGates: string[];
  equippedGate: string;
  ownedThemes: string[];
  equippedTheme: string;
  ownedBackgrounds: string[];
  equippedBackground: string;
  lastDailyCompletionDate?: string;
  unlockedAchievements: string[];
  achievementStats: AchievementStats;
  endlessStats: EndlessStats;
  endlessRecords: Record<number, LevelRecord>;
}

export const CURRENT_SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'arrow_puzzle_save';
export const LEGACY_STORAGE_KEY = 'arrow_puzzle_save_v1';

export const createDefaultData = (): PlayerData => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  colorMode: 'dark',
  unlockedLevel: 1,
  levelRecords: {},
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  currentPoints: 0,
  lifetimePoints: 0,
  rewardHistory: [],
  ownedCharacters: ['classic_arrow'],
  equippedCharacter: 'classic_arrow',
  ownedGates: ['classic_gate'],
  equippedGate: 'classic_gate',
  ownedThemes: ['theme_classic'],
  equippedTheme: 'theme_classic',
  ownedBackgrounds: ['bg_clean'],
  equippedBackground: 'bg_clean',
  lastDailyCompletionDate: undefined,
  unlockedAchievements: [],
  achievementStats: {
    flawlessLevelsCount: 0,
    noHintLevelsCount: 0,
    speedRunLevelsCount: 0,
    dailyChallengesCount: 0,
  },
  endlessStats: {
    highestLevel: 0,
    bestMoves: 9999,
    bestTime: 9999,
    highestDifficulty: 0,
    totalCompleted: 0,
  },
  endlessRecords: {},
});

export class StorageService {
  private static instance: StorageService;
  private data: PlayerData;

  private constructor() {
    this.data = this.loadData();
    this.refreshUnlockedLevel();
  }

  public static getInstance(): StorageService {
    if (!this.instance) {
      this.instance = new StorageService();
    }
    return this.instance;
  }

  // Used for testing to reset the singleton state
  public static resetInstance(): void {
    this.instance = undefined as any;
  }

  private loadData(): PlayerData {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDefaultData();
    }
    try {
      let stored = window.localStorage.getItem(STORAGE_KEY);
      let isLegacy = false;

      if (!stored) {
        stored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        isLegacy = true;
      }

      if (stored) {
        const parsed = JSON.parse(stored);
        const migrated = this.migrateData(parsed);

        if (isLegacy) {
          // Immediately save to new key and remove legacy
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch {
            // Ignore storage errors on cleanup
          }
        }
        return migrated;
      }
    } catch (e) {
      console.error('Failed to parse save data, data corrupted. Backing up and resetting.', e);
      // Try to backup corrupted data
      try {
        const corrupted = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (corrupted) {
          window.localStorage.setItem(`${STORAGE_KEY}_corrupted_${Date.now()}`, corrupted);
        }
      } catch {
        // Ignore errors during backup
      }
    }
    return createDefaultData();
  }

  private migrateData(parsed: any): PlayerData {
    const data = { ...parsed };
    
    // Validate and fix structure to handle missing/bad fields
    if (data.colorMode !== 'light' && data.colorMode !== 'dark') data.colorMode = 'dark';
    if (typeof data.unlockedLevel !== 'number') data.unlockedLevel = 1;
    if (typeof data.levelRecords !== 'object' || data.levelRecords === null) data.levelRecords = {};
    if (typeof data.soundEnabled !== 'boolean') data.soundEnabled = true;
    if (typeof data.musicEnabled !== 'boolean') data.musicEnabled = true;
    if (typeof data.hapticsEnabled !== 'boolean') data.hapticsEnabled = true;
    if (typeof data.currentPoints !== 'number') {
      data.currentPoints = typeof data.totalPoints === 'number' ? data.totalPoints : 0;
    }
    if (typeof data.lifetimePoints !== 'number') {
      data.lifetimePoints = data.currentPoints;
    }
    if (!Array.isArray(data.rewardHistory)) {
      data.rewardHistory = [];
    }
    if (!Array.isArray(data.ownedCharacters)) {
      data.ownedCharacters = ['classic_arrow'];
    }
    if (typeof data.equippedCharacter !== 'string') {
      data.equippedCharacter = 'classic_arrow';
    }
    if (!Array.isArray(data.ownedGates)) {
      data.ownedGates = ['classic_gate'];
    }
    if (typeof data.equippedGate !== 'string') {
      data.equippedGate = 'classic_gate';
    }
    if (!Array.isArray(data.ownedThemes)) {
      data.ownedThemes = ['theme_classic'];
    }
    if (typeof data.equippedTheme !== 'string') {
      data.equippedTheme = 'theme_classic';
    }
    if (!Array.isArray(data.ownedBackgrounds)) {
      data.ownedBackgrounds = ['bg_clean'];
    }
    if (typeof data.equippedBackground !== 'string') {
      data.equippedBackground = 'bg_clean';
    }
    delete data.totalPoints;

    if (!Array.isArray(data.unlockedAchievements)) {
      data.unlockedAchievements = [];
    }
    if (typeof data.achievementStats !== 'object' || data.achievementStats === null) {
      data.achievementStats = {
        flawlessLevelsCount: 0,
        noHintLevelsCount: 0,
        speedRunLevelsCount: 0,
        dailyChallengesCount: 0,
      };
    } else {
      if (typeof data.achievementStats.flawlessLevelsCount !== 'number') data.achievementStats.flawlessLevelsCount = 0;
      if (typeof data.achievementStats.noHintLevelsCount !== 'number') data.achievementStats.noHintLevelsCount = 0;
      if (typeof data.achievementStats.speedRunLevelsCount !== 'number') data.achievementStats.speedRunLevelsCount = 0;
      if (typeof data.achievementStats.dailyChallengesCount !== 'number') data.achievementStats.dailyChallengesCount = 0;
    }

    if (typeof data.endlessStats !== 'object' || data.endlessStats === null) {
      data.endlessStats = {
        highestLevel: 0,
        bestMoves: 9999,
        bestTime: 9999,
        highestDifficulty: 0,
        totalCompleted: 0,
      };
    } else {
      if (typeof data.endlessStats.highestLevel !== 'number') data.endlessStats.highestLevel = 0;
      if (typeof data.endlessStats.bestMoves !== 'number') data.endlessStats.bestMoves = 9999;
      if (typeof data.endlessStats.bestTime !== 'number') data.endlessStats.bestTime = 9999;
      if (typeof data.endlessStats.highestDifficulty !== 'number') data.endlessStats.highestDifficulty = 0;
      if (typeof data.endlessStats.totalCompleted !== 'number') data.endlessStats.totalCompleted = 0;
    }

    if (typeof data.endlessRecords !== 'object' || data.endlessRecords === null) data.endlessRecords = {};

    // Validate level records deeply
    const validLevelRecords: Record<number, LevelRecord> = {};
    for (const key in data.levelRecords) {
      const levelId = parseInt(key, 10);
      const record = data.levelRecords[key];
      if (!isNaN(levelId) && record && typeof record.stars === 'number') {
        validLevelRecords[levelId] = {
          completed: typeof record.completed === 'boolean' ? record.completed : (record.stars > 0 || !!record.completedAt),
          stars: record.stars,
          bestMoves: typeof record.bestMoves === 'number' ? record.bestMoves : 9999,
          bestTime: typeof record.bestTime === 'number' ? record.bestTime : 9999,
          completedAt: typeof record.completedAt === 'string' ? record.completedAt : new Date().toISOString(),
          pointsEarned: typeof record.pointsEarned === 'number' ? record.pointsEarned : 0
        };
      }
    }
    data.levelRecords = validLevelRecords;

    // Migrations
    if (data.schemaVersion === 1 || !data.schemaVersion) { 
       // Upgrade to version 2
       // Give 0 points retroactively for safety, to avoid weird economy bugs. Players start fresh on points.
       data.schemaVersion = 2;
    }

    data.schemaVersion = CURRENT_SCHEMA_VERSION;
    return data as PlayerData;
  }

  public saveData(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save game data', e);
    }
  }

  public getUnlockedLevel(): number {
    return this.data.unlockedLevel;
  }

  public getColorMode(): 'light' | 'dark' {
    return this.data.colorMode || 'dark';
  }

  public setColorMode(mode: 'light' | 'dark'): void {
    this.data.colorMode = mode;
    this.saveData();
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-color-mode', mode);
    }
  }

  public getLevelRecord(levelId: number): LevelRecord | null {
    return this.data.levelRecords[levelId] || null;
  }

  public getAllLevelRecords(): Record<number, LevelRecord> {
    return this.data.levelRecords;
  }

  /**
   * Determine if a specific level is unlocked.
   * Level 1 is always unlocked.
   * Level N is unlocked only if its World is unlocked AND Level N-1 has been COMPLETED.
   */
  public isLevelUnlocked(levelId: number): boolean {
    if (levelId <= 1) return true;
    const world = WorldManager.getWorldForLevel(levelId);
    if (world && !WorldManager.isWorldUnlocked(world.id, this.data.levelRecords)) {
      return false;
    }
    const prevRecord = this.data.levelRecords[levelId - 1];
    return !!prevRecord && prevRecord.completed === true;
  }

  /**
   * Refresh unlockedLevel by evaluating completion history and world requirements.
   */
  public refreshUnlockedLevel(): void {
    let lvl = 1;
    while (this.data.levelRecords[lvl]?.completed) {
      const nextLvl = lvl + 1;
      const nextWorld = WorldManager.getWorldForLevel(nextLvl);
      if (nextWorld && !WorldManager.isWorldUnlocked(nextWorld.id, this.data.levelRecords)) {
        break;
      }
      lvl = nextLvl;
    }
    this.data.unlockedLevel = Math.max(1, lvl);
  }

  public saveLevelCompletion(
    levelId: number,
    moves: number,
    time: number,
    stars: number,
    pointsEarned: number = 0
  ): void {
    const existing = this.data.levelRecords[levelId];
    
    // Check against history for absolute safety against duplicate rewards
    const alreadyRewarded = this.data.rewardHistory.some(h => h.levelId === levelId && h.reason === 'LEVEL_COMPLETE');
    
    // Only grant points on the very first completion to prevent replay farming
    const actualPointsToAward = (existing || alreadyRewarded) ? 0 : pointsEarned;
    
    const newRecord: LevelRecord = {
      completed: true,
      stars: Math.max(existing?.stars || 0, stars),
      bestMoves: existing ? Math.min(existing.bestMoves, moves) : moves,
      bestTime: existing ? Math.min(existing.bestTime, time) : time,
      completedAt: existing ? existing.completedAt : new Date().toISOString(),
      pointsEarned: existing ? existing.pointsEarned : actualPointsToAward
    };

    this.data.levelRecords[levelId] = newRecord;
    
    // Increment points safely
    if (actualPointsToAward > 0) {
      this.data.currentPoints += actualPointsToAward;
      this.data.lifetimePoints += actualPointsToAward;
      this.data.rewardHistory.push({
        levelId,
        timestamp: new Date().toISOString(),
        points: actualPointsToAward,
        reason: 'LEVEL_COMPLETE'
      });
      // Cap the history length if it gets too large
      if (this.data.rewardHistory.length > 500) {
        this.data.rewardHistory.shift();
      }
    }

    this.refreshUnlockedLevel();

    this.saveData();
  }

  public getDailyCompletedDate(): string | undefined {
    return this.data.lastDailyCompletionDate;
  }

  public setDailyCompleted(date: string): void {
    this.data.lastDailyCompletionDate = date;
    this.saveData();
  }

  public getCurrentPoints(): number {
    return this.data.currentPoints;
  }

  public addPoints(amount: number, reason: string = 'BONUS'): void {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0 || !isFinite(amount)) return;
    this.data.currentPoints += amount;
    this.data.lifetimePoints += amount;
    this.data.rewardHistory.push({
      levelId: -1,
      timestamp: new Date().toISOString(),
      points: amount,
      reason
    });
    this.saveData();
  }

  public getLifetimePoints(): number {
    return this.data.lifetimePoints;
  }

  /** @deprecated Use getCurrentPoints instead */
  public getTotalPoints(): number {
    return this.data.currentPoints;
  }

  public getRewardHistory(): Array<{levelId: number; timestamp: string; points: number; reason: string}> {
    return this.data.rewardHistory;
  }

  public spendPoints(amount: number, reason: string): boolean {
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount) || amount <= 0 || this.data.currentPoints < amount) {
      return false;
    }
    this.data.currentPoints -= amount;
    this.data.rewardHistory.push({
      levelId: -1,
      timestamp: new Date().toISOString(),
      points: -amount,
      reason
    });
    this.saveData();
    return true;
  }

  public getTotalStars(): number {
    return Object.values(this.data.levelRecords).reduce(
      (sum, r) => sum + (r.stars || 0),
      0
    );
  }

  public getSoundEnabled(): boolean {
    return this.data.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.data.soundEnabled = enabled;
    this.saveData();
  }

  public getMusicEnabled(): boolean {
    return this.data.musicEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.data.musicEnabled = enabled;
    this.saveData();
  }

  public getHapticsEnabled(): boolean {
    return this.data.hapticsEnabled;
  }

  public setHapticsEnabled(enabled: boolean): void {
    this.data.hapticsEnabled = enabled;
    this.saveData();
  }

  public resetAllProgress(): void {
    this.data = createDefaultData();
    this.saveData();
  }

  public getOwnedCharacters(): string[] {
    return this.data.ownedCharacters;
  }

  public getEquippedCharacter(): string {
    return this.data.equippedCharacter;
  }

  public equipCharacter(id: string): void {
    if (this.data.ownedCharacters.includes(id)) {
      this.data.equippedCharacter = id;
      this.saveData();
    }
  }

  public unlockCharacter(id: string, price: number): boolean {
    if (this.data.ownedCharacters.includes(id)) return false;
    
    // Attempt to spend points
    const success = this.spendPoints(price, `UNLOCK_${id.toUpperCase()}`);
    if (success) {
      this.data.ownedCharacters.push(id);
      this.saveData();
      return true;
    }
    return false;
  }

  public getOwnedGates(): string[] {
    return this.data.ownedGates || ['classic_gate'];
  }

  public getEquippedGate(): string {
    return this.data.equippedGate || 'classic_gate';
  }

  public equipGate(id: string): void {
    if ((this.data.ownedGates || []).includes(id)) {
      this.data.equippedGate = id;
      this.saveData();
    }
  }

  public unlockGate(id: string, price: number): boolean {
    if ((this.data.ownedGates || []).includes(id)) return false;

    const success = this.spendPoints(price, `UNLOCK_GATE_${id.toUpperCase()}`);
    if (success) {
      if (!this.data.ownedGates) this.data.ownedGates = ['classic_gate'];
      this.data.ownedGates.push(id);
      this.saveData();
      return true;
    }
    return false;
  }

  public getOwnedThemes(): string[] {
    return this.data.ownedThemes || ['theme_classic'];
  }

  public getEquippedTheme(): string {
    return this.data.equippedTheme || 'theme_classic';
  }

  public equipTheme(id: string): void {
    if ((this.data.ownedThemes || []).includes(id)) {
      this.data.equippedTheme = id;
      this.saveData();
    }
  }

  public unlockTheme(id: string, price: number): boolean {
    if ((this.data.ownedThemes || []).includes(id)) return false;

    const success = this.spendPoints(price, `UNLOCK_THEME_${id.toUpperCase()}`);
    if (success) {
      if (!this.data.ownedThemes) this.data.ownedThemes = ['theme_classic'];
      this.data.ownedThemes.push(id);
      this.saveData();
      return true;
    }
    return false;
  }

  public getOwnedBackgrounds(): string[] {
    return this.data.ownedBackgrounds || ['bg_clean'];
  }

  public getEquippedBackground(): string {
    return this.data.equippedBackground || 'bg_clean';
  }

  public equipBackground(id: string): void {
    if ((this.data.ownedBackgrounds || []).includes(id)) {
      this.data.equippedBackground = id;
      this.saveData();
    }
  }

  public unlockBackground(id: string, price: number): boolean {
    if ((this.data.ownedBackgrounds || []).includes(id)) return false;

    const success = this.spendPoints(price, `UNLOCK_BG_${id.toUpperCase()}`);
    if (success) {
      if (!this.data.ownedBackgrounds) this.data.ownedBackgrounds = ['bg_clean'];
      this.data.ownedBackgrounds.push(id);
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Unified Inventory Generic Methods (Phase 32) ---
  public getOwnedItems(category: CosmeticCategory): string[] {
    switch (category) {
      case 'CHARACTERS': return this.getOwnedCharacters();
      case 'GATES': return this.getOwnedGates();
      case 'BACKGROUNDS': return this.getOwnedBackgrounds();
      case 'THEMES': return this.getOwnedThemes();
    }
  }

  public getEquippedItem(category: CosmeticCategory): string {
    switch (category) {
      case 'CHARACTERS': return this.getEquippedCharacter();
      case 'GATES': return this.getEquippedGate();
      case 'BACKGROUNDS': return this.getEquippedBackground();
      case 'THEMES': return this.getEquippedTheme();
    }
  }

  public equipItem(category: CosmeticCategory, id: string): boolean {
    if (!this.isOwned(category, id)) return false;
    switch (category) {
      case 'CHARACTERS': this.equipCharacter(id); break;
      case 'GATES': this.equipGate(id); break;
      case 'BACKGROUNDS': this.equipBackground(id); break;
      case 'THEMES': this.equipTheme(id); break;
    }
    return true;
  }

  public unlockItem(category: CosmeticCategory, id: string, price: number): boolean {
    switch (category) {
      case 'CHARACTERS': return this.unlockCharacter(id, price);
      case 'GATES': return this.unlockGate(id, price);
      case 'BACKGROUNDS': return this.unlockBackground(id, price);
      case 'THEMES': return this.unlockTheme(id, price);
    }
  }

  public isOwned(category: CosmeticCategory, id: string): boolean {
    return this.getOwnedItems(category).includes(id);
  }

  public isEquipped(category: CosmeticCategory, id: string): boolean {
    return this.getEquippedItem(category) === id;
  }

  // --- Achievement System (Phase 34) ---
  public getUnlockedAchievements(): string[] {
    return this.data.unlockedAchievements || [];
  }

  public hasAchievement(id: string): boolean {
    return (this.data.unlockedAchievements || []).includes(id);
  }

  public unlockAchievement(id: string): boolean {
    if (!this.data.unlockedAchievements) {
      this.data.unlockedAchievements = [];
    }
    if (this.data.unlockedAchievements.includes(id)) {
      return false;
    }
    this.data.unlockedAchievements.push(id);
    this.saveData();
    return true;
  }

  public getAchievementStats(): AchievementStats {
    if (!this.data.achievementStats) {
      this.data.achievementStats = {
        flawlessLevelsCount: 0,
        noHintLevelsCount: 0,
        speedRunLevelsCount: 0,
        dailyChallengesCount: 0,
      };
    }
    return { ...this.data.achievementStats };
  }

  public recordLevelAchievementStats(stats: {
    noLivesLost: boolean;
    noHints: boolean;
    underTargetTime: boolean;
    isDaily: boolean;
  }): void {
    if (!this.data.achievementStats) {
      this.data.achievementStats = {
        flawlessLevelsCount: 0,
        noHintLevelsCount: 0,
        speedRunLevelsCount: 0,
        dailyChallengesCount: 0,
      };
    }
    if (stats.noLivesLost) {
      this.data.achievementStats.flawlessLevelsCount += 1;
    }
    if (stats.noHints) {
      this.data.achievementStats.noHintLevelsCount += 1;
    }
    if (stats.underTargetTime) {
      this.data.achievementStats.speedRunLevelsCount += 1;
    }
    if (stats.isDaily) {
      this.data.achievementStats.dailyChallengesCount += 1;
    }
    this.saveData();
  }

  public getCompletedLevelsCount(): number {
    return Object.keys(this.data.levelRecords || {}).length;
  }

  public getThreeStarLevelsCount(): number {
    return Object.values(this.data.levelRecords || {}).filter(r => r.stars === 3).length;
  }

  // --- Endless Mode (Phase 35) ---
  public getEndlessStats(): EndlessStats {
    if (!this.data.endlessStats) {
      this.data.endlessStats = {
        highestLevel: 0,
        bestMoves: 9999,
        bestTime: 9999,
        highestDifficulty: 0,
        totalCompleted: 0,
      };
    }
    return { ...this.data.endlessStats };
  }

  public getEndlessHighestLevel(): number {
    return this.getEndlessStats().highestLevel;
  }

  public getEndlessRecord(endlessLevel: number): LevelRecord | null {
    return this.data.endlessRecords?.[endlessLevel] || null;
  }

  public saveEndlessCompletion(
    endlessLevel: number,
    moves: number,
    time: number,
    stars: number,
    difficulty: number,
    pointsEarned: number = 0
  ): void {
    if (!this.data.endlessRecords) this.data.endlessRecords = {};
    if (!this.data.endlessStats) this.getEndlessStats();

    const existing = this.data.endlessRecords[endlessLevel];
    
    // Check against history for absolute safety against duplicate rewards
    const alreadyRewarded = this.data.rewardHistory.some(h => h.levelId === -(100000 + endlessLevel) && h.reason === 'ENDLESS_COMPLETE');
    
    // Only grant points on the very first completion to prevent replay farming
    const actualPointsToAward = (existing || alreadyRewarded) ? 0 : pointsEarned;
    
    const newRecord: LevelRecord = {
      completed: true,
      stars: Math.max(existing?.stars || 0, stars),
      bestMoves: existing ? Math.min(existing.bestMoves, moves) : moves,
      bestTime: existing ? Math.min(existing.bestTime, time) : time,
      completedAt: existing ? existing.completedAt : new Date().toISOString(),
      pointsEarned: existing ? existing.pointsEarned : actualPointsToAward
    };

    this.data.endlessRecords[endlessLevel] = newRecord;

    // Update global endless stats
    if (endlessLevel > this.data.endlessStats.highestLevel) {
      this.data.endlessStats.highestLevel = endlessLevel;
    }
    if (moves < this.data.endlessStats.bestMoves) {
      this.data.endlessStats.bestMoves = moves;
    }
    if (time < this.data.endlessStats.bestTime) {
      this.data.endlessStats.bestTime = time;
    }
    if (difficulty > this.data.endlessStats.highestDifficulty) {
      this.data.endlessStats.highestDifficulty = difficulty;
    }
    if (!existing) {
      this.data.endlessStats.totalCompleted += 1;
    }
    
    // Increment points safely
    if (actualPointsToAward > 0) {
      this.data.currentPoints += actualPointsToAward;
      this.data.lifetimePoints += actualPointsToAward;
      this.data.rewardHistory.push({
        levelId: -(100000 + endlessLevel),
        timestamp: new Date().toISOString(),
        points: actualPointsToAward,
        reason: 'ENDLESS_COMPLETE'
      });
      if (this.data.rewardHistory.length > 500) {
        this.data.rewardHistory.shift();
      }
    }

    this.saveData();
  }
}