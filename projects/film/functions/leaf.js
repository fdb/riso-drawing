// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- leaf: a green lens with a midrib and cross hatching. Base at (x, y), pointing along rot ----
LIB.leaf = {
  label: 'Leaf',
  params: {
    x: Q(300, 0, 1080, 1), y: Q(300, 0, 1080, 1), rot: Q(0, -6.3, 6.3, 0.01), len: Q(240, 20, 800, 1), wid: Q(90, 5, 400, 1),
    dark: Q(0.55, 0, 1, 0.01, 'blue over the yellow (darker green)'), red: Q(0, 0, 1, 0.01, 'pink over the green (olive)'), hatch: Q(1, 0, 1, 1, 'hatch lines'), veinInk: { def: 'blue', kind: 'ink' }, seed: Q(1, 0, 99, 1),
  },
  xf: { x: '$x', y: '$y', rot: '$rot' },
  graph: {
    nodes: {
      shape: { type: 'lens', params: { len: '$len/2', wid: '$wid', n: 24 } },
      placed: { type: 'transform', in: { geo: 'shape' }, params: { x: '$len/2' } },
      rough: { type: 'hand', in: { geo: 'placed' }, params: { step: 7, wobble: '$wid*0.03', wave: 80, jitter: 0.6, press: 0, taper: 0, overshoot: 0, seed: '$seed' } },
      fy: { type: 'fill', in: { geo: 'rough' }, params: { ink: 'yellow', mode: 'solid' } },
      fb: { type: 'fill', in: { geo: 'rough' }, params: { ink: 'blue', mode: 'add', tone: '$dark' } },
      fr: { type: 'fill', in: { geo: 'rough' }, params: { ink: 'pink', mode: 'add', tone: '$red' }, when: '$red > 0' },
      lines: { type: 'copy', params: { n: 'round($len/14)' }, template: { nodes: {
        l: { type: 'line', params: { x0: '@i*14 + 6', y0: '-$wid', x1: '@i*14 + 6 + $wid*0.5', y1: '$wid', n: 6 } } }, output: 'l' } },
      linesH: { type: 'hand', in: { geo: 'lines' }, params: { step: 5, wobble: 0.8, wave: 40, jitter: 0.4, press: 0.4, taper: 0, overshoot: 0, seed: '$seed' } },
      linesS: { type: 'stroke', in: { geo: 'linesH' }, params: { ink: '$veinInk', mode: 'add', w: 1.6, tone: 0.8 }, when: '$hatch' },
      hatched: { type: 'crop', in: { marks: 'linesS', geo: 'rough' } },
      rib: { type: 'line', params: { x0: '$len*0.05', y0: 0, x1: '$len*0.92', y1: 0, n: 12 } },
      ribW: { type: 'wrangle', in: { geo: 'rib' }, params: { y: '@y + sin(@v*PI)*$wid*0.08', w: '3*(1-@v*0.6)' } },
      ribH: { type: 'hand', in: { geo: 'ribW' }, params: { step: 6, wobble: 1, wave: 60, jitter: 0.4, press: 0.3, taper: 0.3, overshoot: 0, seed: '$seed' } },
      ribS: { type: 'stroke', in: { geo: 'ribH' }, params: { ink: '$veinInk', mode: 'add' } },
      out: { type: 'merge', in: { list: ['fy', 'fb', 'fr', 'hatched', 'ribS'] } },
    },
    output: 'out',
  },
};

export const leaf = LIB.leaf;
