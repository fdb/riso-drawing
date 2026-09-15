// part f: scenes and functions built by one author; index.js merges all parts.
import { telescopeDishlet } from '../functions/telescopeDishlet.js';
import { campfireFlame } from '../functions/campfireFlame.js';
import { sunflower } from '../functions/sunflower.js';
import { pondBubbles } from '../functions/pondBubbles.js';
import { scene as telescope } from '../scenes/telescope.js';
import { scene as campfire } from '../scenes/campfire.js';
import { scene as sunflowers } from '../scenes/sunflowers.js';
import { scene as savanna } from '../scenes/savanna.js';
import { scene as pond } from '../scenes/pond.js';

export const functions = { telescopeDishlet, campfireFlame, sunflower, pondBubbles };
export const scenes = { telescope, campfire, sunflowers, savanna, pond };
