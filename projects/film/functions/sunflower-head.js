// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- sunflowerHead: a close-up flower head. Two rows of yellow petals with red veins round a dark seed disc
// carrying a Fermat spiral of dots, red inside and yellow at the rim, and a yellow highlight on the rim ----
LIB.sunflowerHead = {
  label: 'Sunflower head',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(540, 0, 1080, 1), r: Q(300, 20, 600, 1, 'disc radius'), rot: Q(0, -6.3, 6.3, 0.01),
    petals: Q(20, 3, 80, 1), len: Q(390, 20, 800, 1, 'petal length'), wid: Q(150, 5, 400, 1, 'petal width'),
    seeds: Q(1300, 0, 4000, 1), sway: Q(0.01, 0, 0.1, 0.001, 'petal sway (rad)'),
  },
  xf: { x: '$x', y: '$y', rot: '$rot' },
  graph: {
    nodes: {
      // a petal is a lens laid along +x with its vein; kind 0 = blade, 1 = vein
      back: { type: 'copy', params: { n: '$petals', rot: '(@i+0.5)/@n*TAU + (rand(1)-0.5)*0.14 + $sway*sin(t*1.3 + @i)', scale: '0.8+0.2*rand(2)' }, template: { nodes: {
        b: { type: 'lens', params: { len: '$len*0.5', wid: '$wid', n: 18 } },
        bp: { type: 'transform', in: { geo: 'b' }, params: { x: '$r*0.8 + $len*0.5' } },
        ba: { type: 'attr', in: { geo: 'bp' }, attrs: { kind: 0 } },
        v: { type: 'line', params: { x0: '$r*0.85', y0: 0, x1: '$r*0.8 + $len*0.8', y1: 0, n: 8 } },
        va: { type: 'attr', in: { geo: 'v' }, attrs: { kind: 1 } },
        m: { type: 'merge', in: { list: ['ba', 'va'] } } }, output: 'm' } },
      backH: { type: 'hand', in: { geo: 'back' }, params: { step: 7, wobble: 2, wave: 90, jitter: 0.6, press: 0.3, taper: 0, overshoot: 0 } },
      backBlade: { type: 'filter', in: { geo: 'backH' }, params: { expr: '@kind == 0' } },
      backVein: { type: 'filter', in: { geo: 'backH' }, params: { expr: '@kind == 1' } },
      backY: { type: 'fill', in: { geo: 'backBlade' }, params: { ink: 'yellow', mode: 'solid' } },
      backB: { type: 'fill', in: { geo: 'backBlade' }, params: { ink: 'blue', mode: 'add', tone: 0.3 } },
      backS: { type: 'stroke', in: { geo: 'backBlade' }, params: { ink: 'blue', mode: 'add', w: 1.4 } },
      backV: { type: 'stroke', in: { geo: 'backVein' }, params: { ink: 'pink', mode: 'solid', w: 2.2 } },
      front: { type: 'copy', params: { n: '$petals', rot: '@i/@n*TAU + (rand(1)-0.5)*0.14 + $sway*sin(t*1.1 + @i*1.7)', scale: '0.9+0.2*rand(2)' }, template: { nodes: {
        b: { type: 'lens', params: { len: '$len*0.5', wid: '$wid', n: 18 } },
        bp: { type: 'transform', in: { geo: 'b' }, params: { x: '$r*0.7 + $len*0.5' } },
        ba: { type: 'attr', in: { geo: 'bp' }, attrs: { kind: 0 } },
        v: { type: 'line', params: { x0: '$r*0.9', y0: 0, x1: '$r*0.7 + $len*0.85', y1: 0, n: 8 } },
        va: { type: 'attr', in: { geo: 'v' }, attrs: { kind: 1 } },
        m: { type: 'merge', in: { list: ['ba', 'va'] } } }, output: 'm' } },
      frontH: { type: 'hand', in: { geo: 'front' }, params: { step: 7, wobble: 2, wave: 90, jitter: 0.6, press: 0.3, taper: 0, overshoot: 0 } },
      blade: { type: 'filter', in: { geo: 'frontH' }, params: { expr: '@kind == 0' } },
      vein: { type: 'filter', in: { geo: 'frontH' }, params: { expr: '@kind == 1' } },
      bladeY: { type: 'fill', in: { geo: 'blade' }, params: { ink: 'yellow', mode: 'solid' } },
      bladeS: { type: 'stroke', in: { geo: 'blade' }, params: { ink: 'blue', mode: 'add', w: 1.4 } },
      veinS: { type: 'stroke', in: { geo: 'vein' }, params: { ink: 'pink', mode: 'solid', w: 2.6 } },
      // the disc: dark, with a spiral of seeds that turn from red inside to yellow at the rim
      disc: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 120 } },
      discH: { type: 'hand', in: { geo: 'disc' }, params: { step: 8, wobble: 3, wave: 140, jitter: 0.5, press: 0, taper: 0, overshoot: 0 } },
      discB: { type: 'fill', in: { geo: 'discH' }, params: { ink: 'blue', mode: 'add', tone: 0.9 } },
      discP: { type: 'fill', in: { geo: 'discH' }, params: { ink: 'pink', mode: 'add' } },
      discY: { type: 'fill', in: { geo: 'discH' }, params: { ink: 'yellow', mode: 'add', tone: 0.95 } },
      discS: { type: 'stroke', in: { geo: 'discH' }, params: { ink: 'blue', mode: 'add', w: 3 } },
      seeds: { type: 'copy', params: { n: '$seeds', x: 'cos(@i*2.39996)*$r*0.96*sqrt(@i/@n)', y: 'sin(@i*2.39996)*$r*0.96*sqrt(@i/@n)' }, template: { let: { k: '@i/@n' }, nodes: {
        p: { type: 'point', params: { x: 0, y: 0 } },
        a: { type: 'attr', in: { geo: 'p' }, attrs: { k: '$k' } } }, output: 'a' } },
      seedsP: { type: 'dots', in: { geo: 'seeds' }, params: { ink: 'pink', mode: 'solid', r: '(1.0 + 3.4*sqrt(@k))*(0.7+0.5*rand(1))' } },
      seedsY: { type: 'dots', in: { geo: 'seeds' }, params: { ink: 'yellow', mode: 'add', r: '(1.0 + 3.4*sqrt(@k))*(0.7+0.5*rand(1))*(0.55 + 0.45*pow(@k, 4))' } },
      rim: { type: 'ellipse', params: { x: 0, y: 0, rx: '$r*0.95', ry: '$r*0.95', a0: 195, a1: 300, n: 30 } },
      rimW: { type: 'wrangle', in: { geo: 'rim' }, params: { w: '$r*0.03*sin(@v*PI)' } },
      rimH: { type: 'hand', in: { geo: 'rimW' }, params: { step: 6, wobble: 1.5, wave: 80, jitter: 0.4, press: 0.3, taper: 0.4, overshoot: 0 } },
      rimY: { type: 'stroke', in: { geo: 'rimH' }, params: { ink: 'yellow', mode: 'solid' } },
      out: { type: 'merge', in: { list: ['backY', 'backB', 'backS', 'backV', 'bladeY', 'bladeS', 'veinS', 'discB', 'discP', 'discY', 'discS', 'seedsP', 'seedsY', 'rimY'] } },
    },
    output: 'out',
  },
};

export const sunflowerHead = LIB.sunflowerHead;
