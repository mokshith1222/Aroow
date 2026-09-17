export interface GateCosmetic {
  id: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  price: number;
  description: string;
  icon: string;
  themeColor: string;
  accentColor: string;
}

export const GATES: GateCosmetic[] = [
  {
    id: 'classic_gate',
    name: 'Classic Gate',
    rarity: 'Common',
    price: 0,
    description: 'Minimalist golden concentric target with a diamond core.',
    icon: '◎',
    themeColor: '#eab308',
    accentColor: '#fef08a'
  },
  {
    id: 'portal_gate',
    name: 'Portal Gate',
    rarity: 'Common',
    price: 600,
    description: 'Swirling ultraviolet vortex with orbiting warp rings.',
    icon: '🌀',
    themeColor: '#a855f7',
    accentColor: '#38bdf8'
  },
  {
    id: 'crystal_gate',
    name: 'Crystal Gate',
    rarity: 'Uncommon',
    price: 1200,
    description: 'Prismatic geometric octahedron with shimmering emerald facets.',
    icon: '💎',
    themeColor: '#10b981',
    accentColor: '#6ee7b7'
  },
  {
    id: 'energy_gate',
    name: 'Energy Gate',
    rarity: 'Uncommon',
    price: 1800,
    description: 'High-voltage plasma containment rings with electric arcs.',
    icon: '⚡',
    themeColor: '#06b6d4',
    accentColor: '#67e8f9'
  },
  {
    id: 'galaxy_gate',
    name: 'Galaxy Gate',
    rarity: 'Rare',
    price: 2500,
    description: 'Cosmic spiral gateway infused with deep-space nebular dust.',
    icon: '🌌',
    themeColor: '#8b5cf6',
    accentColor: '#f43f5e'
  },
  {
    id: 'flame_gate',
    name: 'Flame Gate',
    rarity: 'Rare',
    price: 3500,
    description: 'Blazing solar flare corona with dancing crimson embers.',
    icon: '🔥',
    themeColor: '#f97316',
    accentColor: '#ef4444'
  },
  {
    id: 'nature_gate',
    name: 'Nature Gate',
    rarity: 'Rare',
    price: 4500,
    description: 'Bio-luminescent runic glyphs entwined with ethereal foliage.',
    icon: '🌿',
    themeColor: '#22c55e',
    accentColor: '#86efac'
  },
  {
    id: 'cyber_gate',
    name: 'Cyber Gate',
    rarity: 'Epic',
    price: 6000,
    description: 'Matrix HUD target reticle with neon digital wireframe scans.',
    icon: '📟',
    themeColor: '#10b981',
    accentColor: '#84cc16'
  },
  {
    id: 'star_gate',
    name: 'Star Gate',
    rarity: 'Epic',
    price: 8000,
    description: 'Celestial solar gate with a dazzling celestial supernova burst.',
    icon: '⭐',
    themeColor: '#f59e0b',
    accentColor: '#fffbeb'
  },
  {
    id: 'void_gate',
    name: 'Void Gate',
    rarity: 'Legendary',
    price: 10000,
    description: 'Obsidian dark-matter singularity with gravitational lensing aura.',
    icon: '🕳️',
    themeColor: '#6366f1',
    accentColor: '#c084fc'
  }
];

export function getGateById(id: string): GateCosmetic {
  return GATES.find(g => g.id === id) || GATES[0];
}
