// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- bat: one silhouette, wingspan $w, wings beat with $flap; geometry only, the caller inks it ----
LIB.batSilhouette = {
  label: 'Bat',
  params: { x: Q(0, -1080, 1080, 1), y: Q(0, -1080, 1080, 1), w: Q(60, 4, 400, 1, 'wingspan'), rot: Q(0, -3.2, 3.2, 0.01), flap: Q(1, 0.4, 1.6, 0.01, 'wing lift'), seed: Q(0, 0, 99, 1) },
  xf: { x: '$x', y: '$y', rot: '$rot', scale: '$w/100' },
  graph: {
    let: { fl: '$flap' },
    nodes: {
      shape: { type: 'polygon', params: { pts: '-50 -17*$fl -30 -15*$fl -12 -8 -8 -18 -4 -9 0 -11 4 -9 8 -18 12 -8 30 -15*$fl 50 -17*$fl 35 -2*$fl 27 8 17 3 10 13 0 15 -10 13 -17 3 -27 8 -35 -2*$fl' } },
      rough: { type: 'hand', in: { geo: 'shape' }, params: { step: 3, wobble: 0.8, wave: 20, jitter: 0.3, press: 0, taper: 0, overshoot: 0, seed: '$seed' } },
    },
    output: 'rough',
  },
};

export const batSilhouette = LIB.batSilhouette;
