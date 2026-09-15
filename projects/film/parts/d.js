// part d: scenes and functions built by one author; index.js merges all parts.
import { ferris } from '../functions/ferris.js';
import { ferrisTent } from '../functions/ferrisTent.js';
import { waterfallFern } from '../functions/waterfallFern.js';
import { bicycleWheel } from '../functions/bicycleWheel.js';
import { whale } from '../functions/whale.js';
import { scene as ferrisScene } from '../scenes/ferris.js';
import { scene as waterfallScene } from '../scenes/waterfall.js';
import { scene as bicycleScene } from '../scenes/bicycle.js';
import { scene as whaleScene } from '../scenes/whale.js';
import { scene as pianoScene } from '../scenes/piano.js';

export const functions = { ferris, ferrisTent, waterfallFern, bicycleWheel, whale };
export const scenes = { ferris: ferrisScene, waterfall: waterfallScene, bicycle: bicycleScene, whale: whaleScene, piano: pianoScene };
