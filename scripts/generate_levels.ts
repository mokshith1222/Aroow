import { LevelGenerator } from '../src/game/LevelGenerator';
import { levels as handcraftedLevels } from '../src/data/levels';
import { getPresetForLevelId } from '../src/game/LevelGeneratorPresets';
import { LevelSolver } from '../src/game/LevelSolver';
import existingLevels from '../src/data/levels_db.json';
import * as fs from 'fs';
import * as path from 'path';

function runGeneration() {
  console.log('Generating 500 levels for static Level DB...');
  LevelGenerator.clearRegistry();
  const existingById = new Map(existingLevels.map(level => [level.id, level]));
  
  const allLevels = [];
  
  // 1-20 are handcrafted
  for (const lvl of handcraftedLevels) {
    const solution = LevelSolver.solve(lvl);
    if (!solution.solvable) throw new Error(`Handcrafted level ${lvl.id} is unsolvable!`);
    const fp = LevelGenerator.computeCanonicalFingerprint(lvl, solution);
    // Ignore protected registry for handcrafted but calculate metrics
    lvl.difficulty = LevelGenerator.calculateDifficulty(lvl, solution, getPresetForLevelId(lvl.id));
    allLevels.push(lvl);
  }

  // Generate remaining up to 500
  for (let i = handcraftedLevels.length + 1; i <= 500; i++) {
    try {
      const generated = LevelGenerator.generate(i);
      allLevels.push(generated);
      if (i % 50 === 0) console.log(`Generated level ${i}...`);
    } catch (e) {
      const fallback = existingById.get(i);
      if (!fallback) {
        console.error(`Failed on level ${i} and no fallback exists:`, e);
        process.exit(1);
      }

      console.warn(`Using existing validated level ${i} after generation failure.`);
      allLevels.push({ ...fallback });
    }
  }

  const jsonPath = path.join(process.cwd(), 'src', 'data', 'levels_db.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allLevels, null, 2));
  console.log(`Successfully generated 500 levels and saved to ${jsonPath}`);

  // Create report
  let md = `# Advanced Level Generator - Pre-Generation Report\n\n`;
  md += `| Level ID | Grid Size | Optimal Moves | Difficulty Score (1-100) | Preset |\n`;
  md += `|---|---|---|---|---|\n`;

  let totalDifficulty = 0;
  for (const lvl of allLevels) {
    const preset = getPresetForLevelId(lvl.id);
    totalDifficulty += lvl.difficulty || 0;
    md += `| ${lvl.id} | ${lvl.width}x${lvl.height} | ${lvl.optimalSolutionLength} | **${lvl.difficulty}** | ${preset.name} |\n`;
  }

  const avgDifficulty = totalDifficulty / 500;
  md += `\n**Average Difficulty:** ${avgDifficulty.toFixed(2)}\n`;

  const reportPath = path.join(process.cwd(), 'generation_report.md');
  fs.writeFileSync(reportPath, md);
  console.log('Report generated at:', reportPath);
}

runGeneration();
