import fs from 'fs';
import path from 'path';
import { LevelGenerator } from './src/game/LevelGenerator';
import type { LevelData } from './src/game/types';

async function main() {
  const TOTAL_LEVELS = 500;
  const levels: LevelData[] = [];
  
  console.log('Starting mass regeneration of 500 levels with hardcore presets...');
  
  // Clear registry to avoid fingerprint collision issues from previous generation
  LevelGenerator.clearRegistry();

  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    // Generate the level
    const level = LevelGenerator.generate(i);
    levels.push(level);
    
    console.log(`Generated level ${i}/${TOTAL_LEVELS} (Moves: ${level.optimalSolutionLength}, Mechanics: ${level.tiles?.length || 0})`);
  }

  const dbPath = path.join(process.cwd(), 'src/data/levels_db.json');
  fs.writeFileSync(dbPath, JSON.stringify(levels, null, 2));
  console.log(`\nSuccessfully regenerated all ${TOTAL_LEVELS} levels and saved to levels_db.json!`);
}

main().catch(console.error);
