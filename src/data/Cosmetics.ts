export interface Cosmetic {
  id: string;
  name: string;
  icon: string; 
  price: number;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
}

export const COSMETICS: Cosmetic[] = [
  { id: 'classic_arrow', name: 'Classic Arrow', icon: '➤', price: 0, rarity: 'Common' },
  { id: 'ball', name: 'Ball', icon: '●', price: 500, rarity: 'Common' },
  { id: 'cube', name: 'Cube', icon: '■', price: 800, rarity: 'Uncommon' },
  { id: 'crystal', name: 'Crystal', icon: '✦', price: 1200, rarity: 'Uncommon' },
  { id: 'ghost', name: 'Ghost', icon: '👻', price: 2000, rarity: 'Rare' },
  { id: 'cat', name: 'Cat', icon: '🐱', price: 2500, rarity: 'Rare' },
  { id: 'robot', name: 'Robot', icon: '🤖', price: 3500, rarity: 'Epic' },
  { id: 'ninja', name: 'Ninja', icon: '🥷', price: 5000, rarity: 'Epic' },
  { id: 'spaceship', name: 'Spaceship', icon: '🚀', price: 7500, rarity: 'Legendary' },
  { id: 'monster', name: 'Monster', icon: '👾', price: 10000, rarity: 'Legendary' }
];
