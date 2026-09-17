import fs from 'fs';
import path from 'path';
import { LevelSolver } from './src/game/LevelSolver';
import { LevelGenerator } from './src/game/LevelGenerator';

async function run() {
  const dbPath = path.join(process.cwd(), 'src/data/levels_db.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const idx = db.findIndex((l: any) => l.id === 64);
  if (idx === -1) {
    console.log('Level 64 not found');
    process.exit(1);
  }

  const level64 = db[idx];
  const result = LevelSolver.solve(level64);

  if (result.solvable) {
    console.log(`Level 64 IS solvable in ${result.solution.length} moves.`);
  } else {
    console.log('Level 64 is UNSOLVABLE.');
  }

  console.log('Generating new level 64...');
  let newLevelResult = LevelGenerator.generateLevel(64, 3);
  while (!newLevelResult.success || !newLevelResult.level) {
    console.log('Attempt failed, retrying...');
    newLevelResult = LevelGenerator.generateLevel(64, 3);
  }

  db[idx] = newLevelResult.level;
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('Saved new level 64 to levels_db.json');
}

run().catch(console.error);
