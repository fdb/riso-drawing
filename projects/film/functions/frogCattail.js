// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- frogCattail: a reed stalk with a sausage head, swaying at the top, printed as near-black green (all three inks) ----
LIB.frogCattail = {
  label: 'Cattail reed',
  params: {
    x: Q(100, 0, 1080, 1), y: Q(1040, 0, 1080, 1, 'base'), h: Q(600, 50, 1080, 1, 'height'), lean: Q(0, -0.6, 0.6, 0.01, 'lean (rad)'),
    head: Q(110, 0, 300, 1, 'head length'), hw: Q(9, 2, 30, 0.5, 'head half width'), w: Q(4, 1, 20, 0.5, 'stalk width'),
    sway: Q(3, 0, 20, 0.5), pink: Q(0.7, 0, 1, 0.01, 'pink in the dark mix'), seed: Q(1, 0, 99, 1),
  },
  xf: { x: '$x', y: '$y', rot: '$lean' },
  graph: {
    let: { sw: '$sway*sin(t*0.8 + $seed*1.7)' },
    nodes: {
      stalk: { type: 'line', params: { x0: 0, y0: 0, x1: 0, y1: '-$h', n: 16 } },
      stalkW: { type: 'wrangle', in: { geo: 'stalk' }, params: { x: '@x + $sw*@v*@v', w: '$w*(1.1-0.4*@v)' } },
      stalkH: { type: 'hand', in: { geo: 'stalkW' }, params: { step: 8, wobble: 1.5, wave: 120, jitter: 0.3, press: 0.2, taper: 0, overshoot: 0, seed: '$seed' } },
      headE: { type: 'ellipse', params: { x: '$sw', y: '-$h + $head*0.5', rx: '$hw', ry: '$head*0.5', n: 40 } },
      headH: { type: 'hand', in: { geo: 'headE' }, params: { step: 6, wobble: 1.2, wave: 60, jitter: 0.5, press: 0, taper: 0, overshoot: 0, seed: '$seed' } },
      sB: { type: 'stroke', in: { geo: 'stalkH' }, params: { ink: 'blue', mode: 'add' } },
      sY: { type: 'stroke', in: { geo: 'stalkH' }, params: { ink: 'yellow', mode: 'add' } },
      sP: { type: 'stroke', in: { geo: 'stalkH' }, params: { ink: 'pink', mode: 'add', tone: '$pink' } },
      hB: { type: 'fill', in: { geo: 'headH' }, params: { ink: 'blue', mode: 'add' } },
      hY: { type: 'fill', in: { geo: 'headH' }, params: { ink: 'yellow', mode: 'add' } },
      hP: { type: 'fill', in: { geo: 'headH' }, params: { ink: 'pink', mode: 'add', tone: '$pink' } },
      out: { type: 'merge', in: { list: ['sB', 'sY', 'sP', 'hB', 'hY', 'hP'] } },
    },
    output: 'out',
  },
};

export const frogCattail = LIB.frogCattail;
