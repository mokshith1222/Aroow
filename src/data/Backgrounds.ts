import type { CosmeticItem } from './InventoryTypes';

export interface BackgroundCosmetic extends CosmeticItem {
  category: 'BACKGROUNDS';
  patternClass: string;
}

export const BACKGROUNDS: BackgroundCosmetic[] = [
  {
    id: 'bg_clean',
    category: 'BACKGROUNDS',
    name: 'Clean Gradient',
    rarity: 'Common',
    price: 0,
    description: 'Smooth, distraction-free minimalist ambient vignette.',
    icon: '◫',
    patternClass: 'pattern-clean'
  },
  {
    id: 'bg_subtle_grid',
    category: 'BACKGROUNDS',
    name: 'Blueprint Grid',
    rarity: 'Common',
    price: 700,
    description: 'Subtle technical vector drafting grid coordinates.',
    icon: '▦',
    patternClass: 'pattern-grid'
  },
  {
    id: 'bg_dots',
    category: 'BACKGROUNDS',
    name: 'Dot Matrix',
    rarity: 'Uncommon',
    price: 1200,
    description: 'Precision typographic dot grid matrix.',
    icon: '⁖',
    patternClass: 'pattern-dots'
  },
  {
    id: 'bg_circuit',
    category: 'BACKGROUNDS',
    name: 'Cyber Circuit',
    rarity: 'Uncommon',
    price: 2000,
    description: 'Understated micro-electronic circuit traces.',
    icon: '⑂',
    patternClass: 'pattern-circuit'
  },
  {
    id: 'bg_hex',
    category: 'BACKGROUNDS',
    name: 'Hex Mesh',
    rarity: 'Rare',
    price: 3000,
    description: 'Delicate geometric honeycomb tessellation.',
    icon: '⬡',
    patternClass: 'pattern-hex'
  },
  {
    id: 'bg_stars',
    category: 'BACKGROUNDS',
    name: 'Starfield',
    rarity: 'Rare',
    price: 4000,
    description: 'Deep cosmic starlight pinpricks across the void.',
    icon: '✦',
    patternClass: 'pattern-stars'
  },
  {
    id: 'bg_radial_pulse',
    category: 'BACKGROUNDS',
    name: 'Radial Focus',
    rarity: 'Epic',
    price: 5500,
    description: 'Focused ambient radial light glow centered on the puzzle.',
    icon: '◎',
    patternClass: 'pattern-radial'
  },
  {
    id: 'bg_geometric',
    category: 'BACKGROUNDS',
    name: 'Geometric Wire',
    rarity: 'Epic',
    price: 7000,
    description: 'Modern diagonal isometric vector mesh.',
    icon: '◇',
    patternClass: 'pattern-geometric'
  },
  {
    id: 'bg_aurora',
    category: 'BACKGROUNDS',
    name: 'Aurora Veil',
    rarity: 'Epic',
    price: 8500,
    description: 'Ethereal ambient polar atmospheric gradient.',
    icon: '〰',
    patternClass: 'pattern-aurora'
  },
  {
    id: 'bg_prism',
    category: 'BACKGROUNDS',
    name: 'Prism Lattice',
    rarity: 'Legendary',
    price: 10000,
    description: 'Subtle multi-spectral refractive crystal vectors.',
    icon: '◈',
    patternClass: 'pattern-prism'
  }
];

export function getBackgroundById(id: string): BackgroundCosmetic {
  return BACKGROUNDS.find(b => b.id === id) || BACKGROUNDS[0];
}
