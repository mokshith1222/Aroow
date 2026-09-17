import { LevelLoader } from '../src/game/LevelLoader';
import { LevelSolver } from '../src/game/LevelSolver';
import { LevelGeneratorPresets } from '../src/game/LevelGeneratorPresets'; // Actually we don't need this if LevelLoader gives us levels. Wait, we need LevelGenerator for difficulty calculation.
import { LevelGenerator } from '../src/game/LevelGenerator';
import { getPresetForLevelId } from '../src/game/LevelGeneratorPresets';
import * as fs from 'fs';
import * as path from 'path';

function analyzeLevels() {
  console.log('Generating difficulty report for all 500 levels...');
  let md = `# Advanced Difficulty Engine - Level Analysis Report\n\n`;
  md += `| Level ID | Grid Size | Optimal Moves | Difficulty Score (1-100) | Dead Ends | Branches | Path Count | Misleading Routes | Decision Points |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;

  let totalDifficulty = 0;

  for (let i = 1; i <= 500; i++) {
    const level = LevelLoader.getLevel(i);
    if (!level) continue;

    const solution = LevelSolver.solve(level);
    const preset = getPresetForLevelId(i);
    
    // We already have candidate.difficulty computed in LevelGenerator, but let's recalculate explicitly to be sure
    const difficultyScore = LevelGenerator.calculateDifficulty(level, solution, preset);
    
    totalDifficulty += difficultyScore;

    md += `| ${i} | ${level.width}x${level.height} | ${solution.optimalMoves} | **${difficultyScore}** | ${solution.deadEndCount} | ${solution.branchingFactor.toFixed(2)} | ${solution.shortestPathCount} | ${solution.misleadingRoutes} | ${solution.decisionPoints} |\n`;
  }

  const avgDifficulty = totalDifficulty / 500;
  md += `\n**Average Difficulty:** ${avgDifficulty.toFixed(2)}\n`;

  const outPath = path.join(process.cwd(), 'difficulty_report.md');
  fs.writeFileSync(outPath, md);
  console.log('Report generated at:', outPath);
}

analyzeLevels();
