import { LevelLoader } from './src/game/LevelLoader.ts';
import { MechanicResolver } from './src/game/MechanicResolver.ts';
import { Movement } from './src/game/Movement.ts';
import { Grid } from './src/game/Grid.ts';

const level = LevelLoader.getLevel(273)!;
const resolver = new MechanicResolver(level.tiles ?? []);
const grid = new Grid(level.width, level.height, level.walls, level.gates ?? [], level.keys ?? []);

(resolver as any).IS_MY_RESOLVER = true;
console.log("TEST getPortalTarget:", resolver.getPortalTarget({x: 2, y: 4}));

const res = Movement.attemptMove(
  {x: 2, y: 5},
  'UP',
  grid,
  resolver,
  new Set()
);

console.log("res:", res);
