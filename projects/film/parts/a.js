// part a: scenes and functions built by one author; index.js merges all parts.
import { bellRings } from '../functions/bell-rings.js';
import { lighthouseStreaks } from '../functions/lighthouse-streaks.js';
import { bellWaves } from '../functions/bell-waves.js';
import { flyInsect } from '../functions/fly-insect.js';
import { owl } from '../functions/owl.js';
import { bell } from '../functions/bell.js';
import { lighthouse } from '../functions/lighthouse.js';
import { wolfPines } from '../functions/wolf-pines.js';
import { wolf } from '../functions/wolf.js';
import { scene as fly } from '../scenes/fly.js';
import { scene as owlScene } from '../scenes/owl.js';
import { scene as bellScene } from '../scenes/bell.js';
import { scene as lighthouseScene } from '../scenes/lighthouse.js';
import { scene as wolfScene } from '../scenes/wolf.js';

export const functions = { bellRings, lighthouseStreaks, bellWaves, flyInsect, owl, bell, lighthouse, wolfPines, wolf };
export const scenes = { fly, owl: owlScene, bell: bellScene, lighthouse: lighthouseScene, wolf: wolfScene };
