// part e: scenes and functions built by one author; index.js merges all parts.
import { rocketPuff } from '../functions/rocketPuff.js';
import { rocketShip } from '../functions/rocketShip.js';
import { cityBuilding } from '../functions/cityBuilding.js';
import { balloonsBalloon } from '../functions/balloonsBalloon.js';
import { scene as rocket } from '../scenes/rocket.js';
import { scene as city } from '../scenes/city.js';
import { scene as saturn } from '../scenes/saturn.js';
import { scene as balloons } from '../scenes/balloons.js';
import { scene as volcano } from '../scenes/volcano.js';

export const functions = { rocketPuff, rocketShip, cityBuilding, balloonsBalloon };
export const scenes = { rocket, city, saturn, balloons, volcano };
