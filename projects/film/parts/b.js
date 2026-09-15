// part b: scenes and functions built by one author; index.js merges all parts.
import { scene as telephone } from '../scenes/telephone.js';
import { scene as turntable } from '../scenes/turntable.js';
import { scene as frog } from '../scenes/frog.js';
import { scene as bats } from '../scenes/bats.js';
import { scene as wave } from '../scenes/wave.js';
// functions: telephone
import { phoneHandset } from '../functions/phoneHandset.js';
import { phoneDial } from '../functions/phoneDial.js';
// functions: turntable
import { vinyl } from '../functions/vinyl.js';
import { tonearm } from '../functions/tonearm.js';
// functions: frog
import { frogMoon } from '../functions/frogMoon.js';
import { frogCattail } from '../functions/frogCattail.js';
import { frogling } from '../functions/frogling.js';
// functions: bats
import { batSilhouette } from '../functions/batSilhouette.js';
import { batFlock } from '../functions/batFlock.js';
import { batSonar } from '../functions/batSonar.js';
import { batCliff } from '../functions/batCliff.js';
import { batMesa } from '../functions/batMesa.js';
// functions: wave
import { waveCurl } from '../functions/waveCurl.js';
import { waveSpray } from '../functions/waveSpray.js';
import { waveFoam } from '../functions/waveFoam.js';

export const functions = {
  // telephone
  phoneHandset, phoneDial,
  // turntable
  vinyl, tonearm,
  // frog
  frogMoon, frogCattail, frogling,
  // bats
  batSilhouette, batFlock, batSonar, batCliff, batMesa,
  // wave
  waveCurl, waveSpray, waveFoam,
};
export const scenes = { telephone, turntable, frog, bats, wave };
