import type { CosmeticCategory, CosmeticItem } from './InventoryTypes';
import { COSMETICS } from './Cosmetics';
import { GATES } from './Gates';
import { BACKGROUNDS } from './Backgrounds';
import { THEMES } from './Themes';
import { TOUCHPADS } from './Touchpads';

export const UNIFIED_COSMETICS: CosmeticItem[] = [
  // 1. CHARACTERS
  ...COSMETICS.map(c => ({
    id: c.id,
    category: 'CHARACTERS' as CosmeticCategory,
    name: c.name,
    rarity: c.rarity,
    price: c.price,
    description: c.id === 'classic_arrow' ? 'Default responsive minimalist vector arrow.' : `Cosmetic ${c.name} avatar token.`,
    icon: c.icon
  })),

  // 2. GATES
  ...GATES.map(g => ({
    id: g.id,
    category: 'GATES' as CosmeticCategory,
    name: g.name,
    rarity: g.rarity,
    price: g.price,
    description: g.description,
    icon: g.icon,
    themeColor: g.themeColor,
    accentColor: g.accentColor
  })),

  // 3. BACKGROUNDS
  ...BACKGROUNDS.map(b => ({
    id: b.id,
    category: 'BACKGROUNDS' as CosmeticCategory,
    name: b.name,
    rarity: b.rarity,
    price: b.price,
    description: b.description,
    icon: b.icon,
    metadata: { patternClass: b.patternClass }
  })),

  // 4. THEMES
  ...THEMES.map(t => ({
    id: t.id,
    category: 'THEMES' as CosmeticCategory,
    name: t.name,
    rarity: t.rarity,
    price: t.price,
    description: t.description,
    icon: '🎨',
    themeColor: t.colors.accent,
    metadata: { colors: t.colors }
  })),

  // 5. TOUCHPADS
  ...TOUCHPADS.map(tp => ({
    id: tp.id,
    category: 'TOUCHPADS' as CosmeticCategory,
    name: tp.name,
    rarity: tp.rarity,
    price: tp.price,
    description: tp.description,
    icon: tp.icon,
    themeColor: tp.themeColor
  }))
];

export function getAllCosmetics(): CosmeticItem[] {
  return UNIFIED_COSMETICS;
}

export function getCosmeticsByCategory(category: CosmeticCategory): CosmeticItem[] {
  return UNIFIED_COSMETICS.filter(item => item.category === category);
}

export function getCosmeticById(id: string): CosmeticItem | undefined {
  return UNIFIED_COSMETICS.find(item => item.id === id);
}

export const COSMETIC_CATEGORIES: CosmeticCategory[] = [
  'CHARACTERS',
  'GATES',
  'BACKGROUNDS',
  'THEMES',
  'TOUCHPADS'
];
