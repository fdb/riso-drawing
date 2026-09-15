// The film project: functions made of nodes, and the scenes that use them.
// The core (../../engine) is code; everything here is data that only this project needs.
// One file per function and per scene, so parts can be written and reviewed on their own.
import { water } from './functions/water.js';
import { stars } from './functions/stars.js';
import { bubble } from './functions/bubble.js';
import { jellyfish } from './functions/jellyfish.js';
import { sky } from './functions/sky.js';
import { burst } from './functions/burst.js';
import { ridge } from './functions/ridge.js';
import { treeline } from './functions/treeline.js';
import { flake } from './functions/flake.js';
import { webflake } from './functions/webflake.js';
import { scene as jelly } from './scenes/jelly.js';
import { scene as fireworks } from './scenes/fireworks.js';
import { scene as mountains } from './scenes/mountains.js';
import { scene as snow } from './scenes/snow.js';
import { scene as main } from './scenes/main.js';

import * as partA from './parts/a.js';
import * as partB from './parts/b.js';
import * as partC from './parts/c.js';
import * as partD from './parts/d.js';
import * as partE from './parts/e.js';
import * as partF from './parts/f.js';
const parts = [partA, partB, partC, partD, partE, partF];

export const functions = { ...Object.assign({}, ...parts.map((p) => p.functions)),  water, stars, bubble, jellyfish, sky, burst, ridge, treeline, flake, webflake };
export const scenes = { ...Object.assign({}, ...parts.map((p) => p.scenes)),  jelly, fireworks, mountains, snow, main };
export const project = { name: 'film', functions, scenes };
