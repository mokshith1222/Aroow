export interface ThemeColors {
  bg: string;
  surface: string;
  wall: string;
  cell: string;
  accent: string;
  text: string;
}

export interface ThemeCosmetic {
  id: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  price: number;
  description: string;
  colors: ThemeColors;
}

export const THEMES: ThemeCosmetic[] = [
  {
    id: 'theme_classic',
    name: 'Classic',
    rarity: 'Common',
    price: 0,
    description: 'Obsidian minimalist dark mode with electric cyan accents.',
    colors: {
      bg: '#09090c',
      surface: '#121217',
      wall: '#272733',
      cell: '#14141a',
      accent: '#00f0ff',
      text: '#f8fafc'
    }
  },
  {
    id: 'theme_midnight',
    name: 'Midnight',
    rarity: 'Common',
    price: 800,
    description: 'Deep navy starlight gloom with icy sapphire accents.',
    colors: {
      bg: '#0b1329',
      surface: '#131f3d',
      wall: '#1c2d59',
      cell: '#0f172a',
      accent: '#38bdf8',
      text: '#f1f5f9'
    }
  },
  {
    id: 'theme_ocean',
    name: 'Ocean',
    rarity: 'Uncommon',
    price: 1500,
    description: 'Abyssal deep teal waters with vivid marine aqua glow.',
    colors: {
      bg: '#041f24',
      surface: '#08333b',
      wall: '#0e4954',
      cell: '#06282f',
      accent: '#2dd4bf',
      text: '#f0fdfa'
    }
  },
  {
    id: 'theme_forest',
    name: 'Forest',
    rarity: 'Uncommon',
    price: 2200,
    description: 'Woodland canopy charcoal with vibrant emerald foliage.',
    colors: {
      bg: '#081c15',
      surface: '#1b4332',
      wall: '#2d6a4f',
      cell: '#0d281e',
      accent: '#52b788',
      text: '#d8f3dc'
    }
  },
  {
    id: 'theme_sunset',
    name: 'Sunset',
    rarity: 'Rare',
    price: 3200,
    description: 'Twilight dusk violet with radiant amber and coral embers.',
    colors: {
      bg: '#1c0f24',
      surface: '#2d1b3b',
      wall: '#4a285c',
      cell: '#23142e',
      accent: '#f97316',
      text: '#fff1f2'
    }
  },
  {
    id: 'theme_neon',
    name: 'Neon',
    rarity: 'Rare',
    price: 4500,
    description: 'Synthwave dark violet with hot electrifying magenta neon.',
    colors: {
      bg: '#180728',
      surface: '#260c3e',
      wall: '#44146e',
      cell: '#1f0934',
      accent: '#f43f5e',
      text: '#fdf4ff'
    }
  },
  {
    id: 'theme_cyber',
    name: 'Cyber',
    rarity: 'Epic',
    price: 6000,
    description: 'Matrix terminal carbon with phosphor lime circuitry.',
    colors: {
      bg: '#05140d',
      surface: '#0a2318',
      wall: '#133e2b',
      cell: '#071c12',
      accent: '#10b981',
      text: '#ecfdf5'
    }
  },
  {
    id: 'theme_galaxy',
    name: 'Galaxy',
    rarity: 'Epic',
    price: 7500,
    description: 'Cosmic interstellar purple with nebula violet glow.',
    colors: {
      bg: '#120826',
      surface: '#1e0d3d',
      wall: '#341666',
      cell: '#180a33',
      accent: '#a855f7',
      text: '#faf5ff'
    }
  },
  {
    id: 'theme_space',
    name: 'Space',
    rarity: 'Epic',
    price: 9000,
    description: 'Deep void black abyss with hyper-bright celestial cyan.',
    colors: {
      bg: '#030712',
      surface: '#0f172a',
      wall: '#1e293b',
      cell: '#090d16',
      accent: '#06b6d4',
      text: '#f8fafc'
    }
  },
  {
    id: 'theme_minimal_white',
    name: 'Minimal White',
    rarity: 'Legendary',
    price: 11000,
    description: 'Ultra-clean studio white with graphite walls & sapphire vectors.',
    colors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      wall: '#1e293b',
      cell: '#e2e8f0',
      accent: '#2563eb',
      text: '#0f172a'
    }
  }
];

export function getThemeById(id: string): ThemeCosmetic {
  return THEMES.find(t => t.id === id) || THEMES[0];
}
