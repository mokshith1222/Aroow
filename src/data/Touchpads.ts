import type { CosmeticRarity } from './InventoryTypes';

export interface TouchpadSkin {
  id: string;
  name: string;
  icon: string;
  price: number;
  rarity: CosmeticRarity;
  description: string;
  themeColor?: string;
}

export const TOUCHPADS: TouchpadSkin[] = [
  { id: 'touchpad_default', name: 'Default', icon: '⬜', price: 0, rarity: 'Common', description: 'Standard sleek laptop trackpad.' },
  { id: 'touchpad_dark', name: 'Dark Mode', icon: '⬛', price: 500, rarity: 'Common', description: 'Matte black anti-glare surface.' },
  { id: 'touchpad_ocean', name: 'Ocean', icon: '🌊', price: 1000, rarity: 'Uncommon', description: 'Deep blue gradient with liquid feel.' },
  { id: 'touchpad_neon', name: 'Neon', icon: '💡', price: 1500, rarity: 'Rare', description: 'Cyberpunk inspired glowing border.' },
  { id: 'touchpad_purple', name: 'Purple Haze', icon: '🟪', price: 1500, rarity: 'Rare', description: 'Vibrant purple aesthetic.' },
  { id: 'touchpad_sunset', name: 'Sunset', icon: '🌅', price: 2000, rarity: 'Rare', description: 'Warm orange and pink hues.' },
  { id: 'touchpad_galaxy', name: 'Galaxy', icon: '🌌', price: 3000, rarity: 'Epic', description: 'Stellar space themed interactive surface.' },
  { id: 'touchpad_glass', name: 'Glassmorphism', icon: '🪟', price: 4000, rarity: 'Epic', description: 'Ultra-modern frosted glass with blur.' },
  { id: 'touchpad_aurora', name: 'Aurora', icon: '✨', price: 5000, rarity: 'Legendary', description: 'Shifting northern lights colors.' }
];
