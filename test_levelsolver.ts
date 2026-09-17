import { LevelLoader } from './src/game/LevelLoader.ts';
import { LevelSolver } from './src/game/LevelSolver.ts';

const level = LevelLoader.getLevel(273)!;
const result = LevelSolver.solve(level);

console.log("Solver path:", result.path.join(', '));
console.log("Solver moves:", result.moves);
