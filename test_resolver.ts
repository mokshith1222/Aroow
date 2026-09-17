import { LevelLoader } from './src/game/LevelLoader.ts';
import { MechanicResolver } from './src/game/MechanicResolver.ts';

const level = LevelLoader.getLevel(273)!;
const resolver = new MechanicResolver(level.tiles ?? []);
console.log("Tiles in resolver:", (resolver as any).tiles);
const target = resolver.getPortalTarget({x: 2, y: 4});
console.log("Portal target for 2,4:", target);
