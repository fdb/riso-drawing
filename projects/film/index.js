// The film project: functions made of nodes, and the scenes that use them.
// The core (../../engine) is code; everything here is data that only this project needs.
import { world } from './world.js';
import { print } from './print.js';
import { scenes } from './scenes.js';

export const functions = { ...print, ...world };
export { scenes };
export const project = { name: 'film', functions, scenes };
