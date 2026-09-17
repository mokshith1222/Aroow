import fs from 'fs';
import path from 'path';
import { LevelSolver } from './src/game/LevelSolver';
import { LevelValidator } from './src/game/LevelValidator';
import type { LevelData } from './src/game/types';

// Load all levels
const levelsDbPath = path.join(process.cwd(), 'src/data/levels_db.json');
const levels: LevelData[] = JSON.parse(fs.readFileSync(levelsDbPath, 'utf8'));

console.log(`Starting audit of ${levels.length} levels...`);

const report = {
  totalLevels: levels.length,
  solvable: 0,
  impossible: [] as number[],
  tooEasy: [] as number[],
  multipleShortestPaths: [] as number[],
  incorrectDifficulty: [] as number[],
  repetitive: [] as number[],
  frustrating: [] as number[],
  mechanicValidity: [] as number[],
};

const fingerprintMap = new Map<string, number[]>();

levels.forEach((level, index) => {
  if (index % 50 === 0) console.log(`Auditing level ${level.id}...`);
  
  const validation = LevelValidator.validate(level);
  const solution = validation.solution || LevelSolver.solve(level);
  
  if (!solution.solvable) {
    report.impossible.push(level.id);
  } else {
    report.solvable++;
    
    if (solution.optimalMoves < 3) {
      report.tooEasy.push(level.id);
    }
    
    if (solution.shortestPathCount > 1) {
      report.multipleShortestPaths.push(level.id);
    }
    
    // Frustrating: High dead ends + high branching but low optimal moves, or extremely high complexity
    if (solution.deadEndCount > 15 && solution.optimalMoves < 10) {
      report.frustrating.push(level.id);
    } else if (solution.solutionComplexity > 150) {
      report.frustrating.push(level.id);
    }
    
    // Difficulty mismatch
    const expectedDifficulty = Math.min(10, Math.ceil(level.id / 50));
    // Note: difficulty is 1-100 scale on generation? Or 1-10? LevelGenerator uses preset difficulty.
    // Let's just flag if difficulty is way off.
    if (level.difficulty !== undefined) {
       // Just flag if difficulty is <= 0 or > 100
       if (level.difficulty <= 0 || level.difficulty > 100) {
         report.incorrectDifficulty.push(level.id);
       }
    }

    // Similarity check (fingerprint)
    // Create a normalized string representation of walls + start + goal relative positions
    const sortedWalls = [...level.walls].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    // Normalize to start at 0,0
    let minX = level.start.x, minY = level.start.y;
    sortedWalls.forEach(w => { minX = Math.min(minX, w.x); minY = Math.min(minY, w.y); });
    minX = Math.min(minX, level.goal.x); minY = Math.min(minY, level.goal.y);
    
    const fingerprint = JSON.stringify({
      s: { x: level.start.x - minX, y: level.start.y - minY },
      g: { x: level.goal.x - minX, y: level.goal.y - minY },
      w: sortedWalls.map(w => ({ x: w.x - minX, y: w.y - minY }))
    });
    
    if (!fingerprintMap.has(fingerprint)) {
      fingerprintMap.set(fingerprint, []);
    }
    fingerprintMap.get(fingerprint)!.push(level.id);
  }
});

for (const [fp, ids] of fingerprintMap.entries()) {
  if (ids.length > 1) {
    report.repetitive.push(...ids);
  }
}

// Ensure unique values
report.repetitive = [...new Set(report.repetitive)].sort((a,b)=>a-b);
report.frustrating = [...new Set(report.frustrating)].sort((a,b)=>a-b);
report.multipleShortestPaths = [...new Set(report.multipleShortestPaths)].sort((a,b)=>a-b);
report.tooEasy = [...new Set(report.tooEasy)].sort((a,b)=>a-b);

console.log('\n--- AUDIT REPORT ---');
console.log(`Total Levels: ${report.totalLevels}`);
console.log(`Solvable: ${report.solvable}`);
console.log(`Impossible: ${report.impossible.length} => [${report.impossible.join(', ')}]`);
console.log(`Too Easy (<3 moves): ${report.tooEasy.length} => [${report.tooEasy.join(', ')}]`);
console.log(`Multiple Shortest Paths: ${report.multipleShortestPaths.length}`);
console.log(`Incorrect Difficulty: ${report.incorrectDifficulty.length} => [${report.incorrectDifficulty.join(', ')}]`);
console.log(`Repetitive/Duplicates: ${report.repetitive.length} => [${report.repetitive.join(', ')}]`);
console.log(`Frustrating: ${report.frustrating.length} => [${report.frustrating.join(', ')}]`);

fs.writeFileSync('audit_results.json', JSON.stringify(report, null, 2));
console.log('\nWrote full results to audit_results.json');
