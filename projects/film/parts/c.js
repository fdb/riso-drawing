// part c: scenes and functions built by one author; index.js merges all parts.
import { rain } from '../functions/rain.js';
import { leaf } from '../functions/leaf.js';
import { sunflowerHead } from '../functions/sunflower-head.js';
import { wavering } from '../functions/wavering.js';
import { trumpet } from '../functions/trumpet.js';
import { scene as cat } from '../scenes/cat.js';
import { scene as bee } from '../scenes/bee.js';
import { scene as radio } from '../scenes/radio.js';
import { scene as hummingbird } from '../scenes/hummingbird.js';
import { scene as kettle } from '../scenes/kettle.js';

export const functions = { rain, leaf, sunflowerHead, wavering, trumpet };
export const scenes = { cat, bee, radio, hummingbird, kettle };
