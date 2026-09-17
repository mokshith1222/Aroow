import type { ThemeColors } from './Themes';

export type CosmeticCategory = 'CHARACTERS' | 'GATES' | 'BACKGROUNDS' | 'THEMES';

export type CosmeticRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  name: string;
  rarity: CosmeticRarity;
  price: number;
  description: string;
  icon?: string;
  themeColor?: string;
  accentColor?: string;
  metadata?: {
    patternClass?: string;
    colors?: ThemeColors;
    [key: string]: any;
  };
}

export interface EquippedLoadout {
  character: string;
  gate: string;
  background: string;
  theme: string;
}
